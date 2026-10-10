from pathlib import Path
import subprocess,json,time,os,sys
v=Path(__file__).resolve().parent
cmd=['/opt/homebrew/bin/pnpm','test','tests/contracts/m6-review-tools-independent.test.ts','-t','DT04|DT05','--maxWorkers=1','--no-file-parallelism']
env=os.environ.copy();env.update({'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'})
start=time.time()
r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=90)
(v/'dt04-dt05-corrected.stdout.txt').write_text(r.stdout);(v/'dt04-dt05-corrected.stderr.txt').write_text(r.stderr)
receipt={'command':cmd,'exit_code':r.returncode,'seconds':round(time.time()-start,3),'stdout':'dt04-dt05-corrected.stdout.txt','stderr':'dt04-dt05-corrected.stderr.txt','workers':1,'file_parallelism':False,'original_case_timeouts_ms':[30000,40000],'scope':'only root-authorized DT04/DT05 fixture expectation correction; no product changes'}
(v/'dt04-dt05-corrected.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt));print(r.stdout);print(r.stderr)
sys.exit(r.returncode)
