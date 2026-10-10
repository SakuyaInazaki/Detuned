from pathlib import Path
import os,subprocess,time,json,sys,hashlib,shlex
v=Path(__file__).resolve().parent
stage=sys.argv[1]
old_specs=['author.spec.ts','independent.spec.ts','m5-c.spec.ts','m5-d2.spec.ts','m5-e1.spec.ts','m5-e2.spec.ts','m5-tls.spec.ts']
commands={
 'typecheck':['/opt/homebrew/bin/pnpm','-r','--workspace-concurrency=1','run','typecheck'],
 'lint':['/opt/homebrew/bin/pnpm','-r','--workspace-concurrency=1','run','lint'],
 'old-browser':['/opt/homebrew/bin/pnpm','test:e2e',*[f'scripts/integrations/web/{x}' for x in old_specs],'--workers=1'],
 'core':['/opt/homebrew/bin/pnpm','test','--maxWorkers=1','--no-file-parallelism'],
}
if stage.startswith('current-'):
 n=int(stage.split('-')[1]); selection=json.loads((v/'current29-first-selection.json').read_text())
 probe=next(x for x in selection['probes'] if x['number']==n)
 source=Path(probe['source_path']); assert hashlib.sha256(source.read_bytes()).hexdigest()==probe['source_sha256']
 command=shlex.split(probe['command'])
else:command=commands[stage]
receipt=v/(stage+'-first.json')
if receipt.exists():raise SystemExit('First evidence already exists; refusing overwrite.')
env=os.environ.copy();env.update({'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'})
if stage=='old-browser':env['DETUNED_WEB_EVIDENCE_DIR']=str(v/'old-browser-first')
start=time.monotonic()
with (v/(stage+'-first.stdout.txt')).open('w') as out,(v/(stage+'-first.stderr.txt')).open('w') as err:
 process=subprocess.Popen(command,env=env,stdout=out,stderr=err)
 code=process.wait()
result={'command':command,'exit_code':code,'seconds':round(time.monotonic()-start,3),'runner_pid':process.pid,'stdout':stage+'-first.stdout.txt','stderr':stage+'-first.stderr.txt','source_freeze':'independent-source-freeze-v5.json','concurrency':'global one; workspace1/test worker1/file serial; original timeouts','env_overrides':{'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1','DETUNED_WEB_EVIDENCE_DIR':env.get('DETUNED_WEB_EVIDENCE_DIR')}}
receipt.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));print((v/(stage+'-first.stdout.txt')).read_text());print((v/(stage+'-first.stderr.txt')).read_text());sys.exit(code)
