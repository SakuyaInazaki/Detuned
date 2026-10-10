"""Dedicated M7.5-A runner. Import is inert; root must separately release execution.
No host census, dependency script expansion, spawn injection or retry.
"""
from pathlib import Path, PurePosixPath
import hashlib, json, os, re, selectors, shutil, signal, stat, subprocess, sys
import tarfile, time, urllib.parse

VERIFY = Path(__file__).resolve().parent / 'continuation-3'
PLAN = json.loads((VERIFY / 'execution-plan.json').read_text())
REPO = Path(PLAN['repo'])
START = 0.0
ROOT = None
WORK = None
ENV = None
STAGES = []
SIZES = []

def digest(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def save(name, obj):
    fd = os.open(VERIFY / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(obj, f, indent=2)
        f.write('\n')

def left(cleanup=False):
    return max(0, START + PLAN['budget_seconds']['total'] -
               (0 if cleanup else PLAN['budget_seconds']['cleanup']) - time.monotonic())

def size_check():
    initial = ROOT.lstat()
    logical, allocated = initial.st_size, initial.st_blocks * 512
    seen = {(initial.st_dev, initial.st_ino)}
    for base, dirs, files in os.walk(ROOT, followlinks=False):
        for name in dirs + files:
            s = os.lstat(Path(base) / name)
            logical += s.st_size
            key = (s.st_dev, s.st_ino)
            if key not in seen:
                seen.add(key)
                allocated += s.st_blocks * 512
    row = {'logical_bytes': logical, 'allocated_bytes': allocated}
    SIZES.append(row)
    # Pathname logical totals do not deduplicate hardlinks; actual allocated does.
    if logical > PLAN['fixture_limits']['logical_bytes'] or allocated > PLAN['fixture_limits']['allocated_bytes']:
        raise RuntimeError('FIXTURE_SIZE_LIMIT')
    return row

def exists_group(pgid):
    assert isinstance(pgid, int) and pgid > 1
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False

def own_proof(pid):
    r = subprocess.run(['/bin/ps', '-p', str(pid), '-o', 'uid=,ppid=,pgid=,rss='],
                       env={'PATH': '/usr/bin:/bin'}, capture_output=True, text=True, timeout=1)
    fields = r.stdout.split()
    if r.returncode or len(fields) != 4 or not all(x.isdigit() for x in fields):
        raise RuntimeError('OWN_STAGE_PROOF_UNAVAILABLE')
    uid, ppid, pgid, rss = map(int, fields)
    if uid != os.getuid() or ppid != os.getpid() or pgid != pid:
        raise RuntimeError('OWN_STAGE_PROOF_MISMATCH')
    return {'uid': uid, 'ppid': ppid, 'pgid': pgid, 'leader_rss_kib': rss}

def phase(name, argv, seconds, expected=None):
    limit = min(seconds, left())
    if limit <= 0:
        raise RuntimeError('TOTAL_DEADLINE')
    raw = ROOT / 'continuation-3-output'
    paths = [raw / (name + suffix) for suffix in ['.stdout', '.stderr']]
    files = [open(p, 'xb') for p in paths]
    for p in paths:
        p.chmod(0o600)
    begun = time.monotonic()
    row = {'stage': name, 'argv': argv, 'budget_seconds': limit, 'close_code': None,
           'close_signal': None, 'actual_close': False, 'group_absent': False,
           'stdout_bytes': 0, 'stderr_bytes': 0, 'leader_peak_rss_kib': 0}
    STAGES.append(row)
    child = subprocess.Popen(argv, cwd=WORK, env=ENV, start_new_session=True,
                             stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    row['pid'] = child.pid
    selector = selectors.DefaultSelector()
    for index, stream in enumerate([child.stdout, child.stderr]):
        os.set_blocking(stream.fileno(), False)
        selector.register(stream, selectors.EVENT_READ, index)
    failure = None
    proof = None
    network_tail = ''
    try:
        # A very short version process may close before ps; exact close and absent
        # own Popen session still recorded, but no group signal without proof.
        try:
            proof = own_proof(child.pid)
            row.update(proof)
            row['leader_peak_rss_kib'] = proof['leader_rss_kib']
        except RuntimeError:
            if child.poll() is None:
                raise
            row['proof_state'] = 'already_closed_before_query'
        next_measure = begun
        while selector.get_map() or child.poll() is None:
            now = time.monotonic()
            if now - begun >= limit or left() <= 0:
                raise RuntimeError('STAGE_DEADLINE')
            if now >= next_measure:
                size_check()
                if proof and child.poll() is None:
                    r = subprocess.run(['/bin/ps', '-p', str(child.pid), '-o', 'rss='],
                                       env={'PATH': '/usr/bin:/bin'}, capture_output=True, text=True, timeout=1)
                    if r.returncode == 0 and r.stdout.strip().isdigit():
                        row['leader_peak_rss_kib'] = max(row['leader_peak_rss_kib'], int(r.stdout))
                next_measure = now + 2
            for key, _ in selector.select(0.2):
                data = os.read(key.fileobj.fileno(), 65536)
                if not data:
                    selector.unregister(key.fileobj)
                    continue
                index = key.data
                field = 'stdout_bytes' if index == 0 else 'stderr_bytes'
                row[field] += len(data)
                if row[field] > PLAN['output_limit_per_stream_bytes']:
                    raise RuntimeError('OUTPUT_LIMIT')
                files[index].write(data)
                # Configuration boundary, not a network firewall or domain census.
                # Stop only when a fetch/download/request diagnostic names an
                # outside domain, not when pnpm prints a documentation link.
                network_tail = (network_tail + data.decode('utf8', errors='replace'))[-16384:]
                for line in network_tail.splitlines():
                    if re.search(r'\b(GET|POST|fetch|fetching|download|downloading)\b', line, re.I):
                        for url in re.findall(r'https?://[^\s\)]+', line):
                            if urllib.parse.urlparse(url).hostname not in PLAN['network_domains']:
                                raise RuntimeError('UNPLANNED_NETWORK_DOMAIN_DIAGNOSTIC')
        code = child.wait(timeout=max(0.1, left(True)))
        row['actual_close'] = True
        row['close_code'] = code if code >= 0 else None
        row['close_signal'] = signal.Signals(-code).name if code < 0 else None
        if code:
            raise RuntimeError('STAGE_NONZERO')
        # The reader below must see all parent-buffered captured output after
        # actual child close; closing the writers in finally is too late.
        for f in files:
            f.flush()
        if expected is not None and paths[0].read_text().strip() != expected:
            raise RuntimeError('VERSION_MISMATCH')
    except Exception as error:
        failure = error
        # Only known own exact group; never process census or unproven group kill.
        if proof and exists_group(child.pid):
            os.killpg(child.pid, signal.SIGTERM)
            end = min(time.monotonic() + 2, START + PLAN['budget_seconds']['total'])
            while child.poll() is None and time.monotonic() < end:
                time.sleep(0.05)
            if exists_group(child.pid) and left(True) > 0:
                os.killpg(child.pid, signal.SIGKILL)
        elif child.poll() is None:
            child.terminate()  # Exact Popen-owned child, not arbitrary pid.
        try:
            code = child.wait(timeout=min(3, max(0.1, left(True))))
            row.update(actual_close=True, close_code=code if code >= 0 else None,
                       close_signal=signal.Signals(-code).name if code < 0 else None)
        except subprocess.TimeoutExpired:
            row['actual_close'] = False
    finally:
        for f in files:
            f.close()
        selector.close()
        for stream in [child.stdout, child.stderr]:
            stream.close()
        end = min(time.monotonic() + 2, START + PLAN['budget_seconds']['total'])
        while exists_group(child.pid) and time.monotonic() < end:
            time.sleep(0.05)
        row['group_absent'] = not exists_group(child.pid)
        row['elapsed_seconds'] = time.monotonic() - begun
        row['output_hashes'] = [digest(p) for p in paths]
        row['failure_enum'] = str(failure) if isinstance(failure, RuntimeError) else type(failure).__name__ if failure else None
        save(name + '.receipt.json', row)
    if failure:
        raise failure
    if not row['actual_close'] or not row['group_absent']:
        raise RuntimeError('STAGE_SETTLEMENT_UNKNOWN')

def verify_original():
    for row in PLAN['copy_files']:
        p = REPO / row['path']
        s = p.lstat()
        if not stat.S_ISREG(s.st_mode) or s.st_size != row['bytes'] or digest(p) != row['sha256']:
            raise RuntimeError('ORIGINAL_COPY_BINDING_DRIFT')
    for key in ['pnpm_entry', 'pnpm_bundle']:
        if digest(PLAN[key]) != PLAN[key + '_sha256']:
            raise RuntimeError('PNPM_TOOL_BINDING_DRIFT')
    baseline = json.loads((REPO / PLAN['source_baseline_reference']).read_text())
    expected = dict(baseline['product_source_config_test_hashes'])
    expected['scripts/integrations/codex-check-probe.mjs'] = PLAN['source_owner_sha256']
    expected['tests/contracts/m7-codex-launcher.test.ts'] = PLAN['new_test_sha256']
    if any(digest(REPO / p) != value for p, value in expected.items()):
        raise RuntimeError('ORIGINAL_SOURCE_DRIFT')
    if any(digest(REPO / p) != value for p, value in baseline['dist_hashes'].items()):
        raise RuntimeError('ORIGINAL_DIST_DRIFT')

def cleanup_successful_fixture():
    # Bounded separate own process, no raw output under the root being removed.
    budget = min(90, left(True))
    if budget <= 0:
        raise RuntimeError('CLEANUP_DEADLINE')
    script = "import os,stat,shutil,sys;p=sys.argv[1];s=os.lstat(p);assert stat.S_ISDIR(s.st_mode) and s.st_uid==os.getuid();shutil.rmtree(p)"
    child = subprocess.Popen([sys.executable, '-c', script, str(ROOT)],
                             env={'PATH': '/usr/bin:/bin'}, start_new_session=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    proof = None
    row = {'stage': 'fixture-cleanup', 'pid': child.pid, 'budget_seconds': budget}
    try:
        try:
            proof = own_proof(child.pid)
            row.update(proof)
        except RuntimeError:
            if child.poll() is None:
                raise
        code = child.wait(timeout=budget)
        row.update(actual_close=True, close_code=code if code >= 0 else None,
                   close_signal=signal.Signals(-code).name if code < 0 else None,
                   group_absent=not exists_group(child.pid))
        if code or not row['group_absent'] or ROOT.exists():
            raise RuntimeError('CLEANUP_UNVERIFIED')
        return True
    except Exception:
        if proof and exists_group(child.pid):
            os.killpg(child.pid, signal.SIGKILL)
        elif child.poll() is None:
            child.kill()
        try:
            code = child.wait(timeout=min(2, max(0.1, left(True))))
            row.update(actual_close=True, close_code=code if code >= 0 else None,
                       close_signal=signal.Signals(-code).name if code < 0 else None)
        except subprocess.TimeoutExpired:
            row['actual_close'] = False
        row['group_absent'] = not exists_group(child.pid)
        raise
    finally:
        STAGES.append(row)
        save('fixture-cleanup.receipt.json', row)

def main():
    global START, ROOT, WORK, ENV
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--execute-root-release', required=True)
    args = parser.parse_args()
    if args.execute_root_release != digest(VERIFY / 'execution-plan.json'):
        raise RuntimeError('PLAN_RELEASE_BINDING')
    START = time.monotonic()
    os.umask(0o077)
    ROOT = Path(PLAN['continuation']['root'])
    WORK = ROOT / 'work'
    status = 'failed'
    failure = None
    originals_after = False
    try:
        verify_original()
        prior = VERIFY.parent / PLAN['continuation']['prior_directory']
        if digest(prior / 'execution-plan.json') != PLAN['continuation']['prior_plan_sha256']:
            raise RuntimeError('PRIOR_PLAN_DRIFT')
        for name, value in PLAN['continuation']['prior_receipt_sha256'].items():
            if digest(prior / name) != value:
                raise RuntimeError('PRIOR_RECEIPT_DRIFT')
        ledger = json.loads((prior / 'fixture-ledger.json').read_text())
        rs = ROOT.lstat()
        if (str(ROOT) != ledger['root'] or ROOT.resolve() != ROOT or
            not stat.S_ISDIR(rs.st_mode) or rs.st_uid != os.getuid() or
            stat.S_IMODE(rs.st_mode) != 0o700 or ledger['uid'] != os.getuid()):
            raise RuntimeError('FIXTURE_ROOT_BINDING')
        first = json.loads((prior / 'final.receipt.json').read_text())
        if first['status'] != 'failed' or first['failure_enum'] != 'STAGE_NONZERO' or not first['original_sources_locks_dist_verified_unchanged']:
            raise RuntimeError('PRIOR_RESULT_BINDING')
        if [r['stage'] for r in first['stages']] != ['node-version','pnpm-version','install','esbuild']:
            raise RuntimeError('PRIOR_STAGE_BOUNDARY')
        for row in first['stages']:
            if not row['actual_close'] or not row['group_absent'] or exists_group(row['pid']):
                raise RuntimeError('PRIOR_GROUP_NOT_ABSENT')
            try:
                os.kill(row['pid'], 0)
            except ProcessLookupError:
                pass
            else:
                raise RuntimeError('PRIOR_PID_NOT_ABSENT')
        previous = VERIFY.parent / 'continuation'
        for name, value in PLAN['continuation']['prior_continuation_receipt_sha256'].items():
            if digest(previous / name) != value:
                raise RuntimeError('PRIOR_CONTINUATION_RECEIPT_DRIFT')
        previous_result = json.loads((previous / 'final.receipt.json').read_text())
        if previous_result['status'] != 'failed' or previous_result['failure_enum'] != 'STAGE_NONZERO' or not previous_result['original_sources_locks_dist_verified_unchanged'] or [r['stage'] for r in previous_result['stages']] != ['esbuild']:
            raise RuntimeError('PRIOR_CONTINUATION_BOUNDARY')
        for row in previous_result['stages']:
            if not row['actual_close'] or not row['group_absent'] or exists_group(row['pid']):
                raise RuntimeError('PRIOR_CONTINUATION_GROUP_PRESENT')
            try:
                os.kill(row['pid'], 0)
            except ProcessLookupError:
                pass
            else:
                raise RuntimeError('PRIOR_CONTINUATION_PID_PRESENT')
            for i, suffix in enumerate(['.stdout','.stderr']):
                if digest(ROOT / 'continuation-output' / (row['stage'] + suffix)) != row['output_hashes'][i]:
                    raise RuntimeError('PRIOR_CONTINUATION_OUTPUT_DRIFT')
        prior_probe = VERIFY.parent / 'continuation-2'
        for name, value in PLAN['continuation']['prior_config_probe_receipt_sha256'].items():
            if digest(prior_probe / name) != value:
                raise RuntimeError('PRIOR_CONFIG_PROBE_RECEIPT_DRIFT')
        probe_final = json.loads((prior_probe / 'final.receipt.json').read_text())
        if probe_final['status'] != 'failed' or probe_final['failure_enum'] != 'STAGE_NONZERO' or not probe_final['original_sources_locks_dist_verified_unchanged'] or [r['stage'] for r in probe_final['stages']] != ['effective-config']:
            raise RuntimeError('PRIOR_CONFIG_PROBE_BOUNDARY')
        for row in probe_final['stages']:
            if row['pid'] != 95812 or not row['actual_close'] or not row['group_absent'] or exists_group(row['pid']):
                raise RuntimeError('PRIOR_CONFIG_PROBE_GROUP_PRESENT')
            try:
                os.kill(row['pid'], 0)
            except ProcessLookupError:
                pass
            else:
                raise RuntimeError('PRIOR_CONFIG_PROBE_PID_PRESENT')
            for i, suffix in enumerate(['.stdout','.stderr']):
                if digest(ROOT / 'continuation-2-output' / (row['stage'] + suffix)) != row['output_hashes'][i]:
                    raise RuntimeError('PRIOR_CONFIG_PROBE_OUTPUT_DRIFT')
        for name, expected in [('node-version','v22.19.0\n'),('pnpm-version','11.7.0\n')]:
            row = json.loads((prior / (name + '.receipt.json')).read_text())
            if row['close_code'] != 0 or row['close_signal'] is not None or (ROOT / 'output' / (name + '.stdout')).read_text() != expected:
                raise RuntimeError('PRIOR_VERSION_BINDING')
            for i, suffix in enumerate(['.stdout','.stderr']):
                if digest(ROOT / 'output' / (name + suffix)) != row['output_hashes'][i]:
                    raise RuntimeError('PRIOR_VERSION_OUTPUT_DRIFT')
        if json.loads((prior / 'install.receipt.json').read_text())['close_code'] != 0:
            raise RuntimeError('PRIOR_INSTALL_NOT_PASSED')
        for row in PLAN['copy_files']:
            target = WORK / row['path']
            ts = target.lstat()
            if not stat.S_ISREG(ts.st_mode) or ts.st_size != row['bytes'] or digest(target) != row['sha256']:
                raise RuntimeError('FIXTURE_COPY_DRIFT')
        node = ROOT / 'node/node-v22.19.0-darwin-arm64/bin/node'
        if digest(ROOT / 'download/node.tar.gz') != PLAN['node_archive_sha256'] or digest(node) != PLAN['continuation']['node_binary_sha256']:
            raise RuntimeError('NODE_BINDING_DRIFT')
        with tarfile.open(ROOT / 'download/node.tar.gz','r:gz') as archive:
            with archive.extractfile('node-v22.19.0-darwin-arm64/bin/node') as f:
                if hashlib.sha256(f.read()).hexdigest() != digest(node):
                    raise RuntimeError('NODE_BINARY_ARCHIVE_MISMATCH')
        yaml = '\n'.join(['enableGlobalVirtualStore: false', 'sideEffectsCache: false',
                          'verifyDepsBeforeRun: warn', 'pmOnFail: error',
                          'storeDir: ' + str(ROOT / 'store'), 'cacheDir: ' + str(ROOT / 'cache'),
                          'stateDir: ' + str(ROOT / 'state'), 'virtualStoreDir: ' + str(WORK / 'node_modules/.pnpm')]) + '\n'
        policy = '(version 1)\n(allow default)\n(deny file-write*)\n(allow file-write* (subpath "' + str(ROOT) + '"))\n(deny file-read* (subpath "/Users/sakimi"))\n'
        typed_yaml = yaml.replace('pmOnFail: error\n', '') + 'networkConcurrency: 1\nchildConcurrency: 1\n'
        if digest(ROOT / 'config/pnpm/config.yaml') != PLAN['continuation']['current_typed_yaml_sha256'] or (ROOT / 'config/pnpm/config.yaml').read_text() != typed_yaml or (ROOT / 'policy.sb').read_text() != policy or any((ROOT / name).read_text() != '' for name in ['npm-user','npm-global']):
            raise RuntimeError('PRIVATE_CONFIG_POLICY_DRIFT')
        for base in [WORK, ROOT / 'home', ROOT / 'config/pnpm']:
            for name in ['.pnpmfile.cjs','.pnpmfile.js','.pnpmfile.mjs']:
                if os.path.lexists(base / name):
                    raise RuntimeError('UNEXPECTED_PNPM_HOOK')
        if any(term in (WORK / 'pnpm-workspace.yaml').read_text() for term in ['pnpmfile:', 'globalPnpmfile:', 'global-pnpmfile:', 'configDependencies:', 'config-dependencies:']):
            raise RuntimeError('UNEXPECTED_PNPM_CONFIG_HOOK')
        manifest = json.loads((WORK / 'package.json').read_text())
        for settings in [manifest, manifest.get('pnpm', {})]:
            if any(key in settings for key in ['pnpmfile', 'globalPnpmfile', 'global-pnpmfile', 'configDependencies', 'config-dependencies']):
                raise RuntimeError('UNEXPECTED_MANIFEST_CONFIG_HOOK')
        ENV = {'PATH': str(node.parent) + ':/usr/bin:/bin', 'HOME': str(ROOT / 'home'),
               'TMPDIR': str(ROOT / 'tmp'), 'XDG_CONFIG_HOME': str(ROOT / 'config'),
               'XDG_CACHE_HOME': str(ROOT / 'cache'), 'XDG_DATA_HOME': str(ROOT / 'data'),
               'XDG_STATE_HOME': str(ROOT / 'state'), 'PNPM_HOME': str(ROOT / 'pnpm-home'),
               'NPM_CONFIG_USERCONFIG': str(ROOT / 'npm-user'), 'NPM_CONFIG_GLOBALCONFIG': str(ROOT / 'npm-global'),
               'NPM_CONFIG_CACHE': str(ROOT / 'cache'), 'CI': 'true', 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD': '1',
               'NODE_COMPILE_CACHE': str(ROOT / 'cache/node-compile')}
        (ROOT / 'continuation-3-output').mkdir(mode=0o700)
        save('fixture-ledger.json', {'root': str(ROOT), 'uid': os.getuid(), 'mode': '0700',
             'scope': 'exact root reused from verified empty-fixture install; no other temp scan'})
        size_check()
        save('continuation-preflight.receipt.json', {'passed': True, 'copy_files_verified': len(PLAN['copy_files']),
             'prior_stage_count': 4, 'prior_actual_close_and_positive_pid_group_absence': True,
             'fixed_node_archive_binary_and_pnpm_hashes_verified': True, 'prior_version_outputs_verified': True,
             'private_policy_unchanged': True, 'current_typed_private_config_verified_unchanged': True,
             'private_config_sha256': digest(ROOT / 'config/pnpm/config.yaml'),
             'ignore_pnpmfile_effective_flag_claim': False, 'exact_copy_no_hook_boundary': True,
             'original_437_source_555_dist_verified_unchanged': True,
             'new_download_install_or_version_run': False})
        prefix = ['/usr/bin/sandbox-exec', '-f', str(ROOT / 'policy.sb')]
        pnpm = prefix + [str(node), PLAN['pnpm_entry']]
        opts = ['--pm-on-fail=error',
                '--config.store-dir=' + str(ROOT / 'store'), '--config.cache-dir=' + str(ROOT / 'cache'),
                '--config.state-dir=' + str(ROOT / 'state'), '--config.virtual-store-dir=' + str(WORK / 'node_modules/.pnpm')]
        keys = PLAN['continuation']['effective_config_gate']['keys']
        probe = r"""const {spawnSync}=require('node:child_process');
const [entry,optionsJSON,keysJSON]=process.argv.slice(1);const options=JSON.parse(optionsJSON),keys=JSON.parse(keysJSON);
const end=Date.now()+9000,rows=[];
for(const key of keys){const remaining=end-Date.now();if(remaining<=0)throw Error('CONFIG_PROBE_DEADLINE');
const r=spawnSync(process.execPath,[entry,...options,'config','--location=project','get','--json',key],{env:process.env,cwd:process.cwd(),encoding:'utf8',timeout:remaining,maxBuffer:65536,detached:false});
if(r.error||r.status!==0||r.signal!==null)throw Error('CONFIG_PROBE_CHILD_FAILURE');
let value,type;if((key==='pnpmfile'||key==='global-pnpmfile')&&r.stdout.trim()===''){value=null;type='undefined'}
else{try{value=JSON.parse(r.stdout)}catch{throw Error('CONFIG_PROBE_JSON_FAILURE')}type=typeof value}
rows.push({key,type,value,pid:r.pid,closeCode:r.status,closeSignal:r.signal,actualClose:true});}
process.stdout.write(JSON.stringify({rows})+'\n');"""
        probe_bytes = probe.encode()
        if hashlib.sha256(probe_bytes).hexdigest() != PLAN['continuation']['generated_probe_sha256']:
            raise RuntimeError('GENERATED_PROBE_BINDING')
        generated_file = ROOT / 'continuation-3-output/effective-config-generated.cjs'
        with generated_file.open('xb') as f:
            f.write(probe_bytes)
        generated_file.chmod(0o600)
        phase('generated-js-syntax', prefix + [str(node), '--check', str(generated_file)],
              PLAN['continuation']['generated_probe_check_budget_seconds'])
        if digest(generated_file) != PLAN['continuation']['generated_probe_sha256'] or hashlib.sha256(probe.encode()).hexdigest() != digest(generated_file):
            raise RuntimeError('GENERATED_PROBE_POSTCHECK_DRIFT')
        save('generated-js-binding.receipt.json', {'passed': True, 'sha256': digest(generated_file),
             'bytes': len(probe_bytes), 'node_archive_sha256': PLAN['node_archive_sha256'],
             'same_bytes_checked_and_executed': True, 'execution_mode': 'same checked bytes passed to fixed Node -e'})
        phase('effective-config', prefix + [str(node), '-e', probe, PLAN['pnpm_entry'], json.dumps(opts), json.dumps(keys)], 10)
        config_result = json.loads((ROOT / 'continuation-2-output/effective-config.stdout').read_text())
        expected = {'enable-global-virtual-store': False, 'side-effects-cache': False,
                    'network-concurrency': 1, 'child-concurrency': 1, 'pm-on-fail': 'error',
                    'store-dir': str(ROOT / 'store'), 'cache-dir': str(ROOT / 'cache'),
                    'state-dir': str(ROOT / 'state'), 'virtual-store-dir': str(WORK / 'node_modules/.pnpm'),
                    'globalconfig': str(ROOT / 'config/pnpm/config.yaml'), 'pnpmfile': None, 'global-pnpmfile': None}
        rows = config_result['rows']
        if [r['key'] for r in rows] != keys:
            raise RuntimeError('CONFIG_PROBE_KEY_BOUNDARY')
        for row in rows:
            value = expected[row['key']]
            expected_type = 'undefined' if value is None else 'boolean' if type(value) is bool else 'number' if type(value) is int else 'string'
            if row['type'] != expected_type or type(row['value']) is not type(value) or row['value'] != value or row['closeCode'] != 0 or row['closeSignal'] is not None or row['actualClose'] is not True:
                raise RuntimeError('CONFIG_PROBE_EFFECTIVE_MISMATCH')
        save('effective-config-safe-summary.json', {'rows': rows, 'fixed_pnpm_sha256': PLAN['pnpm_bundle_sha256'],
             'yaml_sha256': digest(ROOT / 'config/pnpm/config.yaml'), 'same_pnpm_getConfig_loader': True,
             'not_a_hard_network_firewall': True, 'pnpm_config_dot_numbers_or_booleans_used': False})
        phase('esbuild', pnpm + opts + ['rebuild', 'esbuild'], 60)
        smoke = "import Database from 'better-sqlite3';const db=new Database(':memory:');if(db.prepare('SELECT 1 AS n').get().n!==1)throw Error('SQLite smoke failed');db.close();"
        phase('sqlite-smoke', prefix + [str(node), '--input-type=module', '-e', smoke], 10)
        for package in PLAN['packages']:
            phase('build-' + package, pnpm + opts + ['--workspace-concurrency=1', '--filter', '@detuned/' + package, 'run', 'build'], 60)
        test_json = ROOT / 'continuation-2-output/test-results.json'
        phase('backend-tests', pnpm + opts + ['--workspace-concurrency=1', 'exec', 'vitest', 'run'] + PLAN['tests'] +
              ['--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + str(test_json)], 900)
        results = json.loads(test_json.read_text())
        assert results['success'] is True
        assert all(results[key] == 0 for key in ['numFailedTests', 'numFailedTestSuites',
                                               'numPendingTests', 'numPendingTestSuites', 'numTodoTests'])
        assert results['numPassedTests'] == results['numTotalTests'] > 0
        assert results['numPassedTestSuites'] == results['numTotalTestSuites'] > 0
        assert all(row['status'] == 'passed' and row['message'] == '' and
                   all(test['status'] == 'passed' and not test['failureMessages']
                       for test in row['assertionResults']) for row in results['testResults'])
        names = {str(Path(row['name']).relative_to(WORK)) for row in results['testResults']}
        assert names == set(PLAN['tests'])
        save('tests-safe-summary.json', {k: results.get(k) for k in ['success', 'numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests']})
        verify_original()
        originals_after = True
        assert all(r['actual_close'] and r['group_absent'] for r in STAGES)
        size_check()
        status = 'passed'
    except Exception as error:
        failure = str(error) if isinstance(error, RuntimeError) else type(error).__name__
    finally:
        # Root specifically permits successful suite awaited teardown + stagegroup
        # absence evidence. Failure/deadline/unknown keeps exact root/ledger.
        removed = False
        if status == 'passed':
            if left(True) <= 0:
                status = 'failed'
                failure = 'CLEANUP_DEADLINE'
            else:
                try:
                    removed = cleanup_successful_fixture()
                except Exception:
                    status = 'failed'
                    failure = 'CLEANUP_UNVERIFIED'
            if status == 'passed' and (not removed or ROOT.exists()):
                status = 'failed'
                failure = 'CLEANUP_UNVERIFIED'
        if not originals_after:
            try:
                verify_original()
                originals_after = True
            except Exception:
                originals_after = False
        save('final.receipt.json', {'status': status, 'failure_enum': failure, 'elapsed_seconds': time.monotonic() - START,
             'fixture_removed': removed, 'fixture_retained': not removed, 'root': str(ROOT),
             'stages': STAGES, 'size_peak': {k: max([r[k] for r in SIZES], default=0) for k in ['logical_bytes', 'allocated_bytes']},
             'internal_children_evidence': PLAN['internal_process_evidence'], 'outer_process_census': False,
             'original_sources_locks_dist_verified_unchanged': originals_after,
             'network_domain_scope': PLAN['network_domains'],
             'evidence_combination': PLAN['continuation']['combination'],
             'prior_install_receipt_sha256': PLAN['continuation']['prior_receipt_sha256']['install.receipt.json'],
             'network_enforcement': 'fixedNodeURL redirect guard; pnpm configured registry/integrity only, no harddomain firewall or requestcensus'})
    if status != 'passed':
        raise SystemExit(1)

if __name__ == '__main__':
    main()
