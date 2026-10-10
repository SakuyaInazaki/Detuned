"""Dedicated M7.5-A runner. Import is inert; root must separately release execution.
No host census, dependency script expansion, spawn injection or retry.
"""
from pathlib import Path, PurePosixPath
import hashlib, json, os, re, selectors, shutil, signal, stat, subprocess, sys
import tarfile, tempfile, time, urllib.request, urllib.parse

VERIFY = Path(__file__).resolve().parent
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
    raw = ROOT / 'output'
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
        if expected is not None and paths[0].read_text().strip() != expected:
            raise RuntimeError('VERSION_MISMATCH')
    except Exception as error:
        failure = error
        # Only known own exact group; never process census or unproven group kill.
        if proof and exists_group(child.pid):
            os.killpg(child.pid, signal.SIGTERM)
            end = min(time.monotonic() + 2, START + 1800)
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
        end = min(time.monotonic() + 2, START + 1800)
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

class FixedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlparse(newurl).hostname != 'nodejs.org' or not newurl.startswith('https://'):
            raise RuntimeError('DOWNLOAD_REDIRECT_DOMAIN')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def download_node():
    dest = ROOT / 'download' / 'node.tar.gz'
    end = time.monotonic() + min(120, left())
    # Explicit empty proxy handler: never inherit parent proxy/token configuration.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), FixedRedirect())
    amount = 0
    with opener.open(PLAN['node_url'], timeout=10) as response, dest.open('xb') as f:
        while True:
            if time.monotonic() >= end or left() <= 0:
                raise RuntimeError('DOWNLOAD_DEADLINE')
            chunk = response.read(65536)
            if not chunk:
                break
            amount += len(chunk)
            if amount > PLAN['node_archive_max_bytes']:
                raise RuntimeError('DOWNLOAD_SIZE_LIMIT')
            f.write(chunk)
    dest.chmod(0o600)
    if digest(dest) != PLAN['node_archive_sha256']:
        raise RuntimeError('NODE_ARCHIVE_HASH')
    links = []
    expanded = 0
    with tarfile.open(dest, 'r:gz') as archive:
        members = archive.getmembers()
        if len(members) > 20000:
            raise RuntimeError('ARCHIVE_ENTRY_LIMIT')
        for member in members:
            parts = PurePosixPath(member.name).parts
            if not parts or parts[0] != 'node-v22.19.0-darwin-arm64' or '..' in parts or member.name.startswith('/'):
                raise RuntimeError('ARCHIVE_PATH')
            out = ROOT / 'node' / member.name
            if member.issym():
                target = Path(os.path.normpath(out.parent / member.linkname))
                if Path(member.linkname).is_absolute() or not target.is_relative_to(ROOT / 'node'):
                    raise RuntimeError('ARCHIVE_SYMLINK')
                links.append((out, member.linkname))
            elif member.isdir():
                out.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                expanded += member.size
                if expanded > PLAN['node_unpacked_max_bytes'] or left() <= 0:
                    raise RuntimeError('ARCHIVE_EXPANSION_LIMIT')
                out.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as incoming, out.open('xb') as f:
                    shutil.copyfileobj(incoming, f, 65536)
                out.chmod(member.mode & 0o777)
            else:
                raise RuntimeError('ARCHIVE_SPECIAL_FILE')
        for out, target in links:
            out.parent.mkdir(parents=True, exist_ok=True)
            os.symlink(target, out)
    size_check()
    save('node-download.receipt.json', {'archive_sha256': digest(dest), 'bytes': amount,
         'expanded_bytes': expanded, 'verified_before_execution': True})
    return ROOT / 'node/node-v22.19.0-darwin-arm64/bin/node'

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
    verify_original()
    ROOT = Path(tempfile.mkdtemp(prefix='detuned-m75-clean-', dir='/private/tmp'))
    ROOT.chmod(0o700)
    WORK = ROOT / 'work'
    for name in ['work', 'home', 'tmp', 'config/pnpm', 'cache', 'store', 'state', 'data', 'pnpm-home', 'download', 'node', 'output']:
        (ROOT / name).mkdir(parents=True, exist_ok=True)
    save('fixture-ledger.json', {'root': str(ROOT), 'uid': os.getuid(), 'mode': '0700', 'scope': 'only this newly allocated root; no other temp scan'})
    status = 'failed'
    failure = None
    originals_after = False
    try:
        for row in PLAN['copy_files']:
            target = WORK / row['path']
            target.parent.mkdir(parents=True, exist_ok=True)
            with (REPO / row['path']).open('rb') as incoming, target.open('xb') as out:
                shutil.copyfileobj(incoming, out)
            assert digest(target) == row['sha256']
        assert not (WORK / 'node_modules').exists()
        assert not any((WORK / 'packages').glob('*/dist'))
        node = download_node()
        for name in ['npm-user', 'npm-global']:
            (ROOT / name).write_text('')
        # pnpm11 getConfigDir uses XDG_CONFIG_HOME/pnpm/config.yaml.
        yaml = '\n'.join(['enableGlobalVirtualStore: false', 'sideEffectsCache: false',
                          'verifyDepsBeforeRun: warn', 'pmOnFail: error',
                          'storeDir: ' + str(ROOT / 'store'), 'cacheDir: ' + str(ROOT / 'cache'),
                          'stateDir: ' + str(ROOT / 'state'), 'virtualStoreDir: ' + str(WORK / 'node_modules/.pnpm')]) + '\n'
        (ROOT / 'config/pnpm/config.yaml').write_text(yaml)
        ENV = {'PATH': str(node.parent) + ':/usr/bin:/bin', 'HOME': str(ROOT / 'home'),
               'TMPDIR': str(ROOT / 'tmp'), 'XDG_CONFIG_HOME': str(ROOT / 'config'),
               'XDG_CACHE_HOME': str(ROOT / 'cache'), 'XDG_DATA_HOME': str(ROOT / 'data'),
               'XDG_STATE_HOME': str(ROOT / 'state'), 'PNPM_HOME': str(ROOT / 'pnpm-home'),
               'NPM_CONFIG_USERCONFIG': str(ROOT / 'npm-user'), 'NPM_CONFIG_GLOBALCONFIG': str(ROOT / 'npm-global'),
               'NPM_CONFIG_CACHE': str(ROOT / 'cache'), 'CI': 'true', 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD': '1',
               'NODE_COMPILE_CACHE': str(ROOT / 'cache/node-compile')}
        policy = '(version 1)\n(allow default)\n(deny file-write*)\n(allow file-write* (subpath "' + str(ROOT) + '"))\n(deny file-read* (subpath "/Users/sakimi"))\n'
        (ROOT / 'policy.sb').write_text(policy)
        prefix = ['/usr/bin/sandbox-exec', '-f', str(ROOT / 'policy.sb')]
        pnpm = prefix + [str(node), PLAN['pnpm_entry']]
        opts = ['--config.enable-global-virtual-store=false', '--config.side-effects-cache=false',
                '--config.pm-on-fail=error', '--config.verify-deps-before-run=warn',
                '--store-dir=' + str(ROOT / 'store'), '--config.cache-dir=' + str(ROOT / 'cache'),
                '--config.state-dir=' + str(ROOT / 'state'), '--virtual-store-dir=' + str(WORK / 'node_modules/.pnpm'),
                '--config.workspace-concurrency=1', '--network-concurrency=1', '--child-concurrency=1']
        phase('node-version', prefix + [str(node), '--version'], 10, 'v22.19.0')
        phase('pnpm-version', pnpm + opts + ['--version'], 10, '11.7.0')
        phase('install', pnpm + opts + ['install', '--frozen-lockfile', '--ignore-scripts', '--ignore-pnpmfile', '--registry=https://registry.npmjs.org'], 600)
        for p in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']:
            assert digest(WORK / p) == digest(REPO / p)
        phase('esbuild', pnpm + opts + ['rebuild', 'esbuild', '--ignore-pnpmfile'], 60)
        smoke = "import Database from 'better-sqlite3';const db=new Database(':memory:');if(db.prepare('SELECT 1 AS n').get().n!==1)throw Error('SQLite smoke failed');db.close();"
        phase('sqlite-smoke', prefix + [str(node), '--input-type=module', '-e', smoke], 10)
        for package in PLAN['packages']:
            phase('build-' + package, pnpm + opts + ['--filter', '@detuned/' + package, 'run', 'build'], 60)
        test_json = ROOT / 'output/test-results.json'
        phase('backend-tests', pnpm + opts + ['exec', 'vitest', 'run'] + PLAN['tests'] +
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
             'network_enforcement': 'fixedNodeURL redirect guard; pnpm configured registry/integrity only, no harddomain firewall or requestcensus'})
    if status != 'passed':
        raise SystemExit(1)

if __name__ == '__main__':
    main()
