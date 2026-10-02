import { DetunedError, ErrorCode, } from '@detuned/protocol';
export class SearchService {
    storage;
    authService;
    constructor(storage, authService) {
        this.storage = storage;
        this.authService = authService;
    }
    search(auth, spaceId, query) {
        this.authService.requireSpaceAccess(auth, spaceId, 'observer');
        const q = query.q.trim();
        if (q.length === 0 || q.length > 256) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '搜索查询字符串长度须在 1 到 256 字符之间。', 400);
        }
        const filters = {
            kind: query.kind,
            tags: query.tags,
            thread_id: query.thread_id,
        };
        const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
        return this.storage.searchPosts(spaceId, q, filters, limit, query.cursor);
    }
    getView(auth, spaceId, name) {
        this.authService.requireSpaceAccess(auth, spaceId, 'observer');
        if (name === 'failures') {
            const result = this.storage.searchPosts(spaceId, '', { kind: 'failure' }, 50);
            return { view: 'failures', items: result.items };
        }
        else if (name === 'findings') {
            const proposals = this.storage.searchPosts(spaceId, '', { kind: 'proposal' }, 25);
            const claims = this.storage.searchPosts(spaceId, '', { kind: 'claim' }, 25);
            return { view: 'findings', items: [...proposals.items, ...claims.items] };
        }
        else if (name === 'open-questions') {
            const questions = this.storage.searchPosts(spaceId, '', { kind: 'question' }, 25);
            const openChallenges = this.storage.listOpenChallenges(spaceId);
            return {
                view: 'open-questions',
                items: [
                    ...questions.items,
                    ...openChallenges.map((c) => ({
                        type: 'open_challenge',
                        relation_id: c.id,
                        source_ref: { post_id: c.source_post_id, revision: c.source_revision },
                        target_ref: { post_id: c.target_post_id, revision: c.target_revision },
                    })),
                ],
            };
        }
        throw new DetunedError(ErrorCode.NOT_FOUND, `未知视图 ${name}`, 404);
    }
}
//# sourceMappingURL=search-service.js.map