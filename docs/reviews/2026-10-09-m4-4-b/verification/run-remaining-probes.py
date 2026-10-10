from pathlib import Path
import subprocess,sys,json,shlex
p=Path(__file__).resolve().parent
commands=json.loads((p/'current29-manifest.json').read_text())['commands']
for index,name in [(27,'current29-27-adapter'),(28,'current29-28'),(29,'current29-29')]:
 run=subprocess.run([sys.executable,str(p/'run-recorded.py'),name,*shlex.split(commands[index-1])])
 if run.returncode:sys.exit(run.returncode)
