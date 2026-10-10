from pathlib import Path
from datetime import datetime,timezone
import subprocess,json
ROOT=Path(__file__).resolve().parents[4]; OUT=Path(__file__).resolve().parent/'r1-final';records=[]
for name,script in [('real-adversaries','run-real-adversaries.mjs'),('metadata-encoding','check-metadata-encoding.mjs'),('ad02-v2','check-c-completion-v2.mjs')]:
 started=datetime.now(timezone.utc).isoformat();cmd=['node',str(OUT.parent/script)]
 with (OUT/f'observed-{name}.json').open('w') as out,(OUT/f'observed-{name}.stderr.txt').open('w') as err:
  try:r=subprocess.run(cmd,cwd=ROOT,stdout=out,stderr=err,timeout=90);code=r.returncode
  except subprocess.TimeoutExpired:code=124;err.write('\nIndependent runner exceeded 90 seconds.\n')
 records.append({'command':cmd,'cwd':str(ROOT),'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'exit_code':code,'stdout':f'observed-{name}.json','stderr':f'observed-{name}.stderr.txt'});(OUT/'independent-commands.json').write_text(json.dumps(records,indent=2)+'\n');print(name,code,flush=True)
