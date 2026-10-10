from pathlib import Path
import subprocess,json,time,os,sys
v=Path(__file__).resolve().parent
cmd=['/opt/homebrew/bin/pnpm','test','packages/protocol/tests/schema.test.ts','tests/contracts/m2-thread-posts-read-contracts.test.ts','tests/integration/m6-review-requests.test.ts','tests/contracts/m2-space-read-contracts.test.ts','tests/contracts/m4-pi-runtime.test.ts','--maxWorkers=1','--no-file-parallelism']
env=os.environ.copy();env.update({'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'})
start=time.time()
r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=90)
(v/'core-five-corrected.stdout.txt').write_text(r.stdout);(v/'core-five-corrected.stderr.txt').write_text(r.stderr)
receipt={'command':cmd,'exit_code':r.returncode,'seconds':round(time.time()-start,3),'stdout':'core-five-corrected.stdout.txt','stderr':'core-five-corrected.stderr.txt','workers':1,'file_parallelism':False,'original_case_timeouts':'unchanged','scope':'root-authorized five old contract test updates; all original cases, no product changes'}
(v/'core-five-corrected.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt));print(r.stdout);print(r.stderr)
sys.exit(r.returncode)
