import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const recordDir = new URL('.', import.meta.url).pathname;
const commandsFile = join(recordDir, 'commands.json');
const logsDir = join(recordDir, 'logs');

if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

export function runAndRecord(cmd, name) {
  let commands = [];
  if (existsSync(commandsFile)) {
    try { commands = JSON.parse(readFileSync(commandsFile, 'utf8')); } catch {}
  }
  const id = commands.length + 1;
  const tag = `${String(id).padStart(2, '0')}-${name}`;
  const stdoutPath = join(logsDir, `${tag}.stdout.txt`);
  const stderrPath = join(logsDir, `${tag}.stderr.txt`);
  
  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  try {
    stdout = execSync(cmd, { cwd: '/Users/sakimi/Desktop/Detuned', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 }).toString();
  } catch (err) {
    exitCode = err.status ?? 1;
    stdout = err.stdout ? err.stdout.toString() : '';
    stderr = err.stderr ? err.stderr.toString() : (err.message ?? '');
  }
  
  writeFileSync(stdoutPath, stdout);
  writeFileSync(stderrPath, stderr);
  
  commands.push({
    id,
    name,
    command: cmd,
    exit_code: exitCode,
    stdout_file: `logs/${tag}.stdout.txt`,
    stderr_file: `logs/${tag}.stderr.txt`,
    timestamp: new Date().toISOString()
  });
  
  writeFileSync(commandsFile, JSON.stringify(commands, null, 2) + '\n');
  console.log(`[runAndRecord] #${id} (${name}) exited with ${exitCode}`);
  return { exitCode, stdout, stderr };
}

if (process.argv[2] && process.argv[3]) {
  runAndRecord(process.argv.slice(3).join(' '), process.argv[2]);
}
