import { parseIntegerQuery, parseStringQuery, parseCsvQuery, validateAllowedQueryParams } from '../utils/query.js';
const VALID_POST_KINDS = new Set([
    'note',
    'question',
    'proposal',
    'claim',
    'objection',
    'failure',
    'summary',
    'review',
    'decision',
]);
export const searchRoutes = async (app) => {
    const searchService = app.searchService;
    app.get('/spaces/:space_id/search', async (req) => {
        const auth = req.auth;
        const { space_id } = req.params;
        const query = req.query;
        validateAllowedQueryParams(query, ['q', 'kind', 'tags', 'thread_id', 'limit', 'cursor']);
        const q = parseStringQuery(query?.q, 'q', { required: true, allowEmpty: false });
        const kind = parseStringQuery(query?.kind, 'kind', { allowedValues: VALID_POST_KINDS });
        const limit = parseIntegerQuery(query?.limit, 'limit', { min: 1, max: 100, defaultValue: 20 }) ?? 20;
        const tags = parseCsvQuery(query?.tags, 'tags');
        const threadId = parseStringQuery(query?.thread_id, 'thread_id');
        const cursor = parseStringQuery(query?.cursor, 'cursor');
        const result = searchService.search(auth, space_id, {
            q: q.trim(),
            kind: kind,
            tags,
            thread_id: threadId,
            limit,
            cursor,
        });
        return {
            api_version: '1',
            request_id: req.id,
            data: result.items,
            meta: {
                truncated: false,
                next_cursor: result.next_cursor,
            },
        };
    });
    app.get('/spaces/:space_id/views/:name', async (req) => {
        const auth = req.auth;
        const { space_id, name } = req.params;
        validateAllowedQueryParams(req.query, []);
        const result = searchService.getView(auth, space_id, name);
        return {
            api_version: '1',
            request_id: req.id,
            data: result.items,
        };
    });
};
//# sourceMappingURL=search.js.map