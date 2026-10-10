import { afterEach, describe, expect, it, vi } from 'vitest';
import { isArtifactMetadata } from '@detuned/protocol';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { ArtifactFileStore, buildApp } from '@detuned/server';
import { DetunedClient, type RequestKeyScope } from '../../packages/client/src/index.js';
const digest = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const data = new Uint8Array([0, 255, 13, 10, 128]);
const metadata = (bytes = data, extras = {}) => ({ id: 'artifact', space_id: 'space', owner_id: 'actor', visibility: 'space', sha256: digest(bytes), bytes: bytes.length, mime: 'application/octet-stream', state: 'ready', created_at: '2026-10-08T00:00:00.000Z', content_url: 'https://untrusted.invalid/never-fetch', ...extras });
const json = (value: unknown, status = 200) => new Response(JSON.stringify({ api_version: '1', request_id: 'test', data: value }), { status, headers: { 'content-type': 'application/json' } });
const content = (bytes = data, headers = {}) => new Response(bytes, { headers: { 'content-length': String(bytes.length), 'content-type': 'application/octet-stream', ...headers } });
const client = (options = {}) => new DetunedClient({ baseUrl: 'https://forum.test', maxRetries: 0, ...options });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('M4.1-B bounded artifact shared client', () => {
  it('real HTTP multipart binary/zero, replay, changed content409 and verified download', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'detuned-client-artifact-'));
    const db = new Database(':memory:'); const token = bootstrapDatabase(db).adminToken!;
    const app = buildApp({ storage: new SqliteStorage(db), artifactBlobs: await ArtifactFileStore.create(root) });
    try {
      const baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
      const c = new DetunedClient({ baseUrl, token, maxRetries: 0 });
      const space = (await c.createSpace({ slug: 'binary', objective: 'test', rules: [] }, 'space')).data.space.id;
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const first = await c.uploadArtifact(space, blob, {}, 'binary');
      expect(first.sha256).toBe(digest(data)); expect(first.bytes).toBe(data.length);
      expect(await c.uploadArtifact(space, blob, {}, 'binary')).toEqual(first);
      await expect(c.uploadArtifact(space, new Blob(['changed']), {}, 'binary')).rejects.toMatchObject({ statusCode: 409 });
      await expect(c.uploadArtifact(space, new Blob([data], { type: 'text/plain' }), {}, 'binary')).rejects.toMatchObject({ statusCode: 409 });
      expect(await c.getArtifact(space, first.id)).toEqual(first);
      expect((await c.downloadArtifact(space, first.id)).bytes).toEqual(data);
      const zero = await c.uploadArtifact(space, new Blob([]), {}, 'zero');
      expect(zero.bytes).toBe(0); expect((await c.downloadArtifact(space, zero.id)).bytes).toEqual(new Uint8Array());
      expect((db.prepare('SELECT count(*) AS n FROM artifacts').get() as any).n).toBe(2);
    } finally { await app.close(); db.close(); await rm(root, { recursive: true, force: true }); }
  });

  it('persistent artifact scope reuses logicalID while separating actor/space, and observes token/store cancellation', async () => {
    const tuples: RequestKeyScope[] = []; const keys = new Map<string, string>();
    const store = { async getOrCreate(scope: RequestKeyScope, id: string) { tuples.push(scope); const tuple = JSON.stringify([scope, id]); if (!keys.has(tuple)) keys.set(tuple, `rk_${keys.size}`); return keys.get(tuple)!; } };
    const posted: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      const actor = (init.headers as any).Authorization === 'Bearer B' ? 'B' : 'A';
      if (url.endsWith('/me')) return json({ actor: { id: actor } });
      posted.push((init.headers as any)['Idempotency-Key']);
      return json(metadata(data, { space_id: url.includes('/other/') ? 'other' : 'space' }), 201);
    }));
    const c = client({ token: 'A', requestKeyStore: store });
    const blob = new Blob([data]); const opts = { logicalOperationId: 'same' };
    await c.uploadArtifact('space', blob, {}, undefined, opts); await c.uploadArtifact('space', blob, {}, undefined, opts);
    c.setToken('B'); await c.uploadArtifact('space', blob, {}, undefined, opts); await c.uploadArtifact('other', blob, {}, undefined, opts);
    expect(posted).toEqual(['rk_0', 'rk_0', 'rk_1', 'rk_2']); expect(tuples[0]).toMatchObject({ operation: 'artifact.create', target: null, actorId: 'A' });
    await expect(c.uploadArtifact('space', blob, {}, '', opts)).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
    const changed = client({ token: 'A', requestKeyStore: { async getOrCreate() { changed.setToken('B'); return 'key'; } } });
    await expect(changed.uploadArtifact('space', blob, {}, undefined, opts)).rejects.toMatchObject({ code: 'IDENTITY_CHANGED' });
    let enter!: () => void; const entered = new Promise<void>(r => enter = r); let release!: (s: string) => void; const pending = new Promise<string>(r => release = r);
    const cancel = client({ requestKeyStore: { getOrCreate() { enter(); return pending; } } }); const abort = new AbortController();
    const operation = cancel.uploadArtifact('space', blob, {}, undefined, { ...opts, signal: abort.signal });
    await entered; abort.abort(); await expect(operation).rejects.toMatchObject({ name: 'UserAbortError' }); release('late'); await pending;
    expect(posted).toHaveLength(4);
  });

  it('retries using fresh FormData with immutable bytes/same key, never retries complete507', async () => {
    const forms: FormData[] = []; const seenKeys: string[] = []; let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const form = init.body as FormData; forms.push(form); seenKeys.push((init.headers as any)['Idempotency-Key']);
      expect((init.headers as any)['Content-Type']).toBeUndefined(); expect(await (form.get('file') as Blob).arrayBuffer()).toEqual(data.buffer);
      expect((form.get('file') as File).name).toBe('upload.bin');
      if (++calls === 1) return new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'limited', retryable: true } }), { status: 429, headers: { 'retry-after': '0' } });
      return json(metadata(), 201);
    }));
    await client({ maxRetries: 2 }).uploadArtifact('space', new Blob([data]), {}, 'key');
    expect(forms).toHaveLength(2); expect(forms[0]).not.toBe(forms[1]); expect(seenKeys).toEqual(['key', 'key']);
    const full = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'full', retryable: false } }), { status: 507 })); vi.stubGlobal('fetch', full);
    await expect(client({ maxRetries: 3 }).uploadArtifact('space', new Blob([data]), {}, 'key')).rejects.toMatchObject({ statusCode: 507, retryable: false }); expect(full).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed schema/headers, extra or truncated EOF and wrong hash without partial bytes', async () => {
    const cases = [() => content(data, { 'content-length': '05' }), () => content(data, { 'content-type': 'text/plain' }), () => content(data.slice(0, 2), { 'content-length': '5' }), () => content(new Uint8Array(6), { 'content-length': '5' }), () => content(new Uint8Array(5))];
    for (const make of cases) {
      const urls: string[] = [];
      vi.stubGlobal('fetch', vi.fn(async (url: string) => { urls.push(url); return url.endsWith('/content') ? make() : json(metadata()); }));
      await expect(client().downloadArtifact('space', 'artifact')).rejects.toMatchObject({ name: 'ClientProtocolError' });
      expect(urls[1]).toBe('https://forum.test/api/v1/spaces/space/artifacts/artifact/content');
    }
    vi.stubGlobal('fetch', vi.fn(async () => json(metadata(data, { sha256: 'G'.repeat(64) }))));
    await expect(client().getArtifact('space', 'artifact')).rejects.toMatchObject({ name: 'ClientProtocolError' });
    vi.stubGlobal('fetch', vi.fn(async () => json(metadata(data, { space_id: 'other' }))));
    await expect(client().uploadArtifact('space', new Blob([data]), {}, 'key')).rejects.toMatchObject({ name: 'ClientProtocolError' });
  });

  it('download cancellation releases pending reader and totaldeadline begins before metadata', async () => {
    const cancel = vi.fn(); let entered!: () => void; const reading = new Promise<void>(r => entered = r);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/content') ? new Response(new ReadableStream({ pull() { entered(); return new Promise(() => {}); }, cancel }), { headers: { 'content-length': '5', 'content-type': 'application/octet-stream' } }) : json(metadata())));
    const abort = new AbortController(); const result = client().downloadArtifact('space', 'artifact', { signal: abort.signal }); void result.catch(() => {});
    await reading; abort.abort(); await expect(result).rejects.toMatchObject({ name: 'UserAbortError' }); expect(cancel).toHaveBeenCalledTimes(1);
    vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const timed = client({ timeoutMs: 100 }).downloadArtifact('space', 'artifact'); const assertion = expect(timed).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(100); await assertion;
  });

  it('late content response and upload fetch abort/timeout are observed and cleaned', async () => {
    let enter!: () => void; const entered = new Promise<void>(r => enter = r); let finish!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('/content') ? new Promise<Response>(r => { finish = r; enter(); }) : Promise.resolve(json(metadata()))));
    const abort = new AbortController(); const result = client().downloadArtifact('space', 'artifact', { signal: abort.signal }); void result.catch(() => {});
    await entered; abort.abort(); await expect(result).rejects.toMatchObject({ name: 'UserAbortError' });
    const cancel = vi.fn(); finish(new Response(new ReadableStream({ cancel }))); await Promise.resolve(); await Promise.resolve(); expect(cancel).toHaveBeenCalledTimes(1);
    let uploadEnter!: () => void; const uploadEntered = new Promise<void>(r => uploadEnter = r);
    vi.stubGlobal('fetch', vi.fn(() => { uploadEnter(); return new Promise(() => {}); }));
    const user = new AbortController(); const upload = client().uploadArtifact('space', new Blob([data]), {}, 'key', { signal: user.signal });
    await uploadEntered; user.abort(); await expect(upload).rejects.toMatchObject({ name: 'UserAbortError' });
    vi.useFakeTimers(); let nextEnter!: () => void; const nextEntered = new Promise<void>(r => nextEnter = r);
    vi.stubGlobal('fetch', vi.fn(() => { nextEnter(); return new Promise(() => {}); }));
    const timeout = client({ timeoutMs: 100 }).uploadArtifact('space', new Blob([data]), {}, 'key'); const assertion = expect(timeout).rejects.toMatchObject({ name: 'TimeoutError' });
    await nextEntered; await vi.advanceTimersByTimeAsync(100); await assertion;
  });
  it('validates full RFC3339 using the locked validator while retaining every schema field', () => {
    for (const created_at of ['2026-10-08T08:00:00+08:00', '2026-10-08t00:00:00z', '2016-12-31T23:59:60Z', '0096-02-29T00:00:00Z']) expect(isArtifactMetadata(metadata(data, { created_at }))).toBe(true);
    for (const created_at of ['2026-10-08T00:00:00', '2026-02-30T00:00:00Z', '0097-02-29T00:00:00Z']) expect(isArtifactMetadata(metadata(data, { created_at }))).toBe(false);
    expect(isArtifactMetadata(metadata(data, { bytes: 26214401 }))).toBe(false);
    expect(isArtifactMetadata(metadata(data, { storage_key: 'private' }))).toBe(false);
  });

  it('cancels real pending artifact JSON readers and rejects response-cap violations safely', async () => {
    for (const operation of ['upload', 'metadata'] as const) {
      let enter!: () => void; const entered = new Promise<void>(r => enter = r); const cancel = vi.fn();
      vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({ pull() { enter(); return new Promise(() => {}); }, cancel }))));
      const abort = new AbortController(); const c = client();
      const pending = operation === 'upload' ? c.uploadArtifact('space', new Blob([data]), {}, 'key', { signal: abort.signal }) : c.getArtifact('space', 'artifact', { signal: abort.signal });
      void pending.catch(() => {}); await entered; abort.abort();
      await expect(pending).rejects.toMatchObject({ name: 'UserAbortError' }); expect(cancel).toHaveBeenCalledTimes(1);
    }
    const cancel = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1048577)); }, cancel }))));
    await expect(client().getArtifact('space', 'artifact')).rejects.toMatchObject({ name: 'ClientProtocolError' }); expect(cancel).toHaveBeenCalledTimes(1);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(1048577), { status: 507 })));
    await expect(client().uploadArtifact('space', new Blob([data]), {}, 'key')).rejects.toMatchObject({ name: 'ClientProtocolError' });
  });

});
