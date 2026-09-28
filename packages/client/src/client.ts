import {
  ErrorCode,
  ErrorCodeType,
  DetunedError,
  PostRef,
  CreateSpaceRequest,
  PatchSpaceRequest,
  CreateThreadRequest,
  PatchThreadRequest,
  CreatePostRequest,
  CreatePostRevisionRequest,
  WithdrawPostRequest,
  CreateRelationRequest,
  CreateSubscriptionRequest,
  PollRequest,
  AckRequest,
  ContextQuery,
  SearchQuery,
  ViewName,
} from '@detuned/protocol';

export interface DetunedClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  requestKey?: string;
  signal?: AbortSignal;
}

export class DetunedClient {
  private baseUrl: string;
  private token?: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options: DetunedClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async request<T>(opts: RequestOptions): Promise<{ data: T; meta?: any }> {
    let url = `${this.baseUrl}/api/v1${opts.path}`;
    if (opts.query) {
      const qp = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) {
          qp.append(k, String(v));
        }
      }
      const qs = qp.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (opts.requestKey) {
      headers['Idempotency-Key'] = opts.requestKey;
    }
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (opts.signal?.aborted) {
      throw new Error('Operation aborted');
    }

    let attempts = 0;
    while (true) {
      if (opts.signal?.aborted) {
        throw new Error('Operation aborted');
      }

      attempts++;
      const controller = new AbortController();
      let onExternalAbort: (() => void) | undefined;

      if (opts.signal) {
        if (opts.signal.aborted) {
          controller.abort();
        } else {
          onExternalAbort = () => controller.abort();
          opts.signal.addEventListener('abort', onExternalAbort, { once: true });
        }
      }

      let timeoutId: any;
      if (this.timeoutMs > 0) {
        timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      }

      try {
        const res = await fetch(url, {
          method: opts.method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });

        if (opts.signal?.aborted || controller.signal.aborted) {
          throw new Error('Operation aborted');
        }

        let json: any = null;
        try {
          json = await res.json();
        } catch (jsonErr: any) {
          if (opts.signal?.aborted || controller.signal.aborted) {
            throw new Error('Operation aborted');
          }
          if (!res.ok) {
            throw jsonErr;
          }
        }

        if (opts.signal?.aborted || controller.signal.aborted) {
          throw new Error('Operation aborted');
        }

        if (res.ok) {
          return { data: json?.data, meta: json?.meta };
        }

        const errDetail = json?.error;
        const code: ErrorCodeType = errDetail?.code ?? ErrorCode.TEMPORARILY_UNAVAILABLE;
        const message: string = errDetail?.message ?? `HTTP ${res.status} 请求失败`;
        const retryable = errDetail?.retryable ?? [502, 503, 504].includes(res.status);

        if (retryable && attempts <= this.maxRetries && !opts.signal?.aborted && !controller.signal.aborted) {
          const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, delay);
            if (opts.signal) {
              opts.signal.addEventListener(
                'abort',
                () => {
                  clearTimeout(timer);
                  reject(new Error('Operation aborted'));
                },
                { once: true }
              );
            }
          });
          continue;
        }

        throw new DetunedError(code, message, res.status, retryable, errDetail?.details);
      } catch (err: any) {
        if (
          opts.signal?.aborted ||
          controller.signal.aborted ||
          err.name === 'AbortError' ||
          err.message?.includes('aborted')
        ) {
          throw new Error('Operation aborted');
        }

        if (err instanceof DetunedError) {
          throw err;
        }

        const isNetworkOrTimeout = err.code === 'ECONNREFUSED';
        if (isNetworkOrTimeout && attempts <= this.maxRetries && !opts.signal?.aborted) {
          const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, delay);
            if (opts.signal) {
              opts.signal.addEventListener(
                'abort',
                () => {
                  clearTimeout(timer);
                  reject(new Error('Operation aborted'));
                },
                { once: true }
              );
            }
          });
          continue;
        }

        throw new DetunedError(
          ErrorCode.TEMPORARILY_UNAVAILABLE,
          `网络或服务不可用: ${err.message}`,
          503,
          true
        );
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (opts.signal && onExternalAbort) {
          opts.signal.removeEventListener('abort', onExternalAbort);
        }
      }
    }
  }

  // API wrappers
  getCapabilities(opts?: { signal?: AbortSignal }) {
    return this.request<any>({ method: 'GET', path: '/capabilities', signal: opts?.signal });
  }

  getMe(opts?: { signal?: AbortSignal }) {
    return this.request<any>({ method: 'GET', path: '/me', signal: opts?.signal });
  }

  listSpaces(limit?: number, cursor?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any[]>({ method: 'GET', path: '/spaces', query: { limit, cursor }, signal: opts?.signal });
  }

  createSpace(body: CreateSpaceRequest, requestKey?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({ method: 'POST', path: '/spaces', body, requestKey, signal: opts?.signal });
  }

  patchSpace(spaceId: string, body: PatchSpaceRequest, requestKey?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({ method: 'PATCH', path: `/spaces/${spaceId}`, body, requestKey, signal: opts?.signal });
  }

  createSession(spaceId: string, body: any, opts?: { signal?: AbortSignal }) {
    return this.request<any>({ method: 'POST', path: `/spaces/${spaceId}/sessions`, body, signal: opts?.signal });
  }

  getContext(spaceId: string, query?: ContextQuery, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/context`,
      query: { max_bytes: query?.max_bytes, focus_thread_id: query?.focus_thread_id },
      signal: opts?.signal,
    });
  }

  listThreads(spaceId: string, state?: string, limit?: number, cursor?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/threads`,
      query: { state, limit, cursor },
      signal: opts?.signal,
    });
  }

  getThread(spaceId: string, threadId: string, limit?: number, cursor?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/threads/${threadId}`,
      query: { limit, cursor },
      signal: opts?.signal,
    });
  }

  createThread(spaceId: string, body: CreateThreadRequest, requestKey?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/threads`,
      body,
      requestKey,
      signal: opts?.signal,
    });
  }

  patchThread(spaceId: string, threadId: string, body: PatchThreadRequest, requestKey?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'PATCH',
      path: `/spaces/${spaceId}/threads/${threadId}`,
      body,
      requestKey,
      signal: opts?.signal,
    });
  }

  createPost(spaceId: string, threadId: string, body: CreatePostRequest, requestKey?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/threads/${threadId}/posts`,
      body,
      requestKey,
      signal: opts?.signal,
    });
  }

  getPost(spaceId: string, postId: string, revision?: number, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/posts/${postId}`,
      query: { revision },
      signal: opts?.signal,
    });
  }

  listPostRevisions(spaceId: string, postId: string, limit?: number, cursor?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/posts/${postId}/revisions`,
      query: { limit, cursor },
      signal: opts?.signal,
    });
  }

  createPostRevision(
    spaceId: string,
    postId: string,
    body: CreatePostRevisionRequest,
    requestKey?: string,
    opts?: { signal?: AbortSignal }
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/posts/${postId}/revisions`,
      body,
      requestKey,
      signal: opts?.signal,
    });
  }

  withdrawPost(
    spaceId: string,
    postId: string,
    body: WithdrawPostRequest,
    requestKey?: string,
    opts?: { signal?: AbortSignal }
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/posts/${postId}/withdraw`,
      body,
      requestKey,
      signal: opts?.signal,
    });
  }

  createRelation(spaceId: string, body: CreateRelationRequest, requestKey?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/relations`,
      body,
      requestKey,
      signal: opts?.signal,
    });
  }

  resolveRelation(
    spaceId: string,
    relationId: string,
    expectedVersion: number,
    reasonRef: PostRef,
    requestKey?: string,
    opts?: { signal?: AbortSignal }
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/relations/${relationId}/resolve`,
      body: { expected_version: expectedVersion, reason_ref: reasonRef },
      requestKey,
      signal: opts?.signal,
    });
  }

  reopenRelation(
    spaceId: string,
    relationId: string,
    expectedVersion: number,
    reasonRef: PostRef,
    requestKey?: string,
    opts?: { signal?: AbortSignal }
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/relations/${relationId}/reopen`,
      body: { expected_version: expectedVersion, reason_ref: reasonRef },
      requestKey,
      signal: opts?.signal,
    });
  }

  search(spaceId: string, query: SearchQuery, opts?: { signal?: AbortSignal }) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/search`,
      query: {
        q: query.q,
        kind: query.kind,
        tags: query.tags?.join(','),
        thread_id: query.thread_id,
        limit: query.limit,
        cursor: query.cursor,
      },
      signal: opts?.signal,
    });
  }

  getView(spaceId: string, name: ViewName, opts?: { signal?: AbortSignal }) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/views/${name}`,
      signal: opts?.signal,
    });
  }

  subscribe(spaceId: string, body: CreateSubscriptionRequest, requestKey?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/subscriptions`,
      body,
      requestKey,
      signal: opts?.signal,
    });
  }

  poll(spaceId: string, consumerId: string, query?: PollRequest, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/consumers/${consumerId}/poll`,
      body: query,
      signal: opts?.signal,
    });
  }

  ack(spaceId: string, consumerId: string, body: AckRequest, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/consumers/${consumerId}/ack`,
      body,
      signal: opts?.signal,
    });
  }

  deactivateConsumer(spaceId: string, consumerId: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'DELETE',
      path: `/spaces/${spaceId}/consumers/${consumerId}`,
      signal: opts?.signal,
    });
  }

  /**
   * Unified tool executor for standard forum tools:
   * forum_context, forum_search, forum_read, forum_publish, forum_relate,
   * forum_subscribe, forum_poll, forum_ack, forum_review
   */
  async callTool(name: string, params: Record<string, any>, opts?: { signal?: AbortSignal }): Promise<any> {
    if (opts?.signal?.aborted) {
      throw new Error('Operation aborted');
    }
    const spaceId = params.space_id;
    if (!spaceId) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Tool call missing space_id', 400);
    }

    switch (name) {
      case 'forum_context':
        return (await this.getContext(spaceId, {
          max_bytes: params.max_bytes,
          focus_thread_id: params.focus_thread_id,
        }, opts)).data;

      case 'forum_search':
        return (await this.search(spaceId, {
          q: params.q,
          kind: params.filters?.kind,
          tags: params.filters?.tags,
          thread_id: params.filters?.thread_id,
          limit: params.limit,
          cursor: params.cursor,
        }, opts)).data;

      case 'forum_read': {
        const { kind, id, revision } = params;
        if (kind === 'post') {
          return (await this.getPost(spaceId, id, revision, opts)).data;
        } else if (kind === 'thread') {
          return (await this.getThread(spaceId, id, undefined, undefined, opts)).data;
        }
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unsupported read kind: ${kind}`, 400);
      }

      case 'forum_publish': {
        const { op, request_key } = params;
        if (op === 'thread') {
          return (await this.createThread(
            spaceId,
            { title: params.title, initial_post: params.initial_post },
            request_key,
            opts
          )).data;
        } else if (op === 'post') {
          return (await this.createPost(
            spaceId,
            params.thread_id,
            {
              kind: params.kind,
              title: params.title,
              summary: params.summary,
              body: params.body,
              tags: params.tags,
              structured: params.structured,
              refs: params.refs,
              artifact_ids: params.artifact_ids,
            },
            request_key,
            opts
          )).data;
        } else if (op === 'revision') {
          return (await this.createPostRevision(
            spaceId,
            params.post_id,
            {
              expected_revision: params.expected_revision,
              title: params.title,
              summary: params.summary,
              body: params.body,
              tags: params.tags,
              structured: params.structured,
              refs: params.refs,
              artifact_ids: params.artifact_ids,
            },
            request_key,
            opts
          )).data;
        } else if (op === 'withdraw') {
          return (await this.withdrawPost(
            spaceId,
            params.post_id,
            {
              expected_revision: params.expected_revision,
              reason: params.reason,
            },
            request_key,
            opts
          )).data;
        }
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unknown publish op: ${op}`, 400);
      }

      case 'forum_relate': {
        const { op, request_key } = params;
        if (op === 'create') {
          return (await this.createRelation(
            spaceId,
            {
              source_ref: params.source_ref,
              target_ref: params.target_ref,
              type: params.type,
            },
            request_key,
            opts
          )).data;
        } else if (op === 'resolve') {
          return (await this.resolveRelation(
            spaceId,
            params.relation_id,
            params.expected_version,
            params.reason_ref,
            request_key,
            opts
          )).data;
        } else if (op === 'reopen') {
          return (await this.reopenRelation(
            spaceId,
            params.relation_id,
            params.expected_version,
            params.reason_ref,
            request_key,
            opts
          )).data;
        }
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unknown relate op: ${op}`, 400);
      }

      case 'forum_subscribe':
        return (await this.subscribe(
          spaceId,
          {
            consumer_key: params.consumer_key,
            thread_ids: params.thread_ids,
            event_types: params.event_types,
            start: params.start,
            checkpoint_token: params.checkpoint_token,
          },
          params.request_key,
          opts
        )).data;

      case 'forum_poll':
        return (await this.poll(spaceId, params.consumer_id, {
          limit: params.limit,
          wait_ms: params.wait_ms,
        }, opts)).data;

      case 'forum_ack':
        return (await this.ack(spaceId, params.consumer_id, {
          batch_id: params.batch_id,
          next_cursor: params.next_cursor,
        }, opts)).data;

      default:
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unknown tool: ${name}`, 400);
    }
  }
}
