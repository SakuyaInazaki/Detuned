import fs from 'node:fs';
import path from 'node:path';
export class DirectoryLock {
    lockFd = null;
    lockFilePath;
    constructor(dataDir) {
        this.lockFilePath = path.join(dataDir, 'detuned.lock');
    }
    acquire() {
        const dir = path.dirname(this.lockFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        try {
            // O_CREAT | O_EXCL | O_RDWR ensures atomic mutual exclusion
            this.lockFd = fs.openSync(this.lockFilePath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR);
            fs.writeSync(this.lockFd, `${process.pid}\n${new Date().toISOString()}\n`);
        }
        catch (err) {
            if (err.code === 'EEXIST') {
                let stale = false;
                let lockPid = null;
                try {
                    const content = fs.readFileSync(this.lockFilePath, 'utf8');
                    const [pidStr] = content.split('\n');
                    const pid = pidStr ? parseInt(pidStr.trim(), 10) : NaN;
                    if (!Number.isNaN(pid)) {
                        lockPid = pid;
                        try {
                            process.kill(pid, 0);
                        }
                        catch (killErr) {
                            if (killErr.code === 'ESRCH') {
                                stale = true;
                            }
                        }
                    }
                }
                catch {
                    // If unreadable or missing, proceed to error or retry
                }
                if (stale) {
                    try {
                        fs.unlinkSync(this.lockFilePath);
                        this.lockFd = fs.openSync(this.lockFilePath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR);
                        fs.writeSync(this.lockFd, `${process.pid}\n${new Date().toISOString()}\n`);
                        return;
                    }
                    catch {
                        // If retry fails, fall through to throw error
                    }
                }
                throw new Error(`数据目录已被其他 Detuned 实例锁定 (PID: ${lockPid ?? 'unknown'}): ${this.lockFilePath}。SQLite WAL 仅允许单进程写入。`);
            }
            throw err;
        }
    }
    release() {
        if (this.lockFd !== null) {
            try {
                fs.closeSync(this.lockFd);
                if (fs.existsSync(this.lockFilePath)) {
                    fs.unlinkSync(this.lockFilePath);
                }
            }
            catch {
                // Ignore errors during shutdown release
            }
            finally {
                this.lockFd = null;
            }
        }
    }
}
//# sourceMappingURL=lock.js.map