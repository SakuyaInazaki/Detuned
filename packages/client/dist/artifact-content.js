import { ARTIFACT_CONTENT_LIMITS, DetunedError, ErrorCode } from '@detuned/protocol';
const bad = (message) => new DetunedError(ErrorCode.VALIDATION_ERROR, message, 400, false);
const boundary = (bytes, n) => n === bytes.length || (bytes[n] & 0xc0) !== 0x80;
const decoder = () => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
function base64(bytes) { let binary = ''; for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]); return btoa(binary); }
/** Entire blob has already passed length/MIME/EOF/SHA verification; return one bounded JSON slice. */
export function artifactContentPage(download, query) {
    const { bytes, metadata } = download, offset = query.offset ?? 0, encoding = query.encoding ?? 'utf8';
    if (offset > bytes.length)
        throw bad('Artifact byte offset exceeds the complete blob.');
    if (encoding === 'utf8') {
        try {
            decoder().decode(bytes);
        }
        catch {
            throw bad('Artifact is not complete valid UTF-8; request encoding base64 explicitly.');
        }
        if (!boundary(bytes, offset))
            throw bad('Artifact byte offset must be a UTF-8 code point boundary.');
    }
    const make = (end) => ({ artifact_id: metadata.id, sha256: metadata.sha256, mime: metadata.mime, total_bytes: bytes.length, encoding, offset, next_offset: end === bytes.length ? null : end, complete: end === bytes.length, integrity_verified: true, content: encoding === 'utf8' ? decoder().decode(bytes.subarray(offset, end)) : base64(bytes.subarray(offset, end)) });
    const budget = query.max_bytes ?? ARTIFACT_CONTENT_LIMITS.default_bytes;
    let low = offset, high = Math.min(bytes.length, offset + budget), best = offset;
    while (low <= high) {
        let end = Math.floor((low + high) / 2);
        if (encoding === 'utf8')
            while (end > offset && !boundary(bytes, end))
                end--;
        if (new TextEncoder().encode(JSON.stringify(make(end), null, 2)).length <= budget) {
            best = end;
            low = Math.max(end + 1, Math.floor((low + high) / 2) + 1);
        }
        else
            high = end - 1;
    }
    if (best === offset && offset < bytes.length)
        throw bad('Required artifact content metadata cannot fit the JSON byte budget.');
    return make(best);
}
//# sourceMappingURL=artifact-content.js.map