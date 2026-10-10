import sys,json,time,subprocess,pathlib,os
root=pathlib.Path(__file__).resolve().parent
name=sys.argv[1];cmd=sys.argv[2:];start=time.monotonic()
with (root/(name+'.stdout.txt')).open('wb') as out,(root/(name+'.stderr.txt')).open('wb') as err:
 p=subprocess.Popen(cmd,stdout=out,stderr=err)
 (root/(name+'.running.json')).write_text(json.dumps({'command':cmd,'runner_pid':p.pid,'gate':name})+'\n')
 try:code=p.wait(timeout=900)
 except subprocess.TimeoutExpired:
  p.terminate()
  try:p.wait(timeout=5)
  except subprocess.TimeoutExpired:p.kill();p.wait()
  code=124
receipt={'command':cmd,'exit_code':code,'seconds':round(time.monotonic()-start,3),'runner_pid':p.pid,'stdout':name+'.stdout.txt','stderr':name+'.stderr.txt','source_freeze':('execution-source-freeze-v4.json' if (root/'execution-source-freeze-v4.json').exists() else 'execution-source-freeze-v3.json' if (root/'execution-source-freeze-v3.json').exists() else 'execution-source-freeze-v2.json' if (root/'execution-source-freeze-v2.json').exists() else 'execution-source-freeze.json'),'concurrency':'sole window; workspace1/test1/files serial; original assertion/timeouts'}
(root/(name+'.json')).write_text(json.dumps(receipt,indent=2)+'\n');(root/(name+'.running.json')).unlink();print(json.dumps(receipt));sys.exit(code)
