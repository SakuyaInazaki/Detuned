from pathlib import Path
import hashlib,json,os,re,selectors,signal,stat,subprocess,sys,time,urllib.parse,shlex
VERIFY=Path(__file__).resolve().parent/'closure-tests-v3'
PLAN=json.loads((VERIFY/'execution-plan.json').read_text());REPO=Path(PLAN['repo'])
START=0.;ROOT=None;WORK=None;ENV=None;STAGES=[];SIZES=[]
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
    raw = ROOT / 'closure-tests-v3-output'
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

def main():
 global START,ROOT,WORK,ENV
 assert len(sys.argv)==2 and sys.argv[1]==digest(VERIFY/'execution-plan.json')
 START=time.monotonic();os.umask(0o077);ROOT=Path(PLAN['continuation']['root']);WORK=ROOT/'work'
 status='failed';failure=None;after=False;results_summary=None
 try:
  verify_original();rs=ROOT.lstat()
  assert ROOT.resolve()==ROOT and stat.S_ISDIR(rs.st_mode) and rs.st_uid==os.getuid() and stat.S_IMODE(rs.st_mode)==0o700
  prior=VERIFY.parent/'continuation-3'
  for name,value in PLAN['normal_test_continuation']['reuse_receipts'].items():
   assert digest(prior/name)==value
   if name.endswith('.receipt.json'):
    row=json.loads((prior/name).read_text())
    if 'stage' in row:assert row['close_code']==0 and row['close_signal'] is None and row['actual_close'] and row['group_absent'] and not exists_group(row['pid'])
  lookup=VERIFY.parent/PLAN['normal_test_continuation']['READY_lookup_reference']
  assert digest(lookup)==PLAN['normal_test_continuation']['READY_lookup_sha256'] and json.loads(lookup.read_text())['complete_identity_negative_certified'] is True
  old=VERIFY.parent/'normal-tests/backend-tests.receipt.json'
  assert digest(old)==PLAN['closure_correction']['normal_prior_receipt_sha256']
  closed=json.loads(old.read_text());assert closed['actual_close'] and closed['group_absent'] and not exists_group(closed['pid'])
  helpers=WORK/'tests/helpers';parent=helpers.parent;ps=parent.lstat();assert stat.S_ISDIR(ps.st_mode) and ps.st_uid==os.getuid() and parent.resolve()==parent
  assert helpers.resolve()==helpers and stat.S_ISDIR(helpers.lstat().st_mode) and helpers.lstat().st_uid==os.getuid() and stat.S_IMODE(helpers.lstat().st_mode)==0o700
  copies=[]
  for row in PLAN['closure_correction']['helpers']:
   src=REPO/row['path'];ss=src.lstat();assert stat.S_ISREG(ss.st_mode) and ss.st_size==row['bytes'] and digest(src)==row['sha256']
   target=WORK/row['path'];assert target.resolve()==target and target.lstat().st_uid==os.getuid()
   assert stat.S_ISREG(target.lstat().st_mode) and digest(target)==row['sha256'];copies.append(row)
  save('copy-increment.json',{'before':371,'after':385,'helpers':copies,'only_fixture_changed':True})
  for row in PLAN['copy_files']:
   target=WORK/row['path'];s=target.lstat();assert stat.S_ISREG(s.st_mode) and s.st_size==row['bytes'] and digest(target)==row['sha256']
  node=ROOT/'node/node-v22.19.0-darwin-arm64/bin/node'
  assert digest(node)==PLAN['continuation']['node_binary_sha256'] and digest(ROOT/'download/node.tar.gz')==PLAN['node_archive_sha256']
  assert digest(ROOT/'config/pnpm/config.yaml')==PLAN['continuation']['current_typed_yaml_sha256']
  built={}
  for package in PLAN['packages']:
   directory=WORK/('modules/review' if package=='module-review' else 'packages/'+package)/'dist'
   assert directory.is_dir() and directory.resolve()==directory
   for base,dirs,files in os.walk(directory,followlinks=False):
    for name in files:
     f=Path(base)/name;assert stat.S_ISREG(f.lstat().st_mode);built[str(f.relative_to(WORK))]=digest(f)
  assert len(built)>0
  save('before.json',{'private_copy_count':len(PLAN['copy_files']),'private_built_count':len(built),'private_built_hashes':built,'original_437_source_555_dist_verified_unchanged':True,'fixed_Node_archive_binary_pnpm_verified':True,'typed_private_config_verified':True,'nine_build_SQLite_esbuild_config_receipts_reused':True,'no_new_install_build_or_probe':True})
  private_bin=ROOT/'private-bin';assert private_bin.resolve()==private_bin and stat.S_ISDIR(private_bin.lstat().st_mode) and private_bin.lstat().st_uid==os.getuid() and stat.S_IMODE(private_bin.lstat().st_mode)==0o700
  shim=private_bin/'pnpm';shim_bytes=('#!/bin/sh\nexec '+shlex.quote(str(node))+' '+shlex.quote(PLAN['pnpm_entry'])+' "$@"\n').encode()
  assert shim.resolve()==shim and stat.S_ISREG(shim.lstat().st_mode) and stat.S_IMODE(shim.lstat().st_mode)==0o700 and shim.read_bytes()==shim_bytes
  save('pnpm-shim.json',{'path':str(shim),'sha256':digest(shim),'mode':'0700','fixed_Node':str(node),'fixed_pnpm':PLAN['pnpm_entry'],'argv_forwarded_unchanged':True})
  ENV={'PATH':str(private_bin)+':'+str(node.parent)+':/usr/bin:/bin','HOME':str(ROOT/'home'),'TMPDIR':str(ROOT/'tmp'),'XDG_CONFIG_HOME':str(ROOT/'config'),'XDG_CACHE_HOME':str(ROOT/'cache'),'XDG_DATA_HOME':str(ROOT/'data'),'XDG_STATE_HOME':str(ROOT/'state'),'PNPM_HOME':str(ROOT/'pnpm-home'),'NPM_CONFIG_USERCONFIG':str(ROOT/'npm-user'),'NPM_CONFIG_GLOBALCONFIG':str(ROOT/'npm-global'),'NPM_CONFIG_CACHE':str(ROOT/'cache'),'CI':'true','PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD':'1','NODE_COMPILE_CACHE':str(ROOT/'cache/node-compile')}
  (ROOT/'closure-tests-v3-output').mkdir(mode=0o700);size_check()
  save('fixture-ledger.json',{'root':str(ROOT),'uid':os.getuid(),'mode':'0700','normal_local_execution':True,'additional_sandbox_exec':False,'root_cleanup_authorized_in_this_run':False})
  opts=['--pm-on-fail=error','--config.store-dir='+str(ROOT/'store'),'--config.cache-dir='+str(ROOT/'cache'),'--config.state-dir='+str(ROOT/'state'),'--config.virtual-store-dir='+str(WORK/'node_modules/.pnpm'),'--workspace-concurrency=1']
  version_end=time.monotonic()+10
  phase('shim-pnpm-version',[str(shim),'--pm-on-fail=error','--version'],max(0,version_end-time.monotonic()),'11.7.0')
  phase('shim-node-version',[str(shim)]+opts+['exec','node','-p','process.version'],max(0,version_end-time.monotonic()),'[WARN] Your node_modules are out of sync with your lockfile. The list of pnpmfiles changed.\nv22.19.0')
  for name,tests,budget in [('focused',PLAN['closure_correction']['focused'],180),('backend-tests',PLAN['tests'],900)]:
   result_file=ROOT/('closure-tests-v3-output/'+name+'-results.json')
   phase(name,[str(node),PLAN['pnpm_entry']]+opts+['exec','vitest','run']+tests+['--maxWorkers=1','--no-file-parallelism','--reporter=json','--outputFile='+str(result_file)],budget)
   result=json.loads(result_file.read_text())
   assert result['success'] is True and all(result[k]==0 for k in ['numFailedTests','numFailedTestSuites','numPendingTests','numPendingTestSuites','numTodoTests'])
   assert result['numPassedTests']==result['numTotalTests']>0 and result['numPassedTestSuites']==result['numTotalTestSuites']>0
   assert all(row['status']=='passed' and row['message']=='' and all(test['status']=='passed' and not test['failureMessages'] for test in row['assertionResults']) for row in result['testResults'])
   names={str(Path(r['name']).relative_to(WORK)) for r in result['testResults']};assert names==set(tests)
   results_summary={k:result[k] for k in ['success','numTotalTestSuites','numPassedTestSuites','numFailedTestSuites','numTotalTests','numPassedTests','numFailedTests','numPendingTests']};results_summary.update(file_count=len(names),test_JSON_sha256=digest(result_file))
   save(name+'-safe-summary.json',results_summary)
  assert all(digest(WORK/path)==value for path,value in built.items())
  verify_original();after=True;size_check();assert all(r['actual_close'] and r['group_absent'] for r in STAGES);status='passed'
 except Exception as error:failure=str(error) if isinstance(error,RuntimeError) else type(error).__name__
 finally:
  try:verify_original();after=True
  except Exception:after=False
  save('final.receipt.json',{'status':status,'failure_enum':failure,'elapsed_seconds':time.monotonic()-START,'stages':STAGES,'results':results_summary,'original_437_source_555_dist_verified_unchanged':after,'fixture_retained':True,'fixture_removed':False,'root':str(ROOT),'size_peak':{k:max([r[k] for r in SIZES],default=0) for k in ['logical_bytes','allocated_bytes']},'internal_temp_scope':PLAN['normal_test_continuation']['internal_temp_scope'],'evidence_combination':'attempt2 empty-fixture install + continuation3 actual ninebuild/SQLite/esbuild/config + this normal-local suite; not one uninterrupted clean run','original_install_effective_Booleanfalse_not_backfilled':True,'no_additional_FS_sandbox':True,'no_cleanup_per_latest_root_instruction':True})
 if status!='passed':raise SystemExit(1)
if __name__=='__main__':main()
