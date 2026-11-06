#!/usr/bin/env node
// A working-tree copy, never a replacement for the complete Git repository.
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readdir, writeFile, chmod, realpath, open } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

const legacy = 'docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/';
const inside = (base, file) => file === base || file.startsWith(base + path.sep);
function relativeName(value) {
  if (!value || path.isAbsolute(value) || value.includes('\\') || value.split('/').some(p => !p || p === '.' || p === '..')) throw Error(`Unsafe relative path: ${value}`);
  return value;
}
function excluded(name) {
  const parts = name.split('/');
  return parts.some(p => ['node_modules', '.pnpm-store', 'dist', '.git'].includes(p) || p.startsWith('._')) ||
    ['scratch', 'test-results'].includes(parts[0]) ||
    (name.startsWith('docs/reviews/') && !name.startsWith(legacy));
}
async function safeStat(root, name) {
  let current = root;
  for (const part of name.split('/')) {
    current = path.join(current, part);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw Error(`Symbolic links are not exported: ${name}`);
  }
  return lstat(current);
}
async function main() {
  const args = process.argv.slice(2), includes = [];
  let output;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i], value = args[++i];
    if (flag === '--output' && value && !output) output = value;
    else if (flag === '--include' && value) includes.push(relativeName(value));
    else throw Error('Usage: node scripts/export-source.mjs --output /ABS/NEW_DIR [--include relative/path ...]');
  }
  if (!output || !path.isAbsolute(output)) throw Error('--output must be a new absolute directory.');
  const root = await realpath(execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim());
  const destination = path.resolve(output);
  const parent = await realpath(path.dirname(destination));
  if (inside(root, path.join(parent, path.basename(destination)))) throw Error('Output must be outside the source repository.');
  try { await lstat(destination); throw Error('Output already exists; choose a new directory.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 }).toString().split('\0').filter(Boolean);
  const names = new Set(tracked.map(relativeName).filter(n => !excluded(n)));
  async function add(name) {
    if (excluded(name)) throw Error(`Explicit include is excluded: ${name}`);
    const stat = await safeStat(root, name);
    if (stat.isDirectory()) for (const child of await readdir(path.join(root, name))) await add(`${name}/${child}`);
    else if (stat.isFile()) names.add(name);
    else throw Error(`Only regular files are exported: ${name}`);
  }
  for (const name of includes) await add(name);
  // Preflight before creating a partial output, including tracked ancestor links.
  const files = [];
  let deleted = 0;
  for (const name of [...names].sort()) {
    let stat;
    try { stat = await safeStat(root, name); } catch (error) { if (error.code === 'ENOENT' && !includes.includes(name)) { deleted++; continue; } throw error; }
    if (!stat.isFile()) throw Error(`Only regular files are exported: ${name}`);
    files.push([name, stat]);
  }
  await mkdir(destination, { mode: 0o700 });
  try {
    for (const [name, before] of files) {
      const unchanged = stat => stat.dev === before.dev && stat.ino === before.ino && stat.size === before.size && stat.mtimeMs === before.mtimeMs && stat.ctimeMs === before.ctimeMs;
      if (!unchanged(await safeStat(root, name))) throw Error(`Source changed during export: ${name}`);
      const handle = await open(path.join(root, name), constants.O_RDONLY | constants.O_NOFOLLOW);
      let bytes;
      try {
        if (!unchanged(await handle.stat())) throw Error(`Source changed during export: ${name}`);
        bytes = await handle.readFile();
        if (!unchanged(await handle.stat())) throw Error(`Source changed during export: ${name}`);
      } finally { await handle.close(); }
      if (!unchanged(await safeStat(root, name))) throw Error(`Source changed during export: ${name}`);
      const target = path.join(destination, name);
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, bytes, { flag: 'wx', mode: before.mode & 0o777 });
      await chmod(target, before.mode & 0o777);
    }
  } catch (error) { throw Error(`Partial output retained at ${destination}; inspect and retry using a new directory. ${error.message}`); }
  console.log(`Exported ${files.length} current working-tree files to ${destination}; skipped ${deleted} deleted tracked files. Untracked files require explicit --include. No Git history or dependencies copied.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
