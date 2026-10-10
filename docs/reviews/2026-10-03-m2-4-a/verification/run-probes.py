from pathlib import Path
from datetime import datetime,timezone
import subprocess,json,sys
P=Path(__file__).resolve().parent;ROOT=P.parents[3];records=[]
for name in sys.argv[1:]:
 cmd=['node',str(P/f'check-context-{name}.mjs')] if name!='targeted' else ['pnpm','exec','vitest','run','tests/integration/m2-context.test.ts','tests/contracts/m2-context-contracts.test.ts']
 start=datetime.now(timezone.utc).isoformat()
 with (P/f'observed-{name}-first.txt').open('w') as out,(P/f'observed-{name}-first.stderr.txt').open('w') as err:
  r=subprocess.run(cmd,cwd=ROOT,stdout=out,stderr=err,timeout=60)
 records.append({'command':cmd,'exit_code':r.returncode,'started_at':start,'finished_at':datetime.now(timezone.utc).isoformat(),'stdout':f'observed-{name}-first.txt','stderr':f'observed-{name}-first.stderr.txt'});print(name,r.returncode,flush=True)
 (P/'probe-commands.json').write_text(json.dumps(records,indent=2)+'\n')
 if r.returncode:break
