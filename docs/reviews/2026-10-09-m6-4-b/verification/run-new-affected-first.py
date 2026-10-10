from pathlib import Path
import subprocess,json,time,os,sys
v=Path(__file__).resolve().parent
files=['tests/contracts/m6-review-tools.test.ts', 'tests/contracts/m6-review-cli.test.ts', 'tests/contracts/m6-review-tools-independent.test.ts', 'tests/contracts/cross-interface-contract.test.ts', 'tests/contracts/m0-m1-r2-adapters.test.ts', 'tests/contracts/m2-focused-context-contracts.test.ts', 'tests/contracts/m2-post-revision-read-contracts.test.ts', 'tests/contracts/m3-events-contract.test.ts', 'tests/contracts/m4-mcp-runtime.test.ts', 'tests/contracts/m4-runtime-binding-native.test.ts', 'tests/contracts/m4-mcp-lifecycle-independent.test.ts', 'tests/contracts/m4-mcp-binding-independent.test.ts', 'tests/contracts/m4-mcp-wrapped-independent.test.ts', 'tests/contracts/m4-mcp-input-mode.test.ts', 'tests/contracts/m4-pi-native-lifecycle.test.ts']
cmd=['/opt/homebrew/bin/pnpm','test',*files,'--maxWorkers=1','--no-file-parallelism']
env=os.environ.copy();env.update({'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'})
start=time.time()
r=subprocess.run(cmd,capture_output=True,text=True,env=env)
(v/'new-affected-first.stdout.txt').write_text(r.stdout);(v/'new-affected-first.stderr.txt').write_text(r.stderr)
receipt={'command':cmd,'exit_code':r.returncode,'seconds':round(time.time()-start,3),'stdout':'new-affected-first.stdout.txt','stderr':'new-affected-first.stderr.txt','workers':1,'file_parallelism':False,'original_timeouts':'unchanged','scope':'new A4+B3+D6; eleven exact catalog adaptations; original six Pi SDK lifecycle cases with ninth tool proof','product_version':'A2+B1; build-v2'}
(v/'new-affected-first.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt));print(r.stdout);print(r.stderr)
sys.exit(r.returncode)
