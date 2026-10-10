import { isArtifactMetadata, isReadableArtifactMetadata, isReadableCheckArtifactMetadata, isCreateArtifactMetadata, DetunedError, ErrorCode } from '@detuned/protocol';
import { ClientProtocolError, ClientTransportError, TimeoutError, UserAbortError } from './client.js';
const MAX_BYTES = 26214400;
const invalid = () => new ClientProtocolError('Invalid artifact metadata or transfer integrity.');
export function artifactMetadata(value, spaceId, artifactId) {
    if (!isArtifactMetadata(value) || value.space_id !== spaceId || (artifactId !== undefined && value.id !== artifactId) || !/^[0-9a-f]{64}$/.test(value.sha256))
        throw invalid();
    return value;
}
export function readableArtifactMetadata(value, spaceId, artifactId) {
    if (!isReadableArtifactMetadata(value) || value.space_id !== spaceId || value.id !== artifactId || !/^[0-9a-f]{64}$/.test(value.sha256))
        throw invalid();
    return value;
}
async function sha256(bytes) {
    const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}
/** Race observes late settlement; resource-owning callers also dispose late values. */
export function waitForArtifact(pending, signal, error) {
    return new Promise((resolve, reject) => {
        const abort = () => reject(error());
        signal.addEventListener('abort', abort, { once: true });
        pending.then(value => { signal.removeEventListener('abort', abort); signal.aborted ? reject(error()) : resolve(value); }, cause => { signal.removeEventListener('abort', abort); reject(signal.aborted ? error() : cause); });
        if (signal.aborted)
            abort();
    });
}
export async function snapshotUpload(file, metadata, signal) {
    if (!(file instanceof Blob) || file.size > MAX_BYTES || !isCreateArtifactMetadata(metadata))
        throw invalid();
    if (signal?.aborted)
        throw new UserAbortError();
    // slice strips caller-supplied File name and retains immutable Blob data/type.
    const blob = file.slice(0, file.size, file.type || 'application/octet-stream');
    const metadataJson = JSON.stringify(metadata);
    const read = blob.arrayBuffer().then(buffer => new Uint8Array(buffer));
    const bytes = signal ? await waitForArtifact(read, signal, () => new UserAbortError()) : await read;
    const digest = sha256(bytes);
    const hash = signal ? await waitForArtifact(digest, signal, () => new UserAbortError()) : await digest;
    return { blob, metadataJson, bytes: bytes.length, sha256: hash };
}
export async function downloadArtifactBytes(baseUrl, token, spaceId, artifactId, timeoutMs, external, getMetadata, cookieSession = false, checkRunId) {
    const controller = new AbortController();
    let timedOut = false;
    const error = () => external?.aborted ? new UserAbortError() : timedOut ? new TimeoutError() : new UserAbortError();
    const onAbort = () => controller.abort();
    external?.addEventListener('abort', onAbort, { once: true });
    if (external?.aborted)
        onAbort();
    const timer = timeoutMs > 0 ? setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs) : undefined;
    let response;
    let reader;
    const cancelBody = (value) => { if (!value.body?.locked)
        void value.body?.cancel().catch(() => { }); };
    try {
        const metadata = await waitForArtifact(getMetadata(controller.signal), controller.signal, error);
        if (checkRunId !== undefined && (!isReadableCheckArtifactMetadata(metadata, spaceId, checkRunId) || metadata.id !== artifactId))
            throw invalid();
        const contentPath = checkRunId === undefined
            ? `/api/v1/spaces/${encodeURIComponent(spaceId)}/artifacts/${encodeURIComponent(artifactId)}/content`
            : `/api/v1/spaces/${encodeURIComponent(spaceId)}/check-runs/${encodeURIComponent(checkRunId)}/artifacts/${encodeURIComponent(artifactId)}/content`;
        const headers = { Accept: 'application/octet-stream' };
        if (token && !cookieSession)
            headers.Authorization = `Bearer ${token}`;
        const pending = fetch(`${baseUrl}${contentPath}`, { headers, signal: controller.signal, redirect: 'error', credentials: cookieSession ? 'same-origin' : undefined });
        pending.then(value => { response = value; if (controller.signal.aborted)
            cancelBody(value); }, () => { });
        response = await waitForArtifact(pending, controller.signal, error);
        if (!response.ok) {
            let body;
            try {
                body = await readArtifactJson(response, controller.signal, error);
            }
            catch (cause) {
                if (controller.signal.aborted)
                    throw error();
                if (cause instanceof ClientProtocolError)
                    throw cause;
            }
            const detail = body?.error;
            const retryable = ![400, 401, 403, 404, 409, 413, 422].includes(response.status) && (response.status === 429 || [502, 503, 504].includes(response.status) || detail?.retryable === true);
            throw new DetunedError(detail?.code ?? (response.status === 429 ? ErrorCode.RATE_LIMITED : response.status >= 500 ? ErrorCode.TEMPORARILY_UNAVAILABLE : ErrorCode.VALIDATION_ERROR), detail?.message ?? `HTTP ${response.status} 请求失败`, response.status, retryable, detail?.details);
        }
        const length = response.headers.get('content-length');
        const mime = response.headers.get('content-type');
        if (length !== String(metadata.bytes) || mime?.trim().toLowerCase() !== metadata.mime.trim().toLowerCase() || !response.body)
            throw invalid();
        const bytes = new Uint8Array(metadata.bytes);
        reader = response.body.getReader();
        let offset = 0;
        while (true) {
            const chunk = await waitForArtifact(reader.read(), controller.signal, error);
            if (chunk.done)
                break;
            if (!(chunk.value instanceof Uint8Array) || chunk.value.length > bytes.length - offset)
                throw invalid();
            bytes.set(chunk.value, offset);
            offset += chunk.value.length;
        }
        if (offset !== metadata.bytes || await waitForArtifact(sha256(bytes), controller.signal, error) !== metadata.sha256)
            throw invalid();
        return { metadata, bytes };
    }
    catch (cause) {
        if (controller.signal.aborted)
            throw error();
        if (cause instanceof ClientProtocolError || cause instanceof DetunedError || cause instanceof TimeoutError || cause instanceof UserAbortError)
            throw cause;
        throw new ClientTransportError('Artifact transport failed.', { cause, retryable: false });
    }
    finally {
        if (timer !== undefined)
            clearTimeout(timer);
        external?.removeEventListener('abort', onAbort);
        controller.abort();
        if (reader) {
            void reader.cancel().catch(() => { });
            try {
                reader.releaseLock();
            }
            catch { }
        }
        else if (response)
            cancelBody(response);
    }
}
/** New artifact JSON transport only; old generic JSON requests keep their semantics. */
export async function readArtifactJson(response, signal, error) {
    if (!response.body)
        throw new ClientProtocolError('Invalid JSON response.');
    const reader = response.body.getReader();
    const maximum = 1048576;
    const buffer = new Uint8Array(maximum);
    let size = 0;
    try {
        while (true) {
            const part = await waitForArtifact(reader.read(), signal, error);
            if (part.done)
                break;
            if (!(part.value instanceof Uint8Array) || part.value.length > maximum - size)
                throw new ClientProtocolError('JSON response exceeds the client limit.');
            buffer.set(part.value, size);
            size += part.value.length;
        }
        try {
            return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size)));
        }
        catch {
            throw new ClientProtocolError('Invalid JSON response.');
        }
    }
    finally {
        void reader.cancel().catch(() => { });
        try {
            reader.releaseLock();
        }
        catch { }
    }
}
//# sourceMappingURL=artifact-transfer.js.map