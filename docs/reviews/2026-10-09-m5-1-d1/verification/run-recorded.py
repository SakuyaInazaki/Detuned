from pathlib import Path
from datetime import datetime, timezone
import subprocess, json, sys, time
p = Path(__file__).resolve().parent / 'gates'
name = sys.argv[1]; command = sys.argv[2:]
start = datetime.now(timezone.utc).isoformat(); tick = time.monotonic()
with (p / f'{name}.stdout').open('x') as out, (p / f'{name}.stderr').open('x') as err:
    try:
        run = subprocess.run(command, stdout=out, stderr=err, timeout=180)
        exitcode = run.returncode; timedout = False
    except subprocess.TimeoutExpired:
        exitcode = 124; timedout = True
record = {'stage':name, 'argv':command, 'exit':exitcode, 'timeout':timedout, 'elapsed_seconds':round(time.monotonic()-tick,3), 'started_at':start, 'finished_at':datetime.now(timezone.utc).isoformat(), 'stdout':f'{name}.stdout', 'stderr':f'{name}.stderr'}
(p / f'{name}.receipt.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record), flush=True)
sys.exit(exitcode)
