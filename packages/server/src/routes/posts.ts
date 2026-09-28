import { FastifyPluginAsync } from 'fastify';
import {
  CreatePostRequest,
  CreatePostRequestSchema,
  CreatePostRevisionRequest,
  CreatePostRevisionRequestSchema,
  WithdrawPostRequest,
  WithdrawPostRequestSchema,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { PostService, AuthenticatedContext, AuthService } from '@detuned/core';

export const postRoutes: FastifyPluginAsync = async (app) => {
  const postService = (app as any).postService as PostService;
  const authService = (app as any).authService as AuthService;
  const storage = (app as any).storage;

  app.post(
    '/spaces/:space_id/threads/:id/posts',
    { schema: { body: CreatePostRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as CreatePostRequest;

      const result = postService.createPost(auth, space_id, id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.get('/spaces/:space_id/posts/:id', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };
    const query = req.query as { revision?: string };
    const rev = query.revision ? parseInt(query.revision, 10) : undefined;

    const result = postService.getPost(auth, space_id, id, rev);
    return {
      api_version: '1',
      request_id: req.id,
      data: result,
    };
  });

  app.get('/spaces/:space_id/posts/:id/revisions', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, id } = req.params as { space_id: string; id: string };
    authService.requireSpaceAccess(auth, space_id, 'observer');

    const post = storage.findPostById(id);
    if (!post || post.space_id !== space_id) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '帖子不存在。', 404);
    }

    const query = req.query as { limit?: string; cursor?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const result = storage.listPostRevisions(id, limit, query.cursor);
    return {
      api_version: '1',
      request_id: req.id,
      data: result.revisions,
      meta: {
        truncated: false,
        next_cursor: result.next_cursor,
      },
    };
  });

  app.post(
    '/spaces/:space_id/posts/:id/revisions',
    { schema: { body: CreatePostRevisionRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as CreatePostRevisionRequest;

      const result = postService.createRevision(auth, space_id, id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.post(
    '/spaces/:space_id/posts/:id/withdraw',
    { schema: { body: WithdrawPostRequestSchema } },
    async (req) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.body as any)?.request_key;
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as WithdrawPostRequest;

      const post = postService.withdrawPost(auth, space_id, id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: post,
      };
    }
  );
};
