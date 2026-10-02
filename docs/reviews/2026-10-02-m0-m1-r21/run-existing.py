"""R21 independent runner. Writes only R21 outputs; never invokes delivery runners."""
from pathlib import Path
from datetime import datetime, timezone
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'docs/reviews/2026-10-02-m0-m1-r20/commands.json'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'batch'
assert MODE in ('batch', 'loopback')
records = []
for item in json.loads(SOURCE.read_text())['commands']:
    cmd = item['command']
    needs_loopback = cmd == 'pnpm test:all' or cmd.endswith('/check-cli.mjs')
    if needs_loopback != (MODE == 'loopback'):
        continue
    started = datetime.now(timezone.utc).isoformat()
    stderr_file = Path(item['output_file']).stem + '.stderr.txt'
    with (OUT / item['output_file']).open('w') as log, (OUT / stderr_file).open('w') as errlog:
        result = subprocess.run(cmd.split(), cwd=ROOT, stdout=log,
                                stderr=errlog, timeout=120)
    record = {'command': cmd, 'cwd': str(ROOT), 'exit_code': result.returncode,
              'output_file': item['output_file'], 'stderr_file': stderr_file, 'started_at': started,
              'finished_at': datetime.now(timezone.utc).isoformat(),
              'expected_exit_code': 0}
    records.append(record)
    (OUT / f'commands-{MODE}.json').write_text(
        json.dumps({'commands': records}, ensure_ascii=False, indent=2) + '\n')
    print(f'{result.returncode}: {cmd}', flush=True)
sys.exit(0 if all(r['exit_code'] == 0 for r in records) else 1)
