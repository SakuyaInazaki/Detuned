import { FastifyPluginAsync } from 'fastify';
import { ViewName, DetunedError, ErrorCode, PostKind } from '@detuned/protocol';
import { SearchService, AuthenticatedContext } from '@detuned/core';
import { parseIntegerQuery, parseStringQuery, parseCsvQuery, validateAllowedQueryParams } from '../utils/query.js';

const VALID_POST_KINDS = new Set<string>([
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

export const searchRoutes: FastifyPluginAsync = async (app) => {
  const searchService = (app as any).searchService as SearchService;

  app.get('/spaces/:space_id/search', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    const query = req.query as {
      q?: unknown;
      kind?: unknown;
      tags?: unknown;
      thread_id?: unknown;
      limit?: unknown;
      cursor?: unknown;
    };
    validateAllowedQueryParams(query, ['q', 'kind', 'tags', 'thread_id', 'limit', 'cursor']);

    const q = parseStringQuery(query?.q, 'q', { required: true, allowEmpty: false })!;
    const kind = parseStringQuery(query?.kind, 'kind', { allowedValues: VALID_POST_KINDS });
    const limit = parseIntegerQuery(query?.limit, 'limit', { min: 1, max: 100, defaultValue: 20 }) ?? 20;
    const tags = parseCsvQuery(query?.tags, 'tags');
    const threadId = parseStringQuery(query?.thread_id, 'thread_id');
    const cursor = parseStringQuery(query?.cursor, 'cursor');

    const result = searchService.search(auth, space_id, {
      q: q.trim(),
      kind: kind as PostKind | undefined,
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
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id, name } = req.params as { space_id: string; name: ViewName };
    validateAllowedQueryParams(req.query, []);

    const result = searchService.getView(auth, space_id, name);
    return {
      api_version: '1',
      request_id: req.id,
      data: result.items,
    };
  });
};
