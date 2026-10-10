from pathlib import Path
import json,subprocess,sys,shlex
root=Path(__file__).resolve().parent
manifest=json.loads((root/'current29-manifest.json').read_text())
results=[]
for number,command in enumerate(manifest['commands'][4:],5):
 stage=f'current29-{number:02d}'
 p=subprocess.run([sys.executable,str(root/'run-gate.py'),stage,*shlex.split(command)])
 results.append(json.loads((root/'gates'/f'{stage}.json').read_text()))
 if p.returncode:
  (root/'current25-results.json').write_text(json.dumps(results,indent=2)+'\n');sys.exit(p.returncode)
(root/'current25-results.json').write_text(json.dumps(results,indent=2)+'\n')
