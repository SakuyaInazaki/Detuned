import {
  CONTEXT_BYTES, THREAD_POST_LIMIT, DetunedError, ErrorCode, ThreadPostsPage, ThreadPostsReadQuery,
  THREAD_POSTS_READ_LIMITS, THREAD_POSTS_CURSOR_ERROR_MESSAGE, validateThreadPostsReadQuery,
  isThreadPostsReadCursorPayload, threadPostsEnvelopeBytes,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';

const invalidCursor = () => new DetunedError(ErrorCode.VALIDATION_ERROR, THREAD_POSTS_CURSOR_ERROR_MESSAGE, 400);
const tooBroad = () => new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Thread metadata and at least one post cannot fit the budget. Increase max_bytes.', 422);

/** Dynamic metadata directory: one consistent read snapshot per request, no cross-page frozen set. */
export class ThreadPostsReadService {
  constructor(
    private readonly storage: StoragePort,
    private readonly signer: TokenSignerPort,
    private readonly authService: AuthService,
    private readonly secret: string,
    private readonly clock: ClockPort,
  ) {}

  getPosts(auth: AuthenticatedContext, spaceId: string, threadId: string,
    query: ThreadPostsReadQuery, budget: { request_id: string }): ThreadPostsPage {
    const snapshot = this.storage.readSnapshot(() => {
      const current = this.authService.refreshContext(auth);
      this.authService.requireSpaceAccess(current, spaceId, 'observer');
      const thread = this.storage.findThreadById(threadId);
      if (!thread || thread.space_id !== spaceId) throw new DetunedError(ErrorCode.NOT_FOUND, 'Thread does not exist or is not accessible.', 404);
      validateThreadPostsReadQuery(query);
      const maxBytes = query.max_bytes === undefined ? CONTEXT_BYTES.default : query.max_bytes;
      const limit = query.limit === undefined ? THREAD_POST_LIMIT.default : query.limit;
      if (!budget || typeof budget.request_id !== 'string') throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Thread posts budget requires the actual request_id.', 400);
      const now = Math.floor(this.clock.now().getTime() / 1000);
      let afterId: string | undefined, exp = now + THREAD_POSTS_READ_LIMITS.cursor_ttl_seconds;
      if (query.cursor !== undefined) {
        const payload = this.signer.verify(query.cursor, this.secret, now);
        if (!isThreadPostsReadCursorPayload(payload) || payload.actor_id !== current.actor.id || payload.space_id !== spaceId ||
            payload.thread_id !== threadId || now > payload.exp || payload.exp > now + THREAD_POSTS_READ_LIMITS.cursor_ttl_seconds) throw invalidCursor();
        afterId = payload.after_id; exp = payload.exp;
      }
      const listed = this.storage.listPostsInThread(threadId, limit, afterId);
      return { actorId: current.actor.id, thread, posts: listed.posts, storageHasMore: listed.next_cursor !== null, maxBytes, exp };
    });

    // Only metadata was read. At most 100 candidates; never reuse storage's last untrimmed cursor.
    const posts = snapshot.posts.slice();
    let removed = false;
    const page = (): ThreadPostsPage => {
      const more = snapshot.storageHasMore || removed;
      if (more) {
        const last = posts[posts.length - 1];
        if (!last) throw tooBroad();
        const cursor = this.signer.sign({ v: 1, purpose: 'thread_posts_read', actor_id: snapshot.actorId,
          space_id: spaceId, thread_id: threadId, sort: 'id_asc', after_id: last.id, exp: snapshot.exp }, this.secret);
        if (removed) return { data: { thread: snapshot.thread, posts }, meta: { truncated: true, next_cursor: cursor } };
        return { data: { thread: snapshot.thread, posts }, meta: { truncated: false, next_cursor: cursor } };
      }
      return { data: { thread: snapshot.thread, posts }, meta: { truncated: false, next_cursor: null } };
    };
    while (true) {
      const candidate = page();
      if ((candidate.meta.next_cursor === null || candidate.meta.next_cursor.length <= THREAD_POSTS_READ_LIMITS.cursor_chars) &&
          threadPostsEnvelopeBytes(budget.request_id, candidate) <= snapshot.maxBytes) return candidate;
      if (posts.length <= 1) throw tooBroad();
      posts.pop(); removed = true;
    }
  }
}
