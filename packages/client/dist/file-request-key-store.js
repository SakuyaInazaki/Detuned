import { constants } from 'node:fs';
import { mkdir, lstat, realpath, open, link, unlink } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { RequestKeyError, requestKeyTuple } from './request-key.js';
/** Opt-in local store. The directory must be trusted against changes by the same OS user. */
export class FileRequestKeyStore {
    directory;
    constructor(directory) {
        this.directory = directory;
    }
    static async create(directory) {
        try {
            const requested = path.resolve(directory);
            await mkdir(requested, { mode: 0o700 });
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw new RequestKeyError('STORE_ERROR', 'Cannot create request key directory.', { cause: error });
        }
        try {
            const requested = path.resolve(directory);
            const stat = await lstat(requested);
            if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o700 || stat.uid !== process.getuid?.())
                throw new Error('Directory must be private, owned and real.');
            const resolved = await realpath(requested);
            const store = new FileRequestKeyStore(resolved);
            await store.syncDirectory();
            const parent = await open(path.dirname(resolved), constants.O_RDONLY);
            try {
                await parent.sync();
            }
            finally {
                await parent.close();
            }
            return store;
        }
        catch (error) {
            throw new RequestKeyError('STORE_ERROR', 'Invalid request key directory.', { cause: error });
        }
    }
    async checkDirectory() {
        const stat = await lstat(this.directory);
        if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o700 || stat.uid !== process.getuid?.() || await realpath(this.directory) !== this.directory)
            throw new Error('Request key directory changed.');
    }
    async syncDirectory() {
        const fd = await open(this.directory, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            await fd.sync();
        }
        finally {
            await fd.close();
        }
    }
    async read(file, tuple) {
        const fd = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            const stat = await fd.stat();
            if (!stat.isFile() || stat.size > 16384 || (stat.mode & 0o777) !== 0o600 || stat.uid !== process.getuid?.())
                throw new Error('Invalid request key file.');
            const record = JSON.parse(await fd.readFile('utf8'));
            if (!record || Object.keys(record).sort().join(',') !== 'logicalOperationId,requestKey,scope,version' || record.version !== 1 ||
                requestKeyTuple(record.scope, record.logicalOperationId) !== tuple || typeof record.requestKey !== 'string' || !/^rk_[0-9a-f]{32}$/.test(record.requestKey))
                throw new Error('Corrupt request key record.');
            return record.requestKey;
        }
        finally {
            await fd.close();
        }
    }
    async getOrCreate(scope, logicalOperationId) {
        const tuple = requestKeyTuple(scope, logicalOperationId);
        const file = path.join(this.directory, `${createHash('sha256').update(tuple).digest('hex')}.json`);
        let temporary;
        try {
            await this.checkDirectory();
            try {
                const key = await this.read(file, tuple);
                await this.syncDirectory();
                return key;
            }
            catch (error) {
                if (error.code !== 'ENOENT')
                    throw error;
            }
            const requestKey = `rk_${randomBytes(16).toString('hex')}`;
            const serialized = JSON.stringify({ version: 1, scope, logicalOperationId, requestKey });
            if (Buffer.byteLength(serialized) > 16384)
                throw new Error('Request key record exceeds byte limit.');
            temporary = path.join(this.directory, `.tmp-${randomBytes(16).toString('hex')}`);
            const fd = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
            try {
                await fd.writeFile(serialized);
                await fd.sync();
            }
            finally {
                await fd.close();
            }
            try {
                await link(temporary, file);
            }
            catch (error) {
                if (error.code !== 'EEXIST')
                    throw error;
            }
            const winner = await this.read(file, tuple);
            await this.syncDirectory();
            return winner;
        }
        catch (error) {
            throw new RequestKeyError('STORE_ERROR', 'Cannot persist or recover request key.', { cause: error });
        }
        finally {
            if (temporary)
                await unlink(temporary).catch(() => { });
        }
    }
}
//# sourceMappingURL=file-request-key-store.js.map