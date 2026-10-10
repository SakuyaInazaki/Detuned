import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, stat, symlink, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getEventListeners } from 'node:events';
import type { BlobReadHandle } from '@detuned/core';
import { ArtifactFileStore } from '@detuned/server';

async function* chunks(...values: Uint8Array[]) { yield* values; }
async function bytes(handle: BlobReadHandle | null) {
  if (!handle) return null;
  const result: Buffer[] = [];
  try { for await (const chunk of handle.chunks) result.push(Buffer.from(chunk)); }
  finally { await handle.dispose(); }
  return Buffer.concat(result);
}

describe('M2.1 real artifact filesystem', () => {
  let root: string;
  let store: ArtifactFileStore;
  const staging = () => path.join(root, 'artifacts/staging');
  const objects = () => path.join(root, 'artifacts/objects');
  beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'detuned-artifacts-fs-')); store = await ArtifactFileStore.create(root); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('streams incrementally, hashes exactly, uses 0600, publishes without deduplication and reads zero bytes', async () => {
    const data = Buffer.from('分块\0content');
    const staged = await store.stage(chunks(data.subarray(0, 4), data.subarray(4)), 100);
    expect(staged.sha256).toBe(createHash('sha256').update(data).digest('hex'));
    expect(staged.bytes).toBe(data.length);
    expect((await stat(path.join(staging(), staged.stage_key))).mode & 0o777).toBe(0o600);
    await store.publish(staged, 'object_one');
    expect(await readdir(staging())).toEqual([]);
    expect(await bytes(await store.open('object_one'))).toEqual(data);
    const duplicate = await store.stage(chunks(data), 100);
    await store.publish(duplicate, 'object_two');
    expect((await readdir(objects())).length).toBe(2);
    const empty = await store.stage(chunks(), 1);
    await store.publish(empty, 'empty');
    expect(await bytes(await store.open('empty'))).toEqual(Buffer.alloc(0));
    expect(await store.exists('absent')).toBe(false);
    expect(await store.open('absent')).toBeNull();
  });

  it('accepts exactly 25 MiB and removes an over-limit or failed stream before publication', async () => {
    const block = Buffer.alloc(1024 * 1024, 0x41);
    async function* blocks(count: number) { for (let i = 0; i < count; i++) yield block; }
    const staged = await store.stage(blocks(25), 26214400);
    expect(staged.bytes).toBe(26214400);
    await store.discardStage(staged);
    await expect(store.stage(blocks(26), 26214400)).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
    async function* broken() { yield block; throw new Error('injected source interruption'); }
    await expect(store.stage(broken(), 26214400)).rejects.toThrow('injected source interruption');
    expect(await readdir(staging())).toEqual([]);
    expect(await readdir(objects())).toEqual([]);
  });

  it('aborts a producer stuck in next(), closes its iterator and removes stage/listeners', async () => {
    const ctl = new AbortController();
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => { entered = resolve; });
    let returned = false;
    const source: AsyncIterable<Uint8Array> = { [Symbol.asyncIterator]() { return {
      next: () => { entered(); return new Promise<IteratorResult<Uint8Array>>(() => {}); },
      return: async () => { returned = true; return { done: true, value: undefined }; },
    }; } };
    const result = store.stage(source, 100, ctl.signal).then(() => null, (err) => err);
    await waiting;
    ctl.abort();
    expect(await result).toBeInstanceOf(Error);
    expect(returned).toBe(true);
    expect(getEventListeners(ctl.signal, 'abort')).toEqual([]);
    expect(await readdir(staging())).toEqual([]);
  });

  it('EEXIST never overwrites or discards an existing object, and failed stage remains disposable', async () => {
    const one = await store.stage(chunks(Buffer.from('original')), 100);
    await store.publish(one, 'same_key');
    const two = await store.stage(chunks(Buffer.from('replacement')), 100);
    await expect(store.publish(two, 'same_key')).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(path.join(objects(), 'same_key'), 'utf8')).toBe('original');
    await store.discardStage(two);
    expect(await readdir(staging())).toEqual([]);
  });

  it('rejects traversal and static symlinks in objects, stage and owned roots', async () => {
    const outside = path.join(root, 'outside');
    await writeFile(outside, 'secret');
    for (const key of ['../outside', '/outside', 'a/b', '..']) {
      await expect(store.open(key)).rejects.toThrow('key');
    }
    await symlink(outside, path.join(objects(), 'escape'));
    await expect(store.open('escape')).rejects.toThrow();
    await expect(store.exists('escape')).rejects.toThrow();
    expect(await readFile(outside, 'utf8')).toBe('secret');
    const staged = await store.stage(chunks(Buffer.from('stage')), 10);
    await unlink(path.join(staging(), staged.stage_key));
    await symlink(outside, path.join(staging(), staged.stage_key));
    await expect(store.publish(staged, 'stage_escape')).rejects.toThrow();
    await expect(store.discardStage(staged)).rejects.toThrow('普通文件');
    expect(await readFile(outside, 'utf8')).toBe('secret');
    await symlink(root, path.join(root, 'alias'));
    await expect(ArtifactFileStore.create(path.join(root, 'alias'))).rejects.toThrow('真实目录');
    await rename(staging(), path.join(root, 'saved-stage'));
    await symlink(path.join(root, 'saved-stage'), staging());
    await expect(store.stage(chunks(Buffer.from('x')), 10)).rejects.toThrow('符号链接');
    await expect(ArtifactFileStore.create(root)).rejects.toThrow('符号链接');
  });

  it('explicit startup cleanup preserves every referenced key and removes only generated orphan files', async () => {
    const live = await store.stage(chunks(Buffer.from('keep')), 10);
    await store.publish(live, 'live_object');
    const orphan = await store.stage(chunks(Buffer.from('orphan')), 10);
    await store.publish(orphan, 'orphan_object');
    await store.stage(chunks(Buffer.from('stage')), 10);
    await writeFile(path.join(objects(), 'unrecognized.txt'), 'do not delete');
    await store.cleanupOrphans(['live_object']);
    expect(await readdir(staging())).toEqual([]);
    expect(await readdir(objects())).toEqual(['live_object', 'unrecognized.txt']);
    expect(await bytes(await store.open('live_object'))).toEqual(Buffer.from('keep'));
  });
});
