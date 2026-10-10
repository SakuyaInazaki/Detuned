import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';

// Uses the real built package entry point. The parent performs the shared build.
describe('M3.2 CLI persistent request keys', () => {
  let directory: string, db: Database.Database, app: ReturnType<typeof buildApp>;
  let token: string, baseUrl: string, sid: string;
  let writes: number;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'detuned-cli-keys-'));
    db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!;
    app = buildApp({ storage: new SqliteStorage(db) }); writes = 0;
    app.addHook('onRequest', (req, _reply, done) => { if (req.method !== 'GET') writes++; done(); });
    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
    sid = (await new DetunedClient({ baseUrl, token }).createSpace({ slug: 'cli-keys', objective: 'recovery', rules: [] }, 'space')).data.space.id;
    writes = 0;
  });
  afterEach(async () => { await app?.close(); db?.close(); await rm(directory, { recursive: true, force: true }); });
  async function cli(command: string, op: string, input: unknown, flags: string[] = []) {
    const file = path.join(directory, 'input.json'); await writeFile(file, JSON.stringify(input));
    return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ['packages/cli/dist/index.js', '--url', baseUrl, '--token', token, '--json', command, '--space', sid, '--op', op, '--input', file, ...flags], { cwd: process.cwd(), env: { ...process.env, DETUNED_TOKEN: '', DETUNED_TOKEN_FILE: '' } });
      const deadline = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('CLI process exceeded 10s deadline')); }, 10_000);
      let stdout = '', stderr = ''; child.stdout.on('data', b => { stdout += b; }); child.stderr.on('data', b => { stderr += b; });
      child.on('error', error => { clearTimeout(deadline); reject(error); }); child.on('close', code => { clearTimeout(deadline); resolve({ code, stdout, stderr }); });
    });
  }
  const persistent = (id: string) => ['--request-key-dir', path.join(directory, 'keys'), '--logical-operation-id', id];
  async function ok(command: string, op: string, input: unknown, flags: string[]) {
    const result = await cli(command, op, input, flags); expect(result.code, result.stdout + result.stderr).toBe(0); return JSON.parse(result.stdout);
  }
  it('KCLI01: new processes replay a thread, retain keys on success and permit identical intentional writes', async () => {
    const first = await ok('publish', 'thread', { title: 'same content' }, persistent('first'));
    const replay = await ok('publish', 'thread', { title: 'same content' }, persistent('first'));
    const second = await ok('publish', 'thread', { title: 'same content' }, persistent('second'));
    expect(replay.thread.id).toBe(first.thread.id); expect(second.thread.id).not.toBe(first.thread.id);
    const conflict = await cli('publish', 'thread', { title: 'changed' }, persistent('first'));
    expect(conflict.code).toBe(4); expect(JSON.parse(conflict.stdout).error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect((await ok('publish', 'thread', { title: 'same content' }, persistent('first'))).thread.id).toBe(first.thread.id);
  });
  it('KCLI02: all publish and relate branches use persistent keys with data-only compatible output', async () => {
    const thread = await ok('publish', 'thread', { title: 'thread' }, persistent('thread'));
    const input = { thread_id: thread.thread.id, kind: 'note', title: 'post', summary: 'summary', body: 'body' };
    const post = await ok('publish', 'post', input, persistent('post'));
    expect((await ok('publish', 'post', input, persistent('post'))).post.id).toBe(post.post.id);
    const revised = { post_id: post.post.id, expected_revision: 1, title: 'revision', summary: 's', body: 'b' };
    await ok('publish', 'revision', revised, persistent('revision')); await ok('publish', 'revision', revised, persistent('revision'));
    const other = await ok('publish', 'post', input, persistent('other-post'));
    const relationInput = { type: 'challenges', source_ref: { post_id: other.post.id, revision: 1 }, target_ref: { post_id: post.post.id, revision: 2 } };
    const relation = await ok('relate', 'create', relationInput, persistent('relation'));
    expect((await ok('relate', 'create', relationInput, persistent('relation'))).id).toBe(relation.id);
    const reason_ref = { post_id: post.post.id, revision: 2 };
    await ok('relate', 'resolve', { relation_id: relation.id, expected_version: 1, reason_ref }, persistent('resolve'));
    await ok('relate', 'resolve', { relation_id: relation.id, expected_version: 1, reason_ref }, persistent('resolve'));
    await ok('relate', 'reopen', { relation_id: relation.id, expected_version: 2, reason_ref }, persistent('reopen'));
    await ok('relate', 'reopen', { relation_id: relation.id, expected_version: 2, reason_ref }, persistent('reopen'));
    await ok('publish', 'withdraw', { post_id: other.post.id, expected_revision: 1, reason: 'withdraw' }, persistent('withdraw'));
    await ok('publish', 'withdraw', { post_id: other.post.id, expected_revision: 1, reason: 'withdraw' }, persistent('withdraw'));
    expect(thread).not.toHaveProperty('api_version');
  }, 30_000);
  it('KCLI03: pairs, size and every explicit key conflict reject with exit 2 before business requests', async () => {
    const cases = [
      [{ title: 't' }, ['--request-key-dir', path.join(directory, 'keys')]],
      [{ title: 't' }, ['--logical-operation-id', 'id']],
      [{ title: 't' }, ['--request-key-dir', '', '--logical-operation-id', 'id']],
      [{ title: 't' }, persistent(' ')], [{ title: 't' }, persistent('🙂'.repeat(129))],
      [{ title: 't' }, [...persistent('id'), '--request-key', 'explicit']],
      [{ title: 't', request_key: null }, persistent('id')], [{ title: 't', request_key: '' }, persistent('id')],
    ] as const;
    for (const [input, flags] of cases) {
      for (const command of ['publish', 'relate']) {
        const result = await cli(command, command === 'publish' ? 'thread' : 'create', input, [...flags]);
        expect(result.code, result.stdout + result.stderr).toBe(2); expect(JSON.parse(result.stdout).error.code).toBe('VALIDATION_ERROR');
      }
    }
    expect(writes).toBe(0); expect(await readdir(directory)).toEqual(['input.json']);
  }, 30_000);
  it('KCLI04: old explicit keys preserve precedence and no optional store is created', async () => {
    const first = await ok('publish', 'thread', { title: 'old', request_key: 'input-key' }, ['--request-key', 'flag-key']);
    expect((await ok('publish', 'thread', { title: 'old' }, ['--request-key', 'flag-key'])).thread.id).toBe(first.thread.id);
    const inputOnly = await ok('publish', 'thread', { title: 'input', request_key: 'input-only' }, []);
    expect((await ok('publish', 'thread', { title: 'input', request_key: 'input-only' }, [])).thread.id).toBe(inputOnly.thread.id);
    expect(await readdir(directory)).toEqual(['input.json']);
  });
  it('KCLI05: rejected persistence sends no business request and does not overwrite existing material', async () => {
    const blocked = path.join(directory, 'blocked'); await writeFile(blocked, 'original material');
    const result = await cli('publish', 'thread', { title: 'unsent' }, ['--request-key-dir', blocked, '--logical-operation-id', 'unsent']);
    expect(result.code).toBe(1); expect(writes).toBe(0); expect(await readFile(blocked, 'utf8')).toBe('original material');
  });
});
