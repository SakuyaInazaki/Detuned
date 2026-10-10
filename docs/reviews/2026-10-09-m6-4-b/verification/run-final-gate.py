from pathlib import Path
import subprocess,json,time,os,sys
v=Path(__file__).resolve().parent
name=sys.argv[1]
commands={'typecheck':['/opt/homebrew/bin/pnpm','-r','--workspace-concurrency=1','run','typecheck'],'lint':['/opt/homebrew/bin/pnpm','-r','--workspace-concurrency=1','run','lint'],'core':['/opt/homebrew/bin/pnpm','test','--maxWorkers=1','--no-file-parallelism']}
cmd=commands[name]
env=os.environ.copy();env.update({'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'})
start=time.time()
r=subprocess.run(cmd,capture_output=True,text=True,env=env)
(v/(name+'-first.stdout.txt')).write_text(r.stdout);(v/(name+'-first.stderr.txt')).write_text(r.stderr)
receipt={'command':cmd,'exit_code':r.returncode,'seconds':round(time.time()-start,3),'stdout':name+'-first.stdout.txt','stderr':name+'-first.stderr.txt','workspace_concurrency':1,'test_workers':1 if name=='core' else None,'file_parallelism':False if name=='core' else None,'original_case_timeouts':'unchanged','product_version':'A2+B1; build-v2; D DT04/05 expectation-only correction'}
(v/(name+'-first.json')).write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt));print(r.stdout);print(r.stderr)
sys.exit(r.returncode)
