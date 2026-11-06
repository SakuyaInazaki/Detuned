import { DetunedError, ErrorCode, CONTEXT_BYTES, POST_ASSEMBLE_LIMITS, isPostContentPage, isAssembledPostDocument } from '@detuned/protocol';
import { ClientProtocolError, TimeoutError, UserAbortError } from './client.js';
import { waitForArtifact } from './artifact-transfer.js';
const invalid = () => new ClientProtocolError('Invalid or oversized fixed post content assembly.');
const budgetExceeded = () => new DetunedError(ErrorCode.QUERY_TOO_BROAD, '固定正文读取达到1MiB或128内容请求总预算；请减小--limit或使用post read逐帖读取。', 422);
/** Fixed-reference JSON assembly; no scientific or cryptographic certification. */
export async function assembleFixedPostContent(spaceId, postId, revision, query, timeoutMs, external, read, budget) {
    if (budget && (!Number.isSafeInteger(budget.remainingBytes) || budget.remainingBytes < 0 || !Number.isSafeInteger(budget.remainingRequests) || budget.remainingRequests < 0))
        throw invalid();
    const controller = new AbortController();
    let timedOut = false;
    const failure = () => external?.aborted ? new UserAbortError() : timedOut ? new TimeoutError() : new UserAbortError();
    const abort = () => controller.abort();
    external?.addEventListener('abort', abort, { once: true });
    if (external?.aborted)
        abort();
    const timer = timeoutMs > 0 ? setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs) : undefined;
    const chunks = [], seen = new Set();
    let offset = 0, cursor, initial;
    try {
        for (let count = 1; count <= POST_ASSEMBLE_LIMITS.pages; count++) {
            if (controller.signal.aborted)
                throw failure();
            const maxBytes = budget ? Math.min(query.max_bytes ?? CONTEXT_BYTES.default, budget.remainingBytes) : query.max_bytes;
            if (budget) {
                if (budget.remainingRequests < 1 || (maxBytes ?? 0) < CONTEXT_BYTES.minimum)
                    throw budgetExceeded();
                budget.remainingRequests--;
            }
            const value = await waitForArtifact(read({ max_bytes: maxBytes, cursor }, controller.signal), controller.signal, failure);
            if (!isPostContentPage(value))
                throw invalid();
            const { data, meta } = value;
            if (data.ref.space_id !== spaceId || data.ref.post_id !== postId || data.ref.revision !== revision || data.start_byte !== offset || data.end_byte <= offset || data.end_byte > POST_ASSEMBLE_LIMITS.bytes)
                throw invalid();
            const bytes = new TextEncoder().encode(data.chunk);
            if (new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) !== data.chunk || data.end_byte - offset !== bytes.length || new TextEncoder().encode(JSON.stringify(value)).length > (maxBytes ?? CONTEXT_BYTES.default))
                throw invalid();
            if (initial && (data.post_kind !== initial.post_kind || data.lifecycle !== initial.lifecycle || data.has_newer_revision !== initial.has_newer_revision))
                throw invalid();
            initial ??= data;
            if (budget) {
                if (bytes.length > budget.remainingBytes)
                    throw invalid();
                budget.remainingBytes -= bytes.length;
            }
            chunks.push(data.chunk);
            offset = data.end_byte;
            if (data.complete) {
                let content;
                try {
                    content = JSON.parse(chunks.join(''));
                }
                catch {
                    throw invalid();
                }
                if (!isAssembledPostDocument(content))
                    throw invalid();
                if (controller.signal.aborted)
                    throw failure();
                return { ref: data.ref, post_kind: data.post_kind, lifecycle: data.lifecycle, has_newer_revision: data.has_newer_revision, encoding: 'json', content, bytes: offset, pages: count };
            }
            if (meta.next_cursor === null || meta.next_cursor.length > 4096 || seen.has(meta.next_cursor))
                throw invalid();
            seen.add(meta.next_cursor);
            cursor = meta.next_cursor;
        }
        throw invalid();
    }
    catch (error) {
        if (controller.signal.aborted)
            throw failure();
        throw error;
    }
    finally {
        if (timer !== undefined)
            clearTimeout(timer);
        external?.removeEventListener('abort', abort);
        controller.abort();
    }
}
//# sourceMappingURL=fixed-content-assemble.js.map