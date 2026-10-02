import { validateAllowedQueryParams } from '../utils/query.js';
export const metaRoutes = async (app) => {
    app.get('/capabilities', async (req) => {
        validateAllowedQueryParams(req.query, []);
        return {
            api_version: '1',
            request_id: req.id,
            data: {
                server_version: '0.1.0',
                api_version: '1',
                modules_enabled: ['core', 'fts5', 'sqlite-wal'],
                limits: {
                    max_body_bytes: 65536,
                    max_json_bytes: 262144,
                    max_artifact_bytes: 26214400,
                    max_poll_wait_ms: 25000,
                    max_search_query_chars: 256,
                },
            },
        };
    });
    app.get('/me', async (req) => {
        validateAllowedQueryParams(req.query, []);
        const auth = req.auth;
        const storage = app.storage;
        const visibleSpaces = storage.listVisibleSpaces(auth.actor.id, 100, undefined, auth.credential.allowed_space_ids);
        return {
            api_version: '1',
            request_id: req.id,
            data: {
                actor: auth.actor,
                capabilities: auth.credential.capabilities,
                allowed_space_ids: auth.credential.allowed_space_ids,
                visible_spaces: visibleSpaces.spaces.map((s) => ({
                    id: s.id,
                    slug: s.slug,
                    role: storage.getMembership(s.id, auth.actor.id)?.role ?? 'none',
                })),
            },
        };
    });
};
//# sourceMappingURL=meta.js.map