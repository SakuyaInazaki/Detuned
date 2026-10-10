import json,subprocess,time,sys,os,hashlib
from pathlib import Path
r=Path('/Users/sakimi/Desktop/Detuned');v=r/'docs/reviews/2026-10-10-m7-3/verification';plan=json.loads((v/sys.argv[1]).read_text());gate=sys.argv[2];label=sys.argv[3] if len(sys.argv)>3 else 'first';c=next(x for x in plan['commands'] if x['gate']==gate);prefix=v/(gate+'-'+label);assert not Path(str(prefix)+'.json').exists();start=time.time()
with open(str(prefix)+'.stdout.txt','wb') as out,open(str(prefix)+'.stderr.txt','wb') as err:
 p=subprocess.Popen(c['argv'],cwd=r,stdout=out,stderr=err);receipt={'gate':gate,'argv':c['argv'],'cwd':str(r),'runner_pid':os.getpid(),'command_pid':p.pid,'started_unix':start,'status':'running'};Path(str(prefix)+'.json').write_text(json.dumps(receipt,indent=2)+'\n');code=p.wait()
receipt.update(status='completed',exit_code=code,duration_seconds=round(time.time()-start,3));Path(str(prefix)+'.json').write_text(json.dumps(receipt,indent=2)+'\n')
if gate.startswith('build') and code==0:
 inventory={str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for x in ['packages','modules'] for p in (r/x).glob('*/dist/**/*') if p.is_file()};(v/(gate+'-'+label+'-dist.json')).write_text(json.dumps({'gate_receipt':str(prefix.relative_to(r))+'.json','count':len(inventory),'hashes':inventory},indent=2)+'\n')
print(json.dumps(receipt));sys.exit(code)
