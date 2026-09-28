import fs from 'node:fs';
import path from 'node:path';

export class DirectoryLock {
  private lockFd: number | null = null;
  private readonly lockFilePath: string;

  constructor(dataDir: string) {
    this.lockFilePath = path.join(dataDir, 'detuned.lock');
  }

  acquire(): void {
    const dir = path.dirname(this.lockFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      // O_CREAT | O_EXCL | O_RDWR ensures atomic mutual exclusion
      this.lockFd = fs.openSync(
        this.lockFilePath,
        fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR
      );
      fs.writeSync(this.lockFd, `${process.pid}\n${new Date().toISOString()}\n`);
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        throw new Error(
          `数据目录已被其他 Detuned 实例锁定: ${this.lockFilePath}。SQLite WAL 仅允许单进程写入。`
        );
      }
      throw err;
    }
  }

  release(): void {
    if (this.lockFd !== null) {
      try {
        fs.closeSync(this.lockFd);
        if (fs.existsSync(this.lockFilePath)) {
          fs.unlinkSync(this.lockFilePath);
        }
      } catch {
        // Ignore errors during shutdown release
      } finally {
        this.lockFd = null;
      }
    }
  }
}
