import { FastifyPluginAsync } from 'fastify';
import { AuthenticatedContext } from '@detuned/core';

export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/capabilities', async (req) => {
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
    const auth = (req as any).auth as AuthenticatedContext;
    const storage = (app as any).storage;

    const visibleSpaces = storage.listVisibleSpaces(auth.actor.id, 100);

    return {
      api_version: '1',
      request_id: req.id,
      data: {
        actor: auth.actor,
        capabilities: auth.credential.capabilities,
        allowed_space_ids: auth.credential.allowed_space_ids,
        visible_spaces: visibleSpaces.spaces.map((s: any) => ({
          id: s.id,
          slug: s.slug,
          role: storage.getMembership(s.id, auth.actor.id)?.role ?? 'none',
        })),
      },
    };
  });
};
