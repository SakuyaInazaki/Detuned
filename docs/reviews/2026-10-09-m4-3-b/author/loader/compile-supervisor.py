import subprocess,os,time,json,pathlib,signal
source='/private/tmp/detuned-m43-runtime.MU1a4q';out=pathlib.Path('/Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-09-m4-3-b/author/loader')
x=json.loads((out/'build-closure.json').read_text());cmd=['/opt/homebrew/bin/node',source+'/node_modules/typescript/bin/tsc','-b']+x['targets'];env={'PATH':'/opt/homebrew/bin:/usr/bin:/bin','CI':'true'}
def size():return int(subprocess.check_output(['/usr/bin/du','-sk',source]).split()[0])*1024
def free():s=os.statvfs(source);return s.f_bavail*s.f_frsize
before=size();start=time.monotonic();stop=None;samples=[]
with (out/'compile-first.stdout.txt').open('wb') as stdout,(out/'compile-first.stderr.txt').open('wb') as stderr:
 p=subprocess.Popen(cmd,cwd=source,env=env,stdout=stdout,stderr=stderr,start_new_session=True)
 (out/'compile-start.json').write_text(json.dumps({'command':cmd,'env':env,'pid':p.pid,'before_allocated':before},indent=2)+'\n')
 while p.poll() is None:
  now=time.monotonic()-start;allocated=size();available=free();samples.append({'elapsed':now,'allocated':allocated,'free':available})
  if now>180:stop='deadline'
  elif allocated-before>1073741824:stop='allocation_budget'
  elif available<6442450944:stop='minimum_free'
  if stop:
   os.killpg(p.pid,signal.SIGTERM)
   try:p.wait(timeout=3)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
   break
  try:p.wait(timeout=5)
  except subprocess.TimeoutExpired:pass
 actual=p.wait()
result={'actual_child_exit':actual,'stop_reason':stop,'elapsed':time.monotonic()-start,'allocated_before':before,'allocated_after':size(),'samples':samples};(out/'compile-result.json').write_text(json.dumps(result,indent=2)+'\n');(out/'compile-first.exit-code.txt').write_text(str(actual)+'\n');print(json.dumps(result))
