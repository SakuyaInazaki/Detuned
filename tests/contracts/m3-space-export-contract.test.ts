import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { SPACE_EXPORT_HASH_VECTOR, validateSpaceExportLine, generateOpenApiSpec, EXPORT_LIMITS } from '@detuned/protocol';
import { DetunedClient, ClientProtocolError, UserAbortError, TimeoutError } from '@detuned/client';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
const encoder = new TextEncoder();
const vector = () => [...SPACE_EXPORT_HASH_VECTOR.lines, JSON.stringify({ type: 'end', complete: true, record_count: 1, bytes_before_end: SPACE_EXPORT_HASH_VECTOR.bytes_before_end, chain_sha256: SPACE_EXPORT_HASH_VECTOR.chain_sha256 }) + '\n'].join('');
function response(text: string, oneByte = false) {
  const bytes = encoder.encode(text);
  return new Response(new ReadableStream({ start(controller) { if (oneByte) for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); else controller.enqueue(bytes); controller.close(); } }), { headers: { 'content-type': 'application/x-ndjson; charset=utf-8' } });
}
afterEach(() => vi.unstubAllGlobals());
describe('M3.3-B.1 strict NDJSON export transport', () => {
  it('EXB01: fixed public raw32 hash vector matches Node and WebCrypto with UTF-8 LF', async () => {
    let node = Buffer.alloc(32), browser = new Uint8Array(32);
    for (const line of SPACE_EXPORT_HASH_VECTOR.lines) {
      expect(validateSpaceExportLine(JSON.parse(line))).toBe(true);
      node = createHash('sha256').update(node).update(line).digest();
      const bytes = encoder.encode(line), joined = new Uint8Array(32 + bytes.length); joined.set(browser); joined.set(bytes, 32);
      browser = new Uint8Array(await crypto.subtle.digest('SHA-256', joined));
    }
    expect(node.toString('hex')).toBe(SPACE_EXPORT_HASH_VECTOR.chain_sha256); expect(Buffer.from(browser).toString('hex')).toBe(node.toString('hex'));
    expect(generateOpenApiSpec()).toHaveProperty('paths./spaces/{space_id}/export');
  });
  it('EXB02: one-byte UTF-8 chunks yield provisional exact lines and resolve only with terminal proof plus EOF', async () => {
    const fetch = vi.fn(async () => response(vector(), true)); vi.stubGlobal('fetch', fetch);
    const output: Uint8Array[] = []; const result = await new DetunedClient({ baseUrl: 'http://export.test', token: 'fixture-not-a-real-token' }).exportSpace('space-vector', { sink: line => { output.push(line); } });
    expect(Buffer.concat(output).toString()).toBe(vector()); expect(result.end.record_count).toBe(1); expect(result.bytes).toBe(Buffer.byteLength(vector())); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('EXB03: missing/extra terminal, repeated seq, CRLF, empty line, bad hash, malformed header and invalid UTF-8 reject without retry', async () => {
    const original = vector();
    const cases = [SPACE_EXPORT_HASH_VECTOR.lines.join(''), original + '\n', original.replace('"seq":1', '"seq":2'), original.replace(/\n/g, '\r\n'), '\n' + original, original.replace(SPACE_EXPORT_HASH_VECTOR.chain_sha256, '0'.repeat(64)), original.replace('"scope":"public_research"', '"scope":"all"'), original.slice(0, -1)];
    for (const malformed of cases) {
      const fetch = vi.fn(async () => response(malformed)); vi.stubGlobal('fetch', fetch);
      await expect(new DetunedClient({ baseUrl: 'http://export.test', maxRetries: 3 }).exportSpace('space-vector', { sink: () => {} })).rejects.toBeInstanceOf(ClientProtocolError); expect(fetch).toHaveBeenCalledTimes(1);
    }
    vi.stubGlobal('fetch', async () => new Response(Uint8Array.of(255, 10), { headers: { 'content-type': 'application/x-ndjson; charset=utf-8' } }));
    await expect(new DetunedClient({ baseUrl: 'http://export.test' }).exportSpace('space-vector', { sink: () => {} })).rejects.toBeInstanceOf(ClientProtocolError);
  });
  it('EXB04: cancellation and timeout promptly settle while a sink stays pending, observing later rejection', async () => {
    for (const cancel of [false, true]) {
      vi.stubGlobal('fetch', async () => response(vector())); let entered!: () => void, rejectSink!: (error: Error) => void;
      const ready = new Promise<void>(resolve => { entered = resolve; }); const sink = new Promise<void>((_resolve, reject) => { rejectSink = reject; }); const abort = new AbortController();
      const request = new DetunedClient({ baseUrl: 'http://export.test' }).exportSpace('space-vector', { timeoutMs: cancel ? 1000 : 30, signal: abort.signal, sink: () => { entered(); return sink; } });
      const rejected = expect(request).rejects.toBeInstanceOf(cancel ? UserAbortError : TimeoutError); await ready; if (cancel) abort.abort(); await rejected; rejectSink(new Error('late fixture sink rejection')); await Promise.resolve();
    }
  });
  it('EXB05: oversized line and successful JSON responses are protocol errors', async () => {
    for (const result of [response('x'.repeat(EXPORT_LIMITS.max_line_bytes + 1)), new Response('{}', { headers: { 'content-type': 'application/json' } })]) {
      vi.stubGlobal('fetch', async () => result); await expect(new DetunedClient({ baseUrl: 'http://export.test' }).exportSpace('space-vector', { sink: () => {} })).rejects.toBeInstanceOf(ClientProtocolError);
    }
  });
  it('EXB06: real file-backed HTTP and built CLI export complete private file; invalid query and existing targets reject', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'detuned-export-cli-')); const db = new Database(path.join(root, 'db.sqlite')); const token = bootstrapDatabase(db).adminToken!; const app = buildApp({ storage: new SqliteStorage(db) });
    try {
      const url = await app.listen({ host: '127.0.0.1', port: 0 }); const client = new DetunedClient({ baseUrl: url, token }); const sid = (await client.createSpace({ slug: 'export', objective: '中文🙂', rules: [] }, 'space')).data.space.id;
      for (const query of ['format=', 'format=json', 'format=ndjson&format=ndjson', 'unknown=1']) expect((await app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/export?${query}`, headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(400);
      const lines: Uint8Array[] = []; const result = await client.exportSpace(sid, { sink: line => { lines.push(line); } }); expect(result.header.formal_review_status).toBe('excluded'); expect(result.end.record_count).toBeGreaterThan(0);
      const output = path.join(root, 'export.ndjson');
      const run = () => new Promise<{ code: number | null; out: string }>((resolve, reject) => {
        const child = spawn(process.execPath, ['packages/cli/dist/index.js', '--url', url, '--token', token, '--json', 'export', '--space', sid, '--output', output]); child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); let out = ''; const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('CLI deadline exceeded')); }, 15_000);
        child.stdout.on('data', text => { out += text; }); child.once('error', error => { clearTimeout(timer); reject(error); }); child.once('close', code => { clearTimeout(timer); resolve({ code, out }); });
      });
      const first = await run(); expect(first.code, first.out).toBe(0); const bytes = await readFile(output); const summary = JSON.parse(first.out); expect(summary.bytes).toBe(bytes.length); expect(first.out).not.toContain('public_research'); expect((await stat(output)).mode & 0o777).toBe(0o600);
      expect((await run()).code).toBe(1); expect(await readFile(output)).toEqual(bytes); expect((await readdir(root)).some(file => file.startsWith('.detuned-export-'))).toBe(false);
    } finally { await app.close(); db.close(); await rm(root, { recursive: true, force: true }); }
  }, 30_000);
});
