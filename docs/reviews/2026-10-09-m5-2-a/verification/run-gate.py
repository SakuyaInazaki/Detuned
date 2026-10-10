import os,sys,subprocess,time,json,pathlib
root=pathlib.Path(__file__).resolve().parent
stage=sys.argv[1]; command=sys.argv[2:]
env=os.environ.copy();env.update(npm_config_userconfig='/dev/null',npm_config_globalconfig='/dev/null',CI='1',DETUNED_WEB_EVIDENCE_DIR=str(root/('browser-'+stage)))
t=time.monotonic()
with (root/'gates'/f'{stage}.stdout.log').open('xb') as out,(root/'gates'/f'{stage}.stderr.log').open('xb') as err:
 p=subprocess.run(command,env=env,stdout=out,stderr=err,timeout=180)
record={'stage':stage,'command':command,'exit_code':p.returncode,'seconds':round(time.monotonic()-t,3),'evidence_root':env['DETUNED_WEB_EVIDENCE_DIR']}
(root/'gates'/f'{stage}.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record));sys.exit(p.returncode)
