"""R22 independent runner. Writes only R22 outputs; never invokes delivery runners."""
from pathlib import Path
from datetime import datetime, timezone
import json
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'docs/reviews/2026-10-02-m0-m1-r21/commands.json'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'batch'
assert MODE in ('batch', 'loopback', 'new')
inherited = json.loads(SOURCE.read_text())['commands']
new_command = {'command': 'node docs/reviews/2026-10-02-m0-m1-r22/check-c2-boundaries.mjs',
               'output_file': 'observed-c2-boundaries.json'}
selected = [new_command] if MODE == 'new' else inherited
records = []
for item in selected:
    cmd = item['command']
    needs_loopback = cmd == 'pnpm test:all' or cmd.endswith('/check-cli.mjs')
    if MODE != 'new' and needs_loopback != (MODE == 'loopback'):
        continue
    started = datetime.now(timezone.utc).isoformat()
    stderr_file = Path(item['output_file']).stem + '.stderr.txt'
    with (OUT / item['output_file']).open('w') as log, (OUT / stderr_file).open('w') as errlog:
        try:
            result = subprocess.run(shlex.split(cmd), cwd=ROOT, stdout=log,
                                    stderr=errlog, timeout=120)
            exit_code = result.returncode
        except subprocess.TimeoutExpired:
            exit_code = 124
            errlog.write('\nR22 runner: command exceeded 120 seconds.\n')
        except OSError as error:
            exit_code = 127
            errlog.write(f'\nR22 runner: {error}\n')
    record = {'command': cmd, 'cwd': str(ROOT), 'exit_code': exit_code,
              'output_file': item['output_file'], 'stderr_file': stderr_file, 'started_at': started,
              'finished_at': datetime.now(timezone.utc).isoformat(),
              'expected_exit_code': 0}
    records.append(record)
    (OUT / f'commands-{MODE}.json').write_text(
        json.dumps({'commands': records}, ensure_ascii=False, indent=2) + '\n')
    print(f'{exit_code}: {cmd}', flush=True)
all_records = {}
for mode in ('batch', 'loopback', 'new'):
    path = OUT / f'commands-{mode}.json'
    if path.exists():
        all_records.update({r['command']: r for r in json.loads(path.read_text())['commands']})
ordered = [all_records[c['command']] for c in inherited + [new_command] if c['command'] in all_records]
(OUT / 'commands.json').write_text(json.dumps({'commands': ordered}, ensure_ascii=False, indent=2) + '\n')
sys.exit(0 if all(r['exit_code'] == 0 for r in records) else 1)
