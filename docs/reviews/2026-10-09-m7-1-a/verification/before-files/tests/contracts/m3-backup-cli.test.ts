import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';

// Real built CLI package entry point; the independent verifier builds once.
describe('M3.3-A local backup and recovery CLI', () => {
  let root: string; const live = new Set<ChildProcessWithoutNullStreams>();
  beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'detuned-backup-cli-')); });
  afterEach(async () => {
    await Promise.all([...live].map(child => new Promise<void>(resolve => { child.once('close', () => resolve()); child.kill('SIGKILL'); })));
    await rm(root, { recursive: true, force: true });
  });
  function launch(args: string[]) {
    const child = spawn(process.execPath, ['packages/cli/dist/index.js', ...args], { env: { ...process.env, DETUNED_TOKEN: '', DETUNED_TOKEN_FILE: path.join(root, 'never-read-token') } });
    live.add(child); child.once('close', () => live.delete(child)); child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); return child;
  }
  function cli(args: string[]) {
    return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = launch(['--json', ...args]); let stdout = '', stderr = '';
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('CLI deadline exceeded')); }, 15_000);
      child.stdout.on('data', s => { stdout += s; }); child.stderr.on('data', s => { stderr += s; });
      child.once('error', e => { clearTimeout(timer); reject(e); }); child.once('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    });
  }
  async function init(source = path.join(root, 'source')) {
    const result = await cli(['init', '--data-dir', source]); expect(result.code, result.stderr).toBe(0); return JSON.parse(result.stdout);
  }
  it('BKCLI01: explicit offline, empty paths and Commander required/unknown options preserve bounded errors', async () => {
    const missingOffline = await cli(['backup', '--data-dir', path.join(root, 'source'), '--output', path.join(root, 'backup')]);
    expect(missingOffline.code).toBe(2); expect(JSON.parse(missingOffline.stdout).error.code).toBe('OFFLINE_REQUIRED');
    expect((await cli(['backup', '--offline', '--data-dir', '', '--output', path.join(root, 'backup')])).code).toBe(2);
    expect((await cli(['restore', '--backup', '', '--data-dir', path.join(root, 'new')])).code).toBe(2);
    expect((await cli(['backup', '--offline'])).code).toBe(2);
    expect((await cli(['restore', '--offline', '--backup', 'b', '--data-dir', 'd'])).code).toBe(2);
    expect(await readdir(root)).toEqual([]);
  }, 30_000);
  it('BKCLI02: offline backup and fresh restore output one human recovery credential without network config', async () => {
    const source = path.join(root, 'nested', 'source'), backup = path.join(root, 'backup'), restored = path.join(root, 'restored');
    const initial = await init(source);
    const saved = await cli(['backup', '--offline', '--data-dir', source, '--output', backup]);
    expect(saved.code, saved.stdout + saved.stderr).toBe(0); const summary = JSON.parse(saved.stdout);
    expect(summary).toMatchObject({ backup_dir: path.join(await realpath(root), 'backup'), version: 1, schema_version: 5, artifact_count: 0 }); expect(summary).not.toHaveProperty('admin_token');
    const manifestBytes = await readFile(path.join(backup, 'backup-manifest.json'));
    const recovery = await cli(['restore', '--backup', backup, '--data-dir', restored]); expect(recovery.code, recovery.stdout + recovery.stderr).toBe(0);
    const credentials = JSON.parse(recovery.stdout); expect(Object.keys(credentials).sort()).toEqual(['admin_actor_id', 'admin_token', 'data_dir']);
    expect(credentials.data_dir).toBe(path.join(await realpath(root), 'restored')); expect(credentials.admin_actor_id).not.toBe(initial.admin_actor_id); expect(credentials.admin_token).not.toBe(initial.admin_token);
    expect(recovery.stderr).toBe(''); expect(recovery.stdout.split(credentials.admin_token)).toHaveLength(2);
    expect(await readFile(path.join(backup, 'backup-manifest.json'))).toEqual(manifestBytes);
    expect(manifestBytes.toString()).not.toContain(credentials.admin_token);
    const again = await cli(['init', '--data-dir', restored]); expect(again.code).toBe(0); expect(JSON.parse(again.stdout).admin_token).toBeNull();
    const overwrite = await cli(['restore', '--backup', backup, '--data-dir', restored]); expect(overwrite.code).toBe(1); expect(JSON.parse(overwrite.stdout).error.code).toBe('DESTINATION_EXISTS'); expect(overwrite.stdout).not.toContain(credentials.admin_token);
  }, 30_000);
  it('BKCLI03: active real serve holds the source lock and backup refuses', async () => {
    const source = path.join(root, 'source'); await init(source);
    const child = launch(['serve', '--data-dir', source, '--port', '0']);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('serve readiness deadline exceeded')), 10_000);
      child.stderr.on('data', s => { if (s.includes('Detuned 服务已启动')) { clearTimeout(timer); resolve(); } });
      child.once('error', e => { clearTimeout(timer); reject(e); }); child.once('exit', code => { clearTimeout(timer); reject(new Error('serve early exit ' + code)); });
    });
    const backup = path.join(root, 'backup'); const result = await cli(['backup', '--offline', '--data-dir', source, '--output', backup]);
    expect(result.code).toBe(1); expect(await readdir(root)).not.toContain('backup');
    const closed = new Promise(resolve => child.once('close', resolve)); child.kill('SIGTERM'); await closed;
  }, 30_000);
  it('BKCLI04: backup manifest marker refuses init/serve before opening or creating a database', async () => {
    const physical = path.join(root, 'physical'); await import('node:fs/promises').then(fs => fs.mkdir(physical));
    await writeFile(path.join(physical, 'backup-manifest.json'), 'not even a valid manifest');
    for (const command of ['init', 'serve']) {
      const result = await cli([command, '--data-dir', physical]); expect(result.code).toBe(1); expect(result.stdout).not.toContain('admin_token');
      expect(await readdir(physical)).toEqual(['backup-manifest.json']);
    }
    const legacy = path.join(root, 'legacy'); await init(legacy); expect((await cli(['init', '--data-dir', legacy])).code).toBe(0);
  }, 30_000);
  it('BKCLI05: a canonical parent reservation rejects both init and serve without creating the target', async () => {
    const target = path.join(await realpath(root), 'incomplete');
    const marker = path.join(root, `.detuned-incomplete-${createHash('sha256').update(target).digest('hex')}`);
    await writeFile(marker, 'reserved');
    for (const command of ['init', 'serve']) {
      const result = await cli([command, '--data-dir', target]); expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout).error.code).toBe('INCOMPLETE_DIRECTORY');
      expect(await readdir(root)).toEqual([path.basename(marker)]);
    }
    expect(await readFile(marker, 'utf8')).toBe('reserved');
  }, 30_000);

});
