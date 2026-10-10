from pathlib import Path
import json,hashlib,subprocess,sys,shlex
v=Path(__file__).resolve().parent
assert json.loads((v/'core-first.json').read_text())['exit_code']==0
selection_path=v.parent.parent/'2026-10-09-m6-4-c1/verification/current29-final-selection.json'
selection=json.loads(selection_path.read_text());root=v.parents[3]
for row in selection['probes']:
 source=root/row['source_path'];assert hashlib.sha256(source.read_bytes()).hexdigest()==row['source_sha256']
 command=shlex.split(row['command']);command[0]='/opt/homebrew/bin/node'
 result=subprocess.run([sys.executable,str(v/'run-gate.py'),f"current-{row['number']:02d}-first",*command])
 if result.returncode:sys.exit(result.returncode)
 row['state']='passed';row['receipt']=f"current-{row['number']:02d}-first.json"
 row['receipt_sha256']=hashlib.sha256((v/row['receipt']).read_bytes()).hexdigest()
selection['state']='executed_this_c2a_exact_prior_selected25';selection['prior_selection']=str(selection_path.relative_to(root));selection['prior_selection_sha256']=hashlib.sha256(selection_path.read_bytes()).hexdigest();selection['composition']={'originals':6,'prior_adapters':19,'new_adapters_this_package':0};selection['seconds_current25']=round(sum(json.loads((v/r['receipt']).read_text())['seconds'] for r in selection['probes']),3)
(v/'current25-final-selection.json').write_text(json.dumps(selection,indent=2)+'\n');print('25 selected probes each once passed')
