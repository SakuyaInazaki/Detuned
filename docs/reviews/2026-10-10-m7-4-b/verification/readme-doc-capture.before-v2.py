# Source preparation only, root release required. Exact own processgroup, no census.
import subprocess,os,tempfile,time,json,signal,hashlib,shutil,stat
from pathlib import Path
repo=Path('/Users/sakimi/Desktop/Detuned');v=repo/'docs/reviews/2026-10-10-m7-4-b/verification';plan=json.loads((v/'readme-doc-smoke-plan.json').read_text());script=v/'readme-doc-smoke.mjs'
assert hashlib.sha256(script.read_bytes()).hexdigest()==plan['script_sha256']
control=Path(tempfile.mkdtemp(prefix='detuned-doc-capture-',dir='/private/tmp')).resolve();assert stat.S_IMODE(control.stat().st_mode)==0o700 and control.stat().st_uid==os.getuid();registry=control/'ownership.json';report=v/'readme-doc-smoke-result.json';assert not report.exists();argv=['node',str(script),str(report),str(registry)]
began=time.monotonic();end=began+24;child=None;closed=False;group_absent=False;expired=False;group_confirmed=False;safe={'status':'failed','budgets':{'work_seconds':20,'cleanup_seconds':3,'absolute_seconds':24}}
def exists(pgid):
 try:os.killpg(pgid,0);return True
 except ProcessLookupError:return False
try:
 with (control/'stdout').open('xb') as out,(control/'stderr').open('xb') as err:
  child=subprocess.Popen(argv,cwd=repo,env={'PATH':'/opt/homebrew/bin:/usr/bin:/bin','HOME':'/Users/sakimi','CI':'true'},stdout=out,stderr=err,start_new_session=True);assert child.pid>1 and os.getpgid(child.pid)==child.pid;group_confirmed=True
  with (control/'driver-registration.json').open('x') as record:os.chmod(record.name,0o600);json.dump({'driverPID':child.pid,'driverPGID':child.pid,'confirmed':True},record)
  try:child.wait(timeout=max(0,began+23-time.monotonic()));closed=True
  except subprocess.TimeoutExpired:expired=True
  if exists(child.pid):
   os.killpg(child.pid,signal.SIGTERM);grace=min(end,time.monotonic()+0.5)
   while exists(child.pid) and time.monotonic()<grace:time.sleep(.02)
   if exists(child.pid):os.killpg(child.pid,signal.SIGKILL)
  if not closed:
   try:child.wait(timeout=max(0,end-time.monotonic()));closed=True
   except subprocess.TimeoutExpired:pass
  while exists(child.pid) and time.monotonic()<end:time.sleep(.02)
  group_absent=not exists(child.pid)
 safe.update(driver_actual_close=closed,registered_group_absent=group_absent,outer_expired=expired,exit_code=child.returncode if closed else None,elapsed_seconds=round(time.monotonic()-began,3))
 # Public raw archive receives only a fixed safe stdout shape, never arbitrary stderr.
 wire=(control/'stdout').read_text();decoded=json.loads(wire);assert set(decoded)=={'status','stage'};assert decoded['status'] in ['passed','failed'];assert decoded['stage'] in ['preflight','private_init','loopback_serve','ordinary_setup','ordinary_me_a','ordinary_me_b','normal_serve_close'];safe['driver_stdout']=decoded;safe['driver_stderr_empty']=(control/'stderr').stat().st_size==0
 if closed and group_absent:
  if registry.exists():
   root=Path(json.loads(registry.read_text())['root']);assert root.parent==Path('/private/tmp') and root.name.startswith('detuned-readme-smoke-')
   if root.exists():
    info=root.lstat();assert stat.S_ISDIR(info.st_mode) and not root.is_symlink() and info.st_uid==os.getuid() and root.resolve()==root;shutil.rmtree(root)
   assert not root.exists();safe['registered_root_absent']=True
  safe['status']='passed' if child.returncode==0 and not expired and safe['driver_stderr_empty'] else 'failed'
except Exception as error:
 safe['status']='failed';safe['capture_error_name']=type(error).__name__ if type(error).__name__ in ['AssertionError','ValueError','OSError','TimeoutExpired'] else 'Error'
finally:
 if child is not None and not closed:
  try:
   if group_confirmed and exists(child.pid):os.killpg(child.pid,signal.SIGTERM)
   elif child.pid>1:child.terminate()
   try:child.wait(timeout=min(.5,max(0,end-time.monotonic())));closed=True
   except subprocess.TimeoutExpired:
    if group_confirmed and exists(child.pid):os.killpg(child.pid,signal.SIGKILL)
    elif child.pid>1:child.kill()
    child.wait(timeout=max(0,end-time.monotonic()));closed=True
   group_absent=group_confirmed and not exists(child.pid)
  except Exception:safe['cleanup_unverified']=True
 safe['driver_actual_close']=closed;safe['registered_group_absent']=group_absent
 # Never remove registry/control while actual driver/group absence is unproved.
 if closed and group_absent:shutil.rmtree(control);safe['control_absent']=not control.exists()
 else:safe['cleanup_unverified']=True;safe['control_retained']=True;safe['status']='failed'
 with (v/'readme-doc-smoke.capture.json').open('x') as f:os.chmod(f.name,0o600);json.dump(safe,f,indent=2);f.write('\n')
 print(json.dumps(safe));raise SystemExit(0 if safe['status']=='passed' else 1)
