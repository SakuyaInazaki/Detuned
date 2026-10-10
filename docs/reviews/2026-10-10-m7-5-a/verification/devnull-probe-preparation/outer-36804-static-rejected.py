from pathlib import Path
import json,hashlib,os,stat,time,subprocess,signal,sys
V=Path(__file__).resolve().parent;P=json.loads((V/'plan.json').read_text());START=time.monotonic()
assert len(sys.argv)==2 and sys.argv[1]==hashlib.sha256((V/'plan.json').read_bytes()).hexdigest()
ROOT=Path(P['root']);RUNTIME=Path(P['runtime_directory']);NODE=Path(P['fixed_node']);SOURCE=V.parent
JS=(SOURCE/'candidate-controller.cjs').read_bytes()
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def wx(p,b):
 fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'wb') as f:f.write(b)
def save(name,obj):wx(V/name,(json.dumps(obj,indent=2)+'\n').encode())
def absent(pid,group=False):
 try:
  if group:os.killpg(pid,0)
  else:os.kill(pid,0)
  return False
 except ProcessLookupError:return True
assert digest(NODE)==P['fixed_node_binary_sha256'] and digest(ROOT/'policy.sb')==P['source_policy_sha256']
assert hashlib.sha256(JS).hexdigest()==P['controller_sha256']
rs=ROOT.lstat();assert rs.st_uid==os.getuid() and stat.S_ISDIR(rs.st_mode) and stat.S_IMODE(rs.st_mode)==0o700 and ROOT.resolve()==ROOT
ns=os.lstat('/dev/null');d=P['device_binding']
assert stat.S_ISCHR(ns.st_mode) and not stat.S_ISLNK(ns.st_mode) and os.path.realpath('/dev/null')=='/dev/null'
assert [ns.st_dev,ns.st_ino,ns.st_rdev,ns.st_uid,ns.st_gid,ns.st_mode]==[d[k] for k in ['dev','ino','rdev','uid','gid','lstat_mode']]
assert not os.path.lexists(P['sentinel']);RUNTIME.mkdir(mode=0o700);wx(RUNTIME/'controller.cjs',JS)
for name in ['current-policy.sb','candidate-devnull-policy.sb']:wx(RUNTIME/name,(SOURCE/name).read_bytes())
assert digest(RUNTIME/'current-policy.sb')==P['source_policy_sha256'] and digest(RUNTIME/'candidate-devnull-policy.sb')==P['candidate_policy_sha256']
ENV={'PATH':str(NODE.parent)+':/usr/bin:/bin','HOME':str(ROOT/'home'),'TMPDIR':str(ROOT/'tmp'),'XDG_CONFIG_HOME':str(ROOT/'config'),'XDG_CACHE_HOME':str(ROOT/'cache'),'XDG_DATA_HOME':str(ROOT/'data'),'XDG_STATE_HOME':str(ROOT/'state'),'PNPM_HOME':str(ROOT/'pnpm-home'),'NPM_CONFIG_USERCONFIG':str(ROOT/'npm-user'),'NPM_CONFIG_GLOBALCONFIG':str(ROOT/'npm-global'),'NPM_CONFIG_CACHE':str(ROOT/'cache'),'CI':'true','PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD':'1','NODE_COMPILE_CACHE':str(ROOT/'cache/node-compile')}
rows=[];failure=None
try:
 for name,policy,args,budget in [('generated-controller-syntax','current-policy.sb',['--check',str(RUNTIME/'controller.cjs')],3),('red','current-policy.sb',['-e',JS.decode(),'red',str(RUNTIME),P['sentinel']],5),('green','candidate-devnull-policy.sb',['-e',JS.decode(),'green',str(RUNTIME),P['sentinel']],5)]:
  begun=time.monotonic();limit=min(budget,30-(begun-START));assert limit>0
  argv=['/usr/bin/sandbox-exec','-f',str(RUNTIME/policy),str(NODE)]+args
  child=subprocess.Popen(argv,cwd=ROOT/'work',env=ENV,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True);proof=None
  q=subprocess.run(['/bin/ps','-p',str(child.pid),'-o','pid=,uid=,ppid=,pgid='],env={'PATH':'/usr/bin:/bin'},capture_output=True,text=True,timeout=min(1,limit));a=q.stdout.split()
  if q.returncode==0 and len(a)==4 and all(x.isdigit() for x in a):
   values=list(map(int,a));assert values==[child.pid,os.getuid(),os.getpid(),child.pid];proof=dict(zip(['pid','uid','ppid','pgid'],values))
  elif child.poll() is None:raise RuntimeError('STAGE_PROOF_UNKNOWN')
  timedout=False
  try:out,err=child.communicate(timeout=max(.01,limit-(time.monotonic()-begun)))
  except subprocess.TimeoutExpired:
   timedout=True
   if proof:os.killpg(child.pid,signal.SIGTERM)
   else:child.terminate()
   try:out,err=child.communicate(timeout=min(1,max(.01,30-(time.monotonic()-START))))
   except subprocess.TimeoutExpired:
    if proof:os.killpg(child.pid,signal.SIGKILL)
    else:child.kill()
    out,err=child.communicate(timeout=min(1,max(.01,30-(time.monotonic()-START))))
  row={'stage':name,'creator_pid':child.pid,'stage_proof':proof,'actual_close':True,'code':child.returncode if child.returncode>=0 else None,'signal':signal.Signals(-child.returncode).name if child.returncode<0 else None,'pid_absent':absent(child.pid),'group_absent':absent(child.pid,True),'elapsed_seconds':time.monotonic()-begun,'timeout':timedout,'stdout_bytes':len(out),'stderr_bytes':len(err),'stdout_sha256':hashlib.sha256(out).hexdigest(),'stderr_sha256':hashlib.sha256(err).hexdigest(),'result_parse_attempted_at_receipt':False}
  wx(V/(name+'.stdout'),out);wx(V/(name+'.stderr'),err)
  save(name+'.receipt.json',row);rows.append(row)
  if name!='generated-controller-syntax':
   try:result=json.loads(out)
   except (json.JSONDecodeError,UnicodeDecodeError):
    save(name+'.parse-failure.receipt.json',{'failure_enum':'PROBE_JSON_PARSE_FAILURE','stage_receipt_persisted_before_parse':True});raise RuntimeError('PROBE_JSON_PARSE_FAILURE')
   save(name+'.result.json',result)
  if child.returncode or timedout or not row['group_absent'] or not row['pid_absent'] or len(out)>16384 or len(err)>8192:raise RuntimeError('UNEXPECTED_PROBE_RESULT')
except Exception as e:failure=str(e) if isinstance(e,RuntimeError) else type(e).__name__
now=os.lstat('/dev/null');same=[now.st_dev,now.st_ino,now.st_rdev,now.st_mode]==[ns.st_dev,ns.st_ino,ns.st_rdev,ns.st_mode]
final={'passed':failure is None and len(rows)==3 and same and not os.path.lexists(P['sentinel']),'failure_enum':failure,'elapsed_seconds':time.monotonic()-START,'stages':rows,'devnull_device_unchanged':same,'exact_sentinel_absent':not os.path.lexists(P['sentinel']),'original_policy_unchanged':digest(ROOT/'policy.sb')==P['source_policy_sha256'],'root_not_cleaned':True,'first_missing_red_PID_receipt_not_reconstructed':True}
save('final.receipt.json',final);print({k:final[k] for k in ['passed','failure_enum','elapsed_seconds','devnull_device_unchanged','exact_sentinel_absent','original_policy_unchanged']});raise SystemExit(0 if final['passed'] else 1)
