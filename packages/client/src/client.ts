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

    let attempts = 0;
    while (true) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      // Link external signal if provided
      if (opts.signal) {
        opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const res = await fetch(url, {
          method: opts.method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const json: any = await res.json().catch(() => null);

        if (res.ok) {
          return { data: json?.data, meta: json?.meta };
        }

        const errDetail = json?.error;
        const code: ErrorCodeType = errDetail?.code ?? ErrorCode.TEMPORARILY_UNAVAILABLE;
        const message: string = errDetail?.message ?? `HTTP ${res.status} 请求失败`;
        const retryable = errDetail?.retryable ?? [502, 503, 504].includes(res.status);

        if (retryable && attempts <= this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new DetunedError(code, message, res.status, retryable, errDetail?.details);
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err instanceof DetunedError) {
          throw err;
        }

        const isNetworkOrTimeout = err.name === 'AbortError' || err.code === 'ECONNREFUSED';
        if (isNetworkOrTimeout && attempts <= this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new DetunedError(
          ErrorCode.TEMPORARILY_UNAVAILABLE,
          `网络或服务不可用: ${err.message}`,
          503,
          true
        );
      }
    }
  }

  // API wrappers
  getCapabilities() {
    return this.request<any>({ method: 'GET', path: '/capabilities' });
  }

  getMe() {
    return this.request<any>({ method: 'GET', path: '/me' });
  }

  listSpaces(limit?: number, cursor?: string) {
    return this.request<any[]>({ method: 'GET', path: '/spaces', query: { limit, cursor } });
  }

  createSpace(body: CreateSpaceRequest, requestKey?: string) {
    return this.request<any>({ method: 'POST', path: '/spaces', body, requestKey });
  }

  patchSpace(spaceId: string, body: PatchSpaceRequest, requestKey?: string) {
    return this.request<any>({ method: 'PATCH', path: `/spaces/${spaceId}`, body, requestKey });
  }

  createSession(spaceId: string, body: any) {
    return this.request<any>({ method: 'POST', path: `/spaces/${spaceId}/sessions`, body });
  }

  getContext(spaceId: string, query?: ContextQuery) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/context`,
      query: { max_bytes: query?.max_bytes, focus_thread_id: query?.focus_thread_id },
    });
  }

  listThreads(spaceId: string, state?: string, limit?: number, cursor?: string) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/threads`,
      query: { state, limit, cursor },
    });
  }

  getThread(spaceId: string, threadId: string, limit?: number, cursor?: string) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/threads/${threadId}`,
      query: { limit, cursor },
    });
  }

  createThread(spaceId: string, body: CreateThreadRequest, requestKey?: string) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/threads`,
      body,
      requestKey,
    });
  }

  patchThread(spaceId: string, threadId: string, body: PatchThreadRequest, requestKey?: string) {
    return this.request<any>({
      method: 'PATCH',
      path: `/spaces/${spaceId}/threads/${threadId}`,
      body,
      requestKey,
    });
  }

  createPost(spaceId: string, threadId: string, body: CreatePostRequest, requestKey?: string) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/threads/${threadId}/posts`,
      body,
      requestKey,
    });
  }

  getPost(spaceId: string, postId: string, revision?: number) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/posts/${postId}`,
      query: { revision },
    });
  }

  listPostRevisions(spaceId: string, postId: string, limit?: number, cursor?: string) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/posts/${postId}/revisions`,
      query: { limit, cursor },
    });
  }

  createPostRevision(
    spaceId: string,
    postId: string,
    body: CreatePostRevisionRequest,
    requestKey?: string
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/posts/${postId}/revisions`,
      body,
      requestKey,
    });
  }

  withdrawPost(
    spaceId: string,
    postId: string,
    body: WithdrawPostRequest,
    requestKey?: string
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/posts/${postId}/withdraw`,
      body,
      requestKey,
    });
  }

  createRelation(spaceId: string, body: CreateRelationRequest, requestKey?: string) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/relations`,
      body,
      requestKey,
    });
  }

  resolveRelation(
    spaceId: string,
    relationId: string,
    expectedVersion: number,
    reasonRef: PostRef,
    requestKey?: string
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/relations/${relationId}/resolve`,
      body: { expected_version: expectedVersion, reason_ref: reasonRef },
      requestKey,
    });
  }

  reopenRelation(
    spaceId: string,
    relationId: string,
    expectedVersion: number,
    reasonRef: PostRef,
    requestKey?: string
  ) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/relations/${relationId}/reopen`,
      body: { expected_version: expectedVersion, reason_ref: reasonRef },
      requestKey,
    });
  }

  search(spaceId: string, query: SearchQuery) {
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
    });
  }

  getView(spaceId: string, name: ViewName) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/views/${name}`,
    });
  }

  subscribe(spaceId: string, body: CreateSubscriptionRequest, requestKey?: string) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/subscriptions`,
      body,
      requestKey,
    });
  }

  poll(spaceId: string, consumerId: string, query?: PollRequest) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/consumers/${consumerId}/poll`,
      body: query,
    });
  }

  ack(spaceId: string, consumerId: string, body: AckRequest) {
    return this.request<any>({
      method: 'POST',
      path: `/spaces/${spaceId}/consumers/${consumerId}/ack`,
      body,
    });
  }

  deactivateConsumer(spaceId: string, consumerId: string) {
    return this.request<any>({
      method: 'DELETE',
      path: `/spaces/${spaceId}/consumers/${consumerId}`,
    });
  }

  /**
   * Unified tool executor for standard forum tools:
   * forum_context, forum_search, forum_read, forum_publish, forum_relate,
   * forum_subscribe, forum_poll, forum_ack, forum_review
   */
  async callTool(name: string, params: Record<string, any>): Promise<any> {
    const spaceId = params.space_id;
    if (!spaceId) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Tool call missing space_id', 400);
    }

    switch (name) {
      case 'forum_context':
        return (await this.getContext(spaceId, {
          max_bytes: params.max_bytes,
          focus_thread_id: params.focus_thread_id,
        })).data;

      case 'forum_search':
        return (await this.search(spaceId, {
          q: params.q,
          kind: params.filters?.kind,
          tags: params.filters?.tags,
          thread_id: params.filters?.thread_id,
          limit: params.limit,
          cursor: params.cursor,
        })).data;

      case 'forum_read': {
        const { kind, id, revision } = params;
        if (kind === 'post') {
          return (await this.getPost(spaceId, id, revision)).data;
        } else if (kind === 'thread') {
          return (await this.getThread(spaceId, id)).data;
        }
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unsupported read kind: ${kind}`, 400);
      }

      case 'forum_publish': {
        const { op, request_key } = params;
        if (op === 'thread') {
          return (await this.createThread(
            spaceId,
            { title: params.title, initial_post: params.initial_post },
            request_key
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
            request_key
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
            request_key
          )).data;
        } else if (op === 'withdraw') {
          return (await this.withdrawPost(
            spaceId,
            params.post_id,
            {
              expected_revision: params.expected_revision,
              reason: params.reason,
            },
            request_key
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
            request_key
          )).data;
        } else if (op === 'resolve') {
          return (await this.resolveRelation(
            spaceId,
            params.relation_id,
            params.expected_version,
            params.reason_ref,
            request_key
          )).data;
        } else if (op === 'reopen') {
          return (await this.reopenRelation(
            spaceId,
            params.relation_id,
            params.expected_version,
            params.reason_ref,
            request_key
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
          params.request_key
        )).data;

      case 'forum_poll':
        return (await this.poll(spaceId, params.consumer_id, {
          limit: params.limit,
          wait_ms: params.wait_ms,
        })).data;

      case 'forum_ack':
        return (await this.ack(spaceId, params.consumer_id, {
          batch_id: params.batch_id,
          next_cursor: params.next_cursor,
        })).data;

      default:
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unknown tool: ${name}`, 400);
    }
  }
}
