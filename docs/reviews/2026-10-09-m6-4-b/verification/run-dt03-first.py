from pathlib import Path
import subprocess,json,time,os,sys
v=Path(__file__).resolve().parent
cmd=['/opt/homebrew/bin/pnpm','test','tests/contracts/m6-review-tools-independent.test.ts','-t','DT03','--maxWorkers=1','--no-file-parallelism']
env=os.environ.copy();env.update({'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'})
start=time.time()
r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=90)
(v/'dt03-first.stdout.txt').write_text(r.stdout);(v/'dt03-first.stderr.txt').write_text(r.stderr)
receipt={'command':cmd,'exit_code':r.returncode,'seconds':round(time.time()-start,3),'stdout':'dt03-first.stdout.txt','stderr':'dt03-first.stderr.txt','workers':1,'file_parallelism':False,'case_timeout_ms':30000,'scope':'single bounded owned SQLite/loopback test; no VM/daemon/install/model'}
(v/'dt03-first.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt));print(r.stdout);print(r.stderr)
sys.exit(r.returncode)
