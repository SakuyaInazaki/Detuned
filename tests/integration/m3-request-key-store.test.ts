import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, readdir, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DetunedClient, RequestKeyError, normalizeServerNamespace } from '../../packages/client/src/index.js';
import { FileRequestKeyStore } from '../../packages/client/src/node.js';
const roots: string[] = [];
afterEach(async () => { vi.unstubAllGlobals(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const scope = { serverNamespace: 'https://example.test', actorId: 'actor', spaceId: 'space', operation: 'post.create', target: 'thread' };
async function store() { const root = await mkdtemp(path.join(os.tmpdir(), 'detuned-key-')); roots.push(root); return { root, store: await FileRequestKeyStore.create(root) }; }
describe('optional persistent request keys', () => {
  it('recovers a published key across independent store objects and concurrent contenders', async () => {
    const a = await store(); const b = await FileRequestKeyStore.create(a.root);
    const keys = await Promise.all(Array.from({ length: 24 }, (_, n) => (n % 2 ? a.store : b).getOrCreate(scope, 'logical')));
    expect(new Set(keys).size).toBe(1);
    expect(await b.getOrCreate(scope, 'logical')).toBe(keys[0]);
    expect(await b.getOrCreate(scope, 'independent')).not.toBe(keys[0]);
    expect(await b.getOrCreate({ ...scope, actorId: 'other' }, 'logical')).not.toBe(keys[0]);
    expect((await readdir(a.root)).filter(n => n.startsWith('.tmp'))).toEqual([]);
  });
  it('rejects corruption without overwriting it or allocating a replacement', async () => {
    const a = await store(); await a.store.getOrCreate(scope, 'logical');
    const file = path.join(a.root, (await readdir(a.root))[0]!);
    await writeFile(file, '{broken');
    await expect(a.store.getOrCreate(scope, 'logical')).rejects.toMatchObject({ code: 'STORE_ERROR' });
    expect(await readFile(file, 'utf8')).toBe('{broken');
  });
  it('rejects insecure existing directory and record permissions', async () => {
    const a = await store(); await a.store.getOrCreate(scope, 'logical');
    await chmod(path.join(a.root, (await readdir(a.root))[0]!), 0o644);
    await expect(a.store.getOrCreate(scope, 'logical')).rejects.toMatchObject({ code: 'STORE_ERROR' });
    await chmod(a.root, 0o755);
    await expect(FileRequestKeyStore.create(a.root)).rejects.toMatchObject({ code: 'STORE_ERROR' });
  });
  it('normalizes only safe service namespaces and preserves deployment path', () => {
    expect(normalizeServerNamespace('HTTPS://EXAMPLE.TEST:443/Deploy///')).toBe('https://example.test/Deploy');
    for (const url of ['https://user:secret@example.test', 'https://example.test?token=x', 'https://example.test#x', 'file:///x']) expect(() => normalizeServerNamespace(url)).toThrow(RequestKeyError);
  });
  it('obtains authenticated identity and persistent key before business POST', async () => {
    const seen: string[] = [];
    const a = await store();
    vi.stubGlobal('fetch', vi.fn(async (url: string, opts: RequestInit) => {
      seen.push(String(url));
      if (String(url).endsWith('/me')) return new Response(JSON.stringify({ api_version: '1', request_id: 'me', data: { actor: { id: 'actor' } } }));
      expect((opts.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^rk_/);
      expect((await readdir(a.root)).filter(n => n.endsWith('.json'))).toHaveLength(1);
      return new Response(JSON.stringify({ api_version: '1', request_id: 'write', data: { id: 'post' } }));
    }));
    const client = new DetunedClient({ baseUrl: scope.serverNamespace, token: 'secret', requestKeyStore: a.store });
    await client.createPost('space', 'thread', { kind: 'note', body: 'secret正文' } as any, undefined, { logicalOperationId: 'logical' });
    expect(seen).toEqual(['https://example.test/api/v1/me', 'https://example.test/api/v1/spaces/space/threads/thread/posts']);
    const record = await readFile(path.join(a.root, (await readdir(a.root))[0]!), 'utf8');
    expect(record).not.toContain('secret');
  });
  it('rejects explicit-key conflict, missing store and failed store before POST', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ api_version: '1', request_id: 'me', data: { actor: { id: 'actor' } } })));
    vi.stubGlobal('fetch', fetch);
    const client = new DetunedClient({ baseUrl: scope.serverNamespace });
    await expect(client.createThread('space', { title: 'x' }, '', { logicalOperationId: '' })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
    expect(fetch).not.toHaveBeenCalled();
    const failing = new DetunedClient({ baseUrl: scope.serverNamespace, requestKeyStore: { async getOrCreate() { throw new RequestKeyError('STORE_ERROR', 'unwritable'); } } });
    await expect(failing.createThread('space', { title: 'x' }, undefined, { logicalOperationId: 'id' })).rejects.toMatchObject({ code: 'STORE_ERROR' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects a credential change during store preparation and does not POST', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ api_version: '1', request_id: 'me', data: { actor: { id: 'actor' } } })));
    vi.stubGlobal('fetch', fetch);
    const client = new DetunedClient({ baseUrl: scope.serverNamespace, token: 'A', requestKeyStore: { async getOrCreate() { client.setToken('B'); return 'rk_key'; } } });
    await expect(client.createThread('space', { title: 'x' }, undefined, { logicalOperationId: 'id' })).rejects.toMatchObject({ code: 'IDENTITY_CHANGED' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('cancels promptly while a store is pending and never POSTs after it completes', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ api_version: '1', request_id: 'me', data: { actor: { id: 'actor' } } })));
    vi.stubGlobal('fetch', fetch);
    let enter!: () => void; const entered = new Promise<void>(resolve => { enter = resolve; });
    let finish!: (key: string) => void; const pending = new Promise<string>(resolve => { finish = resolve; });
    const client = new DetunedClient({ baseUrl: scope.serverNamespace, requestKeyStore: { getOrCreate() { enter(); return pending; } } });
    const abort = new AbortController();
    const result = client.createThread('space', { title: 'x' }, undefined, { logicalOperationId: 'id', signal: abort.signal });
    await entered; abort.abort();
    await expect(result).rejects.toMatchObject({ name: 'UserAbortError' });
    finish('rk_late'); await pending;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

});
