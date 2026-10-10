import {
  CONTEXT_BYTES, DetunedError, ErrorCode, PostRevisionContentPage, PostRevisionReadQuery,
  encodePostRevisionContentDocument, postRevisionContentEnvelopeBytes, isPostRevisionReadCursorPayload,
  POST_REVISION_CURSOR_ERROR_MESSAGE, POST_REVISION_READ_LIMITS, validatePostRevisionReadQuery,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';

const invalidCursor = () => new DetunedError(ErrorCode.VALIDATION_ERROR, POST_REVISION_CURSOR_ERROR_MESSAGE, 400);
const tooBroad = () => new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Post revision content and required metadata cannot advance within the budget. Increase max_bytes.', 422);

/** Fixed stored content projection; current visibility and metadata are checked on every page. */
export class PostRevisionReadService {
  constructor(
    private readonly storage: StoragePort,
    private readonly signer: TokenSignerPort,
    private readonly authService: AuthService,
    private readonly secret: string,
    private readonly clock: ClockPort,
  ) {}

  getRevision(auth: AuthenticatedContext, spaceId: string, postId: string, revision: number,
    query: PostRevisionReadQuery, budget: { request_id: string }): PostRevisionContentPage {
    const snapshot = this.storage.readSnapshot(() => {
      const current = this.authService.refreshContext(auth);
      this.authService.requireSpaceAccess(current, spaceId, 'observer');
      const post = this.storage.findPostById(postId);
      if (!post || post.space_id !== spaceId) throw new DetunedError(ErrorCode.NOT_FOUND, 'Post does not exist or is not accessible.', 404);
      if (post.lifecycle === 'redacted') throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Post content has been redacted.', 410);
      if (!Number.isSafeInteger(revision) || revision < 1) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Post revision must be a positive safe integer.', 400);
      }
      validatePostRevisionReadQuery(query);
      const maxBytes = query.max_bytes === undefined ? CONTEXT_BYTES.default : query.max_bytes;
      if (!budget || typeof budget.request_id !== 'string') {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Post revision budget requires the actual request_id.', 400);
      }
      const now = Math.floor(this.clock.now().getTime() / 1000);
      let offset = 0, exp = now + POST_REVISION_READ_LIMITS.cursor_ttl_seconds;
      if (query.cursor !== undefined) {
        if (typeof query.cursor !== 'string' || !query.cursor.trim() || query.cursor.length > POST_REVISION_READ_LIMITS.cursor_chars) throw invalidCursor();
        const payload = this.signer.verify(query.cursor, this.secret, now);
        if (!isPostRevisionReadCursorPayload(payload) || payload.actor_id !== current.actor.id || payload.space_id !== spaceId ||
            payload.post_id !== postId || payload.revision !== revision || now > payload.exp || payload.exp > now + POST_REVISION_READ_LIMITS.cursor_ttl_seconds) throw invalidCursor();
        offset = payload.byte_offset;
        exp = payload.exp;
      }
      const stored = this.storage.getPostRevision(postId, revision);
      if (!stored) throw new DetunedError(ErrorCode.NOT_FOUND, 'Post revision does not exist.', 404);
      return { actorId: current.actor.id, document: { title: stored.title, summary: stored.summary, body: stored.body, tags: stored.tags, structured: stored.structured },
        postKind: post.kind, lifecycle: post.lifecycle, hasNewerRevision: post.current_revision > revision, maxBytes, offset, exp };
    });

    // One full document read/encoding per request: this is not a CPU or constant-memory cap.
    const bytes = Buffer.from(encodePostRevisionContentDocument(snapshot.document), 'utf8');
    const total = bytes.length, start = snapshot.offset;
    const boundary = (offset: number) => { const byte = bytes[offset]; return offset === total || (byte !== undefined && (byte & 0xc0) !== 0x80); };
    if (start >= total || !boundary(start)) throw invalidCursor();
    const pageAt = (end: number): PostRevisionContentPage => {
      const complete = end === total;
      const data = { ref: { space_id: spaceId, post_id: postId, revision }, post_kind: snapshot.postKind, lifecycle: snapshot.lifecycle,
        has_newer_revision: snapshot.hasNewerRevision, encoding: 'json' as const,
        chunk: bytes.subarray(start, end).toString('utf8'), start_byte: start, end_byte: end, complete };
      if (complete) return { data: { ...data, complete: true }, meta: { truncated: false, next_cursor: null } };
      const cursor = this.signer.sign({ v: 1, purpose: 'post_revision_read', actor_id: snapshot.actorId,
        space_id: spaceId, post_id: postId, revision, byte_offset: end, exp: snapshot.exp }, this.secret);
      return { data: { ...data, complete: false }, meta: { truncated: true, next_cursor: cursor } };
    };
    const fits = (page: PostRevisionContentPage) =>
      (page.meta.next_cursor === null || page.meta.next_cursor.length <= POST_REVISION_READ_LIMITS.cursor_chars) &&
      postRevisionContentEnvelopeBytes(budget.request_id, page) <= snapshot.maxBytes;

    // A complete tail can fit only if its raw bytes fit; avoid serializing a huge tail.
    if (total - start <= snapshot.maxBytes) {
      const complete = pageAt(total);
      if (fits(complete)) return complete;
    }
    const previousBoundary = (offset: number) => { while (offset > start && !boundary(offset)) offset--; return offset; };
    const nextBoundary = (offset: number) => { offset++; while (offset < total && !boundary(offset)) offset++; return offset; };
    let lo = nextBoundary(start), hi = previousBoundary(Math.min(total - 1, start + snapshot.maxBytes));
    let best: PostRevisionContentPage | undefined;
    while (lo <= hi) {
      const mid = Math.max(lo, previousBoundary(Math.floor((lo + hi) / 2)));
      const candidate = pageAt(mid);
      if (fits(candidate)) { best = candidate; lo = nextBoundary(mid); }
      else hi = previousBoundary(mid - 1);
    }
    if (!best) throw tooBroad();
    return best;
  }
}
