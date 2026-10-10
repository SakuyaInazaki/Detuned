from pathlib import Path
import os,subprocess,time,json,sys
v=Path(__file__).resolve().parent
stage=sys.argv[1]
commands={
'new-source-noemit-author':['node','node_modules/typescript/bin/tsc','--noEmit','-p',str(v/'new-source-tsconfig.json')],
'browser-author-selected':['/opt/homebrew/bin/pnpm','test:e2e','scripts/integrations/web/m6-review.spec.ts','--workers=1','--grep','CW01 ordinary requester'],
'browser-author-corrected':['/opt/homebrew/bin/pnpm','test:e2e','scripts/integrations/web/m6-review.spec.ts','--workers=1','--grep','^CW01'],
'new-source-noemit-locator':['node','node_modules/typescript/bin/tsc','--noEmit','-p',str(v/'new-source-tsconfig.json')],
'browser-locator-corrected':['/opt/homebrew/bin/pnpm','test:e2e','scripts/integrations/web/m6-review.spec.ts','--workers=1'],
'new-source-noemit-after-build':['node','node_modules/typescript/bin/tsc','--noEmit','-p',str(v/'new-source-tsconfig.json')],
'new-source-noemit-corrected':['node','node_modules/typescript/bin/tsc','--noEmit','-p',str(v/'new-source-tsconfig.json')],
'new-source-noemit':['node','node_modules/typescript/bin/tsc','--noEmit','-p',str(v/'new-source-tsconfig.json')],
'build-b3':['/opt/homebrew/bin/pnpm','-r','--workspace-concurrency=1','run','build'],
'new-source-noemit-b3':['node','node_modules/typescript/bin/tsc','--noEmit','-p',str(v/'new-source-tsconfig.json')],
'browser-b3':['/opt/homebrew/bin/pnpm','test:e2e','scripts/integrations/web/m6-review.spec.ts','--workers=1'],
'build':['/opt/homebrew/bin/pnpm','-r','--workspace-concurrency=1','run','build'],
'new-contracts':['/opt/homebrew/bin/pnpm','test','tests/contracts/m6-review-catalog.test.ts','tests/contracts/m6-review-web-input.test.ts','tests/contracts/m6-review-catalog-independent.test.ts','--maxWorkers=1','--no-file-parallelism'],
'browser':['/opt/homebrew/bin/pnpm','test:e2e','scripts/integrations/web/m6-review.spec.ts','--workers=1'],
}
command=commands[stage]
receipt=v/(stage+'-first.json')
if receipt.exists():raise SystemExit('First evidence already exists; refusing overwrite.')
env=os.environ.copy();env.update({'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'})
if stage.startswith('browser'):env['DETUNED_WEB_EVIDENCE_DIR']=str(v/(stage+'-first'))
start=time.monotonic()
with (v/(stage+'-first.stdout.txt')).open('w') as out,(v/(stage+'-first.stderr.txt')).open('w') as err:
 process=subprocess.Popen(command,env=env,stdout=out,stderr=err)
 code=process.wait()
result={'command':command,'exit_code':code,'seconds':round(time.monotonic()-start,3),'runner_pid':process.pid,'stdout':stage+'-first.stdout.txt','stderr':stage+'-first.stderr.txt','source_freeze':'independent-source-freeze-v5.json' if 'b3' in stage else ('independent-source-freeze-v4.json' if 'author' in stage else ('independent-source-freeze-v3.json' if 'locator' in stage else 'independent-source-freeze.json')),'concurrency':'global one; workspace1/test worker1/file serial; original timeouts'}
receipt.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));print((v/(stage+'-first.stdout.txt')).read_text());print((v/(stage+'-first.stderr.txt')).read_text());sys.exit(code)
