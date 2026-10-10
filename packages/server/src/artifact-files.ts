import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, readdir, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import type { BlobStorePort, BlobReadHandle, StagedBlob } from '@detuned/core';
import { DetunedError, ErrorCode } from '@detuned/protocol';

/** Owned local directories. Initialization and orphan cleanup belong to locked CLI startup. */
export class ArtifactFileStore implements BlobStorePort {
  private constructor(
    private readonly dataRoot: string,
    private readonly root: string,
    private readonly staging: string,
    private readonly objects: string,
  ) {}

  static async create(dataDir: string): Promise<ArtifactFileStore> {
    const requested = path.resolve(dataDir);
    const stat = await lstat(requested);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('附件数据根必须为真实目录。');
    const dataRoot = await realpath(requested);
    const dirs = [path.join(dataRoot, 'artifacts'), path.join(dataRoot, 'artifacts/staging'), path.join(dataRoot, 'artifacts/objects')] as const;
    for (const dir of dirs) {
      await mkdir(dir, { mode: 0o700 }).catch((err: NodeJS.ErrnoException) => { if (err.code !== 'EEXIST') throw err; });
      const info = await lstat(dir);
      if (!info.isDirectory() || info.isSymbolicLink() || await realpath(dir) !== dir) {
        throw new Error('附件目录不能为符号链接或越过数据根。');
      }
    }
    return new ArtifactFileStore(dataRoot, dirs[0], dirs[1], dirs[2]);
  }

  private async checkRoots(): Promise<void> {
    for (const dir of [this.dataRoot, this.root, this.staging, this.objects]) {
      const info = await lstat(dir);
      if (!info.isDirectory() || info.isSymbolicLink() || await realpath(dir) !== dir) {
        throw new Error('附件目录已改变或为符号链接。');
      }
    }
  }

  private keyPath(key: string, staged = false): string {
    const valid = staged ? /^stage_[0-9a-f]{32}$/.test(key) : /^[A-Za-z0-9_-]{1,160}$/.test(key);
    if (!valid) throw new Error('非法内部附件存储key。');
    return path.join(staged ? this.staging : this.objects, key);
  }

  private async remove(file: string): Promise<void> {
    try {
      const info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('附件对象不是普通文件。');
      await unlink(file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async stage(chunks: AsyncIterable<Uint8Array>, maxBytes: number, signal?: AbortSignal): Promise<StagedBlob> {
    await this.checkRoots();
    const stage_key = `stage_${randomBytes(16).toString('hex')}`;
    const file = this.keyPath(stage_key, true);
    const iterator = chunks[Symbol.asyncIterator]();
    const fd = await open(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    let bytes = 0;
    const hash = createHash('sha256');
    const next = async () => {
      if (signal?.aborted) throw new Error('附件上传已取消。');
      let onAbort: (() => void) | undefined;
      try {
        const aborted = new Promise<never>((_resolve, reject) => {
          onAbort = () => reject(new Error('附件上传已取消。'));
          signal?.addEventListener('abort', onAbort, { once: true });
        });
        return await Promise.race([iterator.next(), aborted]);
      } finally {
        if (onAbort) signal?.removeEventListener('abort', onAbort);
      }
    };
    try {
      while (true) {
        const item = await next();
        if (item.done) break;
        const chunk = item.value;
        if (signal?.aborted) throw new Error('附件上传已取消。');
        bytes += chunk.byteLength;
        if (bytes > maxBytes) throw new DetunedError(ErrorCode.PAYLOAD_TOO_LARGE, '附件超过单文件字节上限。', 413);
        hash.update(chunk);
        let offset = 0;
        while (offset < chunk.byteLength) {
          const written = await fd.write(chunk, offset, chunk.byteLength - offset);
          if (written.bytesWritten === 0) throw new Error('附件写入未取得进展。');
          offset += written.bytesWritten;
        }
      }
      if (signal?.aborted) throw new Error('附件上传已取消。');
      await fd.close();
      return { stage_key, sha256: hash.digest('hex'), bytes };
    } catch (err) {
      // Observe iterator cleanup without waiting forever for a producer blocked on I/O.
      try {
        if (iterator.return) void Promise.resolve(iterator.return()).catch(() => {});
      } catch { /* A producer cleanup failure must not prevent closing our file. */ }
      await fd.close().catch(() => {});
      await this.remove(file);
      throw err;
    }
  }

  async publish(staged: StagedBlob, storageKey: string): Promise<void> {
    await this.checkRoots();
    const source = this.keyPath(staged.stage_key, true);
    const target = this.keyPath(storageKey);
    const fd = await open(source, constants.O_RDWR | constants.O_NOFOLLOW);
    try {
      if (!(await fd.stat()).isFile()) throw new Error('暂存附件不是普通文件。');
      await fd.sync();
    } finally { await fd.close(); }
    let linked = false;
    try {
      // link is exclusive: an existing object is never replaced or removed on EEXIST.
      await link(source, target);
      linked = true;
      const directory = await open(this.objects, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { await directory.sync(); } finally { await directory.close(); }
      await unlink(source);
    } catch (err) {
      if (linked) await this.remove(target);
      throw err;
    }
  }

  async discardStage(staged: StagedBlob): Promise<void> {
    await this.checkRoots();
    await this.remove(this.keyPath(staged.stage_key, true));
  }

  async discardPublished(storageKey: string): Promise<void> {
    await this.checkRoots();
    await this.remove(this.keyPath(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    await this.checkRoots();
    try {
      const info = await lstat(this.keyPath(storageKey));
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('附件对象不是普通文件。');
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw err;
    }
  }

  async open(storageKey: string): Promise<BlobReadHandle | null> {
    await this.checkRoots();
    try {
      const fd = await open(this.keyPath(storageKey), constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        if (!(await fd.stat()).isFile()) throw new Error('附件对象不是普通文件。');
        const stream = fd.createReadStream();
        // Observe terminal errors even when cancellation precedes first consumption.
        let terminalError = false;
        stream.on('error', () => { terminalError = true; });
        let disposal: Promise<void> | undefined;
        return { chunks: stream, dispose: () => {
          if (disposal) return disposal;
          if (stream.closed) return terminalError ? Promise.reject(new Error('附件读取资源关闭失败。')) : Promise.resolve();
          disposal = new Promise<void>((resolve, reject) => {
            stream.once('close', () => {
              if (terminalError) reject(new Error('附件读取资源关闭失败。')); else resolve();
            });
            stream.destroy();
          });
          return disposal;
        } };
      } catch (err) { await fd.close(); throw err; }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  /** Invoke only after acquiring DirectoryLock and coordinating DB, before listen. */
  async cleanupOrphans(liveStorageKeys: readonly string[]): Promise<void> {
    await this.checkRoots();
    const live = new Set(liveStorageKeys);
    for (const key of live) this.keyPath(key);
    for (const key of await readdir(this.staging)) {
      if (/^stage_[0-9a-f]{32}$/.test(key)) await this.remove(this.keyPath(key, true));
    }
    for (const key of await readdir(this.objects)) {
      if (/^[A-Za-z0-9_-]{1,160}$/.test(key) && !live.has(key)) await this.remove(this.keyPath(key));
    }
  }
}
