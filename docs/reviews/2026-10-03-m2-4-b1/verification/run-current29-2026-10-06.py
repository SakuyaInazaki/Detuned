from pathlib import Path
import json,subprocess,shlex,sys
p=Path(__file__).resolve().parent
manifest=json.loads((p/'current29-manifest-2026-10-06.json').read_text())['commands']
for i,item in enumerate(manifest[1:],1):
 cmd=shlex.split(item['command']);name=f'current29-{i:02d}'
 r=subprocess.run([sys.executable,str(p/'run-recorded-2026-10-06.py'),name,*cmd])
 if r.returncode:sys.exit(r.returncode)
