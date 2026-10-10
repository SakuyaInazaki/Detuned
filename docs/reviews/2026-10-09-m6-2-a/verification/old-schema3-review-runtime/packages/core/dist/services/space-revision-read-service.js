import { CONTEXT_BYTES, DetunedError, ErrorCode, encodeSpaceRulesDocument, spaceRevisionEnvelopeBytes, isSpaceRevisionReadCursorPayload, SPACE_REVISION_CURSOR_ERROR_MESSAGE, SPACE_REVISION_READ_LIMITS, validateSpaceRevisionReadQuery, } from '@detuned/protocol';
const invalidCursor = () => new DetunedError(ErrorCode.VALIDATION_ERROR, SPACE_REVISION_CURSOR_ERROR_MESSAGE, 400);
const tooBroad = () => new DetunedError(ErrorCode.QUERY_TOO_BROAD, '空间规则分片与必要元信息超过预算，无法推进，请增大 max_bytes。', 422);
/** Fixed objective/rules projection, not an export of private or future configuration. */
export class SpaceRevisionReadService {
    storage;
    signer;
    authService;
    secret;
    clock;
    constructor(storage, signer, authService, secret, clock) {
        this.storage = storage;
        this.signer = signer;
        this.authService = authService;
        this.secret = secret;
        this.clock = clock;
    }
    getRevision(auth, spaceId, revision, query, budget) {
        const snapshot = this.storage.readSnapshot(() => {
            const current = this.authService.refreshContext(auth);
            this.authService.requireSpaceAccess(current, spaceId, 'observer');
            if (!Number.isSafeInteger(revision) || revision < 1) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '空间修订号必须为正安全整数。', 400);
            }
            validateSpaceRevisionReadQuery(query);
            const maxBytes = query.max_bytes === undefined ? CONTEXT_BYTES.default : query.max_bytes;
            if (!budget || typeof budget.request_id !== 'string') {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '空间读取预算需要实际 request_id。', 400);
            }
            const now = Math.floor(this.clock.now().getTime() / 1000);
            let offset = 0, exp = now + SPACE_REVISION_READ_LIMITS.cursor_ttl_seconds;
            if (query.cursor !== undefined) {
                if (typeof query.cursor !== 'string' || !query.cursor.trim() || query.cursor.length > SPACE_REVISION_READ_LIMITS.cursor_chars)
                    throw invalidCursor();
                const payload = this.signer.verify(query.cursor, this.secret, now);
                if (!isSpaceRevisionReadCursorPayload(payload) || payload.actor_id !== current.actor.id || payload.space_id !== spaceId ||
                    payload.revision !== revision || now > payload.exp || payload.exp > now + SPACE_REVISION_READ_LIMITS.cursor_ttl_seconds)
                    throw invalidCursor();
                offset = payload.byte_offset;
                exp = payload.exp;
            }
            const stored = this.storage.getSpaceRevision(spaceId, revision);
            if (!stored)
                throw new DetunedError(ErrorCode.NOT_FOUND, '空间修订不存在。', 404);
            return { actorId: current.actor.id, document: { objective: stored.objective, rules: stored.rules }, maxBytes, offset, exp };
        });
        // One full document read/encoding per request: this is not a CPU or constant-memory cap.
        const bytes = Buffer.from(encodeSpaceRulesDocument(snapshot.document), 'utf8');
        const total = bytes.length, start = snapshot.offset;
        const boundary = (offset) => { const byte = bytes[offset]; return offset === total || (byte !== undefined && (byte & 0xc0) !== 0x80); };
        if (start >= total || !boundary(start))
            throw invalidCursor();
        const pageAt = (end) => {
            const complete = end === total;
            const data = { ref: { space_id: spaceId, revision }, encoding: 'json',
                chunk: bytes.subarray(start, end).toString('utf8'), start_byte: start, end_byte: end, complete };
            if (complete)
                return { data: { ...data, complete: true }, meta: { truncated: false, next_cursor: null } };
            const cursor = this.signer.sign({ v: 1, purpose: 'space_revision_read', actor_id: snapshot.actorId,
                space_id: spaceId, revision, byte_offset: end, exp: snapshot.exp }, this.secret);
            return { data: { ...data, complete: false }, meta: { truncated: true, next_cursor: cursor } };
        };
        const fits = (page) => (page.meta.next_cursor === null || page.meta.next_cursor.length <= SPACE_REVISION_READ_LIMITS.cursor_chars) &&
            spaceRevisionEnvelopeBytes(budget.request_id, page) <= snapshot.maxBytes;
        // A complete tail can fit only if its raw bytes fit; avoid serializing a huge tail.
        if (total - start <= snapshot.maxBytes) {
            const complete = pageAt(total);
            if (fits(complete))
                return complete;
        }
        const previousBoundary = (offset) => { while (offset > start && !boundary(offset))
            offset--; return offset; };
        const nextBoundary = (offset) => { offset++; while (offset < total && !boundary(offset))
            offset++; return offset; };
        let lo = nextBoundary(start), hi = previousBoundary(Math.min(total - 1, start + snapshot.maxBytes));
        let best;
        while (lo <= hi) {
            const mid = Math.max(lo, previousBoundary(Math.floor((lo + hi) / 2)));
            const candidate = pageAt(mid);
            if (fits(candidate)) {
                best = candidate;
                lo = nextBoundary(mid);
            }
            else
                hi = previousBoundary(mid - 1);
        }
        if (!best)
            throw tooBroad();
        return best;
    }
}
//# sourceMappingURL=space-revision-read-service.js.map