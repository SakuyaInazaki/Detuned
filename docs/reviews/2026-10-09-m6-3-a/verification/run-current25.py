import json,pathlib,subprocess,hashlib,sys
root=pathlib.Path.cwd();v=pathlib.Path(__file__).resolve().parent;m=json.loads((v/'current29-manifest.json').read_text())
for row in m['adapters']:
 for key,hkey in [('original_path','original_sha256'),('sealed_schema4_adapter','sealed_schema4_sha256'),('adapter','adapter_sha256')]:
  assert hashlib.sha256((root/row[key]).read_bytes()).hexdigest()==row[hkey],row[key]
receipts=[]
for number,command in enumerate(m['commands'][4:],5):
 args=command.split();assert args[0]=='node' and len(args)==2
 label=f'current-{number:02d}-first';result=subprocess.run(['python3',str(v/'run-command.py'),label,*args],cwd=root)
 receipts.append(label+'.json');print(f'Current #{number}: exit {result.returncode}',flush=True)
 if result.returncode:
  (v/'current25-run.json').write_text(json.dumps({'state':'stopped_first_failure','number':number,'receipts':receipts},indent=2)+'\n');sys.exit(result.returncode)
(v/'current25-run.json').write_text(json.dumps({'state':'passed','probes':25,'receipts':receipts},indent=2)+'\n')
m.update({'state':'executed_passed_composite','gate_receipts':['build-final.json','typecheck-final.json','lint-checker-v2.json','core-final.json'],'probe_receipts':receipts,'passed_checks':29,'note':'Final full 790/122; first full 788 pass +2 old fixture failures retained. Four final gates plus 25 probes (6 originals,4 previous approved adapters,15 current schema5 copies:12 changed/3 identical). Counts separate from core.'})
(v/'current29-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
