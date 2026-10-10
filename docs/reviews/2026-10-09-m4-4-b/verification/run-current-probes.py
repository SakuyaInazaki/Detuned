from pathlib import Path
import json, subprocess, shlex, sys
p = Path(__file__).resolve().parent
commands = json.loads((p / 'current29-manifest.json').read_text())['commands']
assert commands[10] == 'node docs/reviews/2026-10-08-m3-4-a1/verification/adapters/check-unfinished-contracts.mjs'
for index, command in enumerate(commands[4:], 5):
    run = subprocess.run([sys.executable, str(p / 'run-recorded.py'), f'current29-{index:02d}', *shlex.split(command)])
    if run.returncode:
        sys.exit(run.returncode)
