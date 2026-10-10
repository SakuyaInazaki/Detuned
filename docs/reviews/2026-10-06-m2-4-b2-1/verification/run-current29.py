from pathlib import Path
import json,subprocess,shlex,sys
p=Path(__file__).resolve().parent
for i,command in enumerate(json.loads((p/'current29-manifest.json').read_text())['commands'][1:],1):
 r=subprocess.run([sys.executable,str(p/'run-recorded.py'),f'current29-{i:02d}',*shlex.split(command)])
 if r.returncode:sys.exit(r.returncode)
