"""R23 independent collector adapted from R22 safe runner; only writes its own directory."""
from pathlib import Path
from datetime import datetime,timezone
import json,shlex,subprocess,sys
ROOT=Path(__file__).resolve().parents[4]; OUT=Path(__file__).resolve().parent
items=json.loads((OUT/'current-commands.json').read_text())['commands']
mode=sys.argv[1]; records=[]
for item in items:
 cmd=item['command']; loop=cmd=='pnpm test:all' or cmd.endswith('/check-cli.mjs')
 if (mode=='build' and cmd!='pnpm build') or (mode=='batch' and (loop or cmd=='pnpm build')) or (mode=='loopback' and not loop):continue
 started=datetime.now(timezone.utc).isoformat(); output_file = item.get('output_file', ('observed-'+('tests' if cmd=='pnpm test:all' else cmd.split()[-1].split('/')[-1].replace('.mjs','').replace(':','-'))+'.txt')); stderr=Path(output_file).stem+'.stderr.txt'
 with (OUT/output_file).open('w') as out,(OUT/stderr).open('w') as err:
  try:
   result=subprocess.run(shlex.split(cmd),cwd=ROOT,stdout=out,stderr=err,timeout=120); code=result.returncode; timeout=False
  except subprocess.TimeoutExpired:
   code=124;timeout=True;err.write('\nR23 collector: exceeded 120 seconds.\n')
  except OSError as e:
   code=127;timeout=False;err.write(str(e))
 record={'command':cmd,'cwd':str(ROOT),'exit_code':code,'timeout':timeout,'output_file':output_file,'stderr_file':stderr,'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'expected_exit_code':0};records.append(record)
 (OUT/f'commands-{mode}.json').write_text(json.dumps({'commands':records},indent=2)+'\n');print(f'{code}: {cmd}',flush=True)
allr={}
for m in ['build','batch','loopback']:
 p=OUT/f'commands-{m}.json'
 if p.exists():allr.update({r['command']:r for r in json.loads(p.read_text())['commands']})
(OUT/'commands.json').write_text(json.dumps({'commands':[allr[i['command']] for i in items if i['command'] in allr]},indent=2)+'\n')
sys.exit(0 if all(r['exit_code']==0 for r in records) else 1)
