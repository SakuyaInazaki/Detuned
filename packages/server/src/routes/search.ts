import { validateSearchSourceQuery } from '@detuned/protocol';
import { LIST_LIMIT, integerQueryOptions } from '@detuned/protocol';
import { FastifyPluginAsync } from 'fastify';
import { ViewName, DetunedError, ErrorCode, PostKind, POST_KINDS } from '@detuned/protocol';
import { SearchService, AuthenticatedContext } from '@detuned/core';
import { parseIntegerQuery, parseStringQuery, parseCsvQuery, parseSearchTagsJson, validateAllowedQueryParams } from '../utils/query.js';

const VALID_POST_KINDS = new Set<string>(POST_KINDS);

export const searchRoutes: FastifyPluginAsync = async (app) => {
  const searchService = (app as any).searchService as SearchService;

  app.get('/spaces/:space_id/search', async (req) => {
    const auth = (req as any).auth as AuthenticatedContext;
    const { space_id } = req.params as { space_id: string };
    const query = req.query as {
      source?: unknown; request_id?: unknown; target_post_id?: unknown;
      q?: unknown;
      kind?: unknown;
      tags?: unknown;
      tags_json?: unknown;
      thread_id?: unknown;
      limit?: unknown;
      cursor?: unknown;
    };
    validateAllowedQueryParams(query, ['q', 'source', 'request_id', 'target_post_id', 'kind', 'tags', 'tags_json', 'thread_id', 'limit', 'cursor']);

    const q = parseStringQuery(query?.q, 'q', { required: true, allowEmpty: false })!;
    const source = parseStringQuery(query.source, 'source', { allowedValues: new Set(['posts', 'review_submissions']) });
    if (source === 'review_submissions') {
      if (['kind', 'tags', 'tags_json', 'thread_id'].some(key => Object.prototype.hasOwnProperty.call(query, key))) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid search source or filter combination.', 400, false);
      const logical = { source: 'review_submissions' as const, q, request_id: parseStringQuery(query.request_id, 'request_id'), target_post_id: parseStringQuery(query.target_post_id, 'target_post_id'), limit: parseIntegerQuery(query.limit, 'limit', integerQueryOptions(LIST_LIMIT)) ?? 20, cursor: parseStringQuery(query.cursor, 'cursor', { allowEmpty: true }) };
      validateSearchSourceQuery(logical);
      const result = searchService.searchPublicReviewSubmissions(auth, space_id, logical);
      return { api_version: '1', request_id: req.id, data: result.items, meta: { truncated: false, next_cursor: result.next_cursor } };
    }
    if (['request_id', 'target_post_id'].some(key => Object.prototype.hasOwnProperty.call(query, key))) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid search source or filter combination.', 400, false);
    const kind = parseStringQuery(query?.kind, 'kind', { allowedValues: VALID_POST_KINDS });
    const limit = parseIntegerQuery(query?.limit, 'limit', integerQueryOptions(LIST_LIMIT)) ?? 20;
    if (query.tags !== undefined && query.tags_json !== undefined) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'tags 与 tags_json 不能同时指定。', 400, false);
    const tags = query.tags_json !== undefined ? parseSearchTagsJson(query.tags_json) : parseCsvQuery(query?.tags, 'tags');
    const threadId = parseStringQuery(query?.thread_id, 'thread_id');
    const cursor = parseStringQuery(query?.cursor, 'cursor', { allowEmpty: true });

    const logical = {
      q: q.trim(),
      kind: kind as PostKind | undefined,
      tags,
      thread_id: threadId,
      limit,
      cursor,
    };
    validateSearchSourceQuery(logical);
    const result = searchService.search(auth, space_id, logical);

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
