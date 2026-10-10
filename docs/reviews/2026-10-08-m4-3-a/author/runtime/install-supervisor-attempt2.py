"""Owned installation monitor; never imports or executes official source."""
import json
import os
from pathlib import Path
import signal
import subprocess
import time

receipts = Path('/Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-08-m4-3-a/author/runtime')
source = Path((receipts / 'source-path.txt').read_text().strip())
owned = Path((receipts / 'dependencies-path.txt').read_text().strip())
receipts = receipts / 'attempt2'
receipts.mkdir()
for name in ['store', 'cache', 'config', 'data', 'corepack']:
    (owned / name).mkdir(exist_ok=True)
environment = {
    'PATH': '/opt/homebrew/bin:/usr/bin:/bin', 'CI': 'true',
    'npm_config_userconfig': '/dev/null', 'npm_config_globalconfig': '/dev/null',
    'npm_config_cache': str(owned / 'cache'),
    'XDG_CACHE_HOME': str(owned / 'cache'), 'XDG_CONFIG_HOME': str(owned / 'config'),
    'XDG_DATA_HOME': str(owned / 'data'), 'COREPACK_HOME': str(owned / 'corepack'),
    'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
    'GIT_TERMINAL_PROMPT': '0', 'GIT_ASKPASS': '/usr/bin/false',
    'GIT_CONFIG_COUNT': '2', 'GIT_CONFIG_KEY_0': 'credential.helper', 'GIT_CONFIG_VALUE_0': '',
    'GIT_CONFIG_KEY_1': 'core.hooksPath', 'GIT_CONFIG_VALUE_1': '/dev/null',
}
command = ['/opt/homebrew/bin/pnpm', 'install', '--frozen-lockfile', '--ignore-scripts',
           '--ignore-pnpmfile', '--registry=https://registry.npmjs.org',
           '--store-dir=' + str(owned / 'store'), '--fetch-retries=1', '--fetch-timeout=60000']
def size():
    output = subprocess.check_output(['/usr/bin/du', '-sk', str(source), str(owned)], stderr=subprocess.DEVNULL)
    return sum(int(line.split()[0]) * 1024 for line in output.splitlines())
before = json.loads((receipts.parent / 'install-result.json').read_text())['initial_allocated_bytes']
started = time.monotonic()
result = {'command': command, 'cwd': str(source), 'environment': environment,
          'owned_dependencies': str(owned), 'initial_allocated_bytes': before,
          'wall_budget_seconds': 600, 'added_allocated_budget_bytes': 6442450944, 'minimum_free_bytes': 6442450944,
          'third_party_source_executed': False, 'lifecycle_scripts_allowed': False}
with (receipts / 'install.stdout.txt').open('wb') as stdout, (receipts / 'install.stderr.txt').open('wb') as stderr:
    process = subprocess.Popen(command, cwd=source, env=environment, stdout=stdout, stderr=stderr, start_new_session=True)
    result['pid'] = process.pid
    (receipts / 'install-start.json').write_text(json.dumps(result, indent=2) + '\n')
    print('owned installer pid=' + str(process.pid), flush=True)
    reason = None
    try:
        while process.poll() is None:
            elapsed = time.monotonic() - started
            added = size() - before
            free = os.statvfs(source).f_bavail * os.statvfs(source).f_frsize
            print(json.dumps({'elapsed_seconds': round(elapsed, 1), 'cumulative_added_allocated_bytes': added, 'free_bytes': free}), flush=True)
            if elapsed >= 600 or added > 6442450944 or free < 6442450944:
                reason = 'wall_budget' if elapsed >= 600 else 'size_budget' if added > 6442450944 else 'minimum_free_space'
                os.killpg(process.pid, signal.SIGTERM)
                try: process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                break
            try: process.wait(timeout=min(20, max(0.1, 600 - elapsed)))
            except subprocess.TimeoutExpired: pass
    finally:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
    result.update({'exit_code': process.returncode, 'stop_reason': reason,
                   'elapsed_seconds': round(time.monotonic() - started, 3),
                   'final_allocated_bytes': size(), 'active_installer': False})
    (receipts / 'install-result.json').write_text(json.dumps(result, indent=2) + '\n')
    (receipts / 'install.exit-code.txt').write_text(str(process.returncode) + '\n')
    print(json.dumps({key: result[key] for key in ['exit_code', 'stop_reason', 'elapsed_seconds', 'final_allocated_bytes', 'active_installer']}), flush=True)
