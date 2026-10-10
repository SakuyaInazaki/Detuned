import json,subprocess,time,sys,os
from pathlib import Path
r=Path('/Users/sakimi/Desktop/Detuned');v=r/'docs/reviews/2026-10-09-m7-1-a/verification';plan=json.loads((v/'runtime-repair-plan.json').read_text());gate=sys.argv[1];c=next(x for x in plan['commands'] if x['gate']==gate);prefix=v/(gate+'-'+(sys.argv[2] if len(sys.argv)>2 else 'first'));start=time.time()
with open(str(prefix)+'.stdout.txt','wb') as out,open(str(prefix)+'.stderr.txt','wb') as err:
 p=subprocess.Popen(c['argv'],cwd=r,stdout=out,stderr=err);receipt={'gate':gate,'argv':c['argv'],'cwd':str(r),'runner_pid':os.getpid(),'command_pid':p.pid,'started_unix':start,'status':'running'};Path(str(prefix)+'.json').write_text(json.dumps(receipt,indent=2)+'\n');code=p.wait()
receipt.update(status='completed',exit_code=code,duration_seconds=round(time.time()-start,3));Path(str(prefix)+'.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt));sys.exit(code)
