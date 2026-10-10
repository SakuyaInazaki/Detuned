from pathlib import Path
import subprocess,json,time,sys
v=Path(__file__).resolve().parent
cmd=['/opt/homebrew/bin/node','scripts/integrations/dsh-runtime/launch.mjs','--source','/private/tmp/detuned-m43-runtime.MU1a4q','--repo','/Users/sakimi/Desktop/Detuned','--suite','plugin']
start=time.time()
r=subprocess.run(cmd,capture_output=True,text=True,env={'PATH':'/opt/homebrew/bin:/usr/bin:/bin','CI':'1'})
(v/'dsh-first.stdout.txt').write_text(r.stdout);(v/'dsh-first.stderr.txt').write_text(r.stderr)
receipt={'command':cmd,'exit_code':r.returncode,'seconds':round(time.time()-start,3),'stdout':'dsh-first.stdout.txt','stderr':'dsh-first.stderr.txt','lane':'fixed official dsh plugin runtime HEAD5badb150/Vitest4.1.8; external not core tests','launch_config_modified':False,'original_supervisor_timeout_ms':180000,'product_version':'A2+B1; build-v2'}
(v/'dsh-first.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt));print(r.stdout);print(r.stderr)
sys.exit(r.returncode)
