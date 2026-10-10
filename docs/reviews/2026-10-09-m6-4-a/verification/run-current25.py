import json,pathlib,subprocess,hashlib,sys
root=pathlib.Path.cwd();v=pathlib.Path(__file__).resolve().parent;m=json.loads((v/'current29-manifest.json').read_text())
for row in m['probes']:
 assert hashlib.sha256((root/row['source_path']).read_bytes()).hexdigest()==row['source_sha256'],row['source_path']
receipts=[]
for row in m['probes']:
 number=row['number'];args=row['command'].split();assert args[0]=='node' and len(args)==2
 label=f'current-{number:02d}-first';result=subprocess.run(['python3',str(v/'run-command.py'),label,*args],cwd=root)
 receipts.append(label+'.json');print(f'Current #{number}: exit {result.returncode}',flush=True)
 if result.returncode:
  (v/'current25-run.json').write_text(json.dumps({'state':'stopped_first_failure','number':number,'receipts':receipts},indent=2)+'\n');sys.exit(result.returncode)
(v/'current25-run.json').write_text(json.dumps({'state':'passed','probes':25,'receipts':receipts},indent=2)+'\n')
