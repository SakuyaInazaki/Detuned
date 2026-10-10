import subprocess,time,json,pathlib,os,sys
stage=sys.argv[1];p=pathlib.Path(__file__).resolve().parent;start=time.time()
with (p/(stage+'-first.log')).open('w') as f:r=subprocess.run(['/opt/homebrew/bin/pnpm',stage],env={**os.environ,'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'},stdout=f,stderr=subprocess.STDOUT)
x={'command':'pnpm '+stage,'exit_code':r.returncode,'seconds':round(time.time()-start,3),'log':str(p/(stage+'-first.log'))};(p/(stage+'-first.json')).write_text(json.dumps(x,indent=2)+'\n');print(json.dumps(x));raise SystemExit(r.returncode)
