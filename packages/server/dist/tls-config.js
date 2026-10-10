import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { createSecureContext } from 'node:tls';
import { DetunedError, ErrorCode } from '@detuned/protocol';
const MAX_PEM_BYTES = 1_048_576;
const invalid = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'TLS certificate and key must be a valid, bounded unencrypted PEM pair.', 400, false);
/** Validate and copy caller bytes before composing the server; never retain mutable input buffers. */
export function resolveServerTlsOptions(value) {
    try {
        if (!value || !Buffer.isBuffer(value.cert) || !Buffer.isBuffer(value.key) || !value.cert.length || !value.key.length || value.cert.length > MAX_PEM_BYTES || value.key.length > MAX_PEM_BYTES)
            throw invalid();
        const cert = Buffer.from(value.cert), key = Buffer.from(value.key);
        createSecureContext({ cert, key, minVersion: 'TLSv1.2' });
        return { cert, key };
    }
    catch {
        throw invalid();
    }
}
async function readPem(file) {
    let handle;
    try {
        if (typeof file !== 'string' || !file)
            throw invalid();
        handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        const before = await handle.stat({ bigint: true });
        if (!before.isFile() || before.size < 1n || before.size > BigInt(MAX_PEM_BYTES))
            throw invalid();
        const buffer = Buffer.alloc(MAX_PEM_BYTES + 1);
        let offset = 0;
        while (offset < buffer.length) {
            const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null);
            if (!bytesRead)
                break;
            offset += bytesRead;
        }
        const after = await handle.stat({ bigint: true });
        if (offset > MAX_PEM_BYTES || BigInt(offset) !== before.size || !after.isFile() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs)
            throw invalid();
        return Buffer.from(buffer.subarray(0, offset));
    }
    catch {
        throw invalid();
    }
    finally {
        if (handle) {
            try {
                await handle.close();
            }
            catch {
                throw invalid();
            }
        }
    }
}
/** No path/default credential discovery; both files must independently pass same-FD checks. */
export async function loadServerTlsOptions(certPath, keyPath) {
    const cert = await readPem(certPath);
    const key = await readPem(keyPath);
    return resolveServerTlsOptions({ cert, key });
}
//# sourceMappingURL=tls-config.js.map