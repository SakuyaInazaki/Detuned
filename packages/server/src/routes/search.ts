import { FastifyPluginAsync } from 'fastify';
import { ViewName, DetunedError, ErrorCode } from '@detuned/protocol';
import { SearchService, AuthenticatedContext } from '@detuned/core';

export const searchRoutes: FastifyPluginAsync = async (app) => {
  const searchService = (app as any).searchService as SearchService;

  app.get('/spaces/:space_id/search', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    const query = req.query as {
      q?: string;
      kind?: any;
      tags?: string;
      thread_id?: string;
      limit?: string;
      cursor?: string;
    };

    if (!query.q) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少搜索查询参数 q。', 400);
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const tags = query.tags ? query.tags.split(',') : undefined;

    const result = searchService.search(auth, space_id, {
      q: query.q,
      kind: query.kind,
      tags,
      thread_id: query.thread_id,
      limit,
      cursor: query.cursor,
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
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, name } = req.params as { space_id: string; name: ViewName };

    const result = searchService.getView(auth, space_id, name);
    return {
      api_version: '1',
      request_id: req.id,
      data: result.items,
    };
  });
};
