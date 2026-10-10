import { CliSafeError } from './cli-errors.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { DetunedError, ErrorCode, DEFAULT_ARTIFACT_LIMITS } from '@detuned/protocol';
const invalidInput = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'Artifact input must be a regular non-symlink file of at most 25 MiB.', 400);
// A bounded same-FD copy, not an atomic snapshot of a concurrently modified file.
export async function readArtifactBlob(input, mime = 'application/octet-stream') {
    if (!/^[\x20-\x7e]+$/.test(mime))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Artifact MIME must be a nonempty printable ASCII value.', 400);
    let handle;
    try {
        handle = await fs.promises.open(input, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    }
    catch (error) {
        if (error.code === 'ELOOP')
            throw invalidInput();
        throw new CliSafeError('Artifact input could not be opened.');
    }
    try {
        const before = await handle.stat();
        const max = DEFAULT_ARTIFACT_LIMITS.max_file_bytes;
        if (!before.isFile() || before.size > max)
            throw invalidInput();
        const bytes = new Uint8Array(max + 1);
        let count = 0;
        while (count < bytes.length) {
            const read = await handle.read(bytes, count, Math.min(65536, bytes.length - count), null);
            if (read.bytesRead === 0)
                break;
            count += read.bytesRead;
        }
        if (count > max)
            throw invalidInput();
        const after = await handle.stat();
        if (count !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Artifact input changed while being read.', 400);
        }
        return new Blob([bytes.slice(0, count)], { type: mime });
    }
    catch (error) {
        if (error instanceof DetunedError)
            throw error;
        throw new CliSafeError('Artifact input could not be read.');
    }
    finally {
        try {
            await handle.close();
        }
        catch {
            throw new CliSafeError('Artifact input file could not be closed.');
        }
    }
}
// Trusted local test seam only; CLI never supplies this dependency.
export async function publishArtifactFile(requested, bytes, signal, options = {}) {
    let temporary;
    let handle;
    let published = false;
    try {
        const absolute = path.resolve(requested);
        const parent = await fs.promises.realpath(path.dirname(absolute));
        const output = path.join(parent, path.basename(absolute));
        try {
            await fs.promises.lstat(output);
            throw new Error('exists');
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
        temporary = path.join(parent, `.detuned-artifact-${randomBytes(16).toString('hex')}.tmp`);
        handle = await fs.promises.open(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
        await handle.writeFile(bytes);
        await handle.sync();
        await handle.close();
        handle = undefined;
        if (signal?.aborted)
            throw new Error('cancelled');
        await fs.promises.link(temporary, output);
        published = true;
        if (options.syncParent)
            await options.syncParent(parent);
        else {
            const directory = await fs.promises.open(parent, fs.constants.O_RDONLY);
            try {
                await directory.sync();
            }
            finally {
                await directory.close();
            }
        }
        if (signal?.aborted)
            throw new Error('cancelled');
    }
    catch {
        throw new CliSafeError(published
            ? 'Artifact output is complete but publication durability or completion is unconfirmed; the final file was retained.'
            : 'Artifact output could not be published; no existing target was replaced.');
    }
    finally {
        await handle?.close().catch(() => { });
        if (temporary)
            await fs.promises.unlink(temporary).catch(() => { });
    }
}
//# sourceMappingURL=artifact-io.js.map