from pathlib import Path
from datetime import datetime, timezone
import subprocess, json, sys
p = Path(__file__).resolve().parent
name = sys.argv[1]; command = sys.argv[2:]
start = datetime.now(timezone.utc).isoformat()
with (p / f'observed-{name}.txt').open('x') as out, (p / f'observed-{name}.stderr.txt').open('x') as err:
    run = subprocess.run(command, stdout=out, stderr=err)
path = p / 'commands.json'
records = json.loads(path.read_text()) if path.exists() else {'commands': []}
records['commands'].append({'command': command, 'exit_code': run.returncode, 'started_at': start, 'finished_at': datetime.now(timezone.utc).isoformat(), 'output_file': out.name, 'stderr_file': err.name})
path.write_text(json.dumps(records, indent=2) + '\n')
print(name, run.returncode, flush=True)
print((p / out.name).read_text()[-2200:], flush=True)
print((p / err.name).read_text()[-1000:], flush=True)
sys.exit(run.returncode)
