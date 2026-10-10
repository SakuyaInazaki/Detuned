"""One bounded, serial local command. Evidence names may never be overwritten."""
import json, os, pathlib, subprocess, sys, time
directory=pathlib.Path(__file__).resolve().parent
label=sys.argv[1]
if not label or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in label):
    raise SystemExit('Invalid evidence label')
command=sys.argv[2:]
if not command: raise SystemExit('Missing command')
destinations=[directory/(label+suffix) for suffix in ['.stdout.txt','.stderr.txt','.json']]
if any(p.exists() for p in destinations): raise SystemExit('Evidence already exists')
environment={**os.environ,'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'}
start=time.monotonic()
with destinations[0].open('x') as stdout, destinations[1].open('x') as stderr:
    result=subprocess.run(command,env=environment,stdout=stdout,stderr=stderr,timeout=600)
receipt={'command':command,'exit_code':result.returncode,'seconds':round(time.monotonic()-start,3),
         'stdout':destinations[0].name,'stderr':destinations[1].name,
         'concurrency':'single global execution window; workspace=1 / test worker=1 when applicable'}
destinations[2].write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
raise SystemExit(result.returncode)
