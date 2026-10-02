import { ErrorCode, DetunedError, } from '@detuned/protocol';
export class UserAbortError extends Error {
    isUserAbort = true;
    constructor(message = 'Operation aborted by user') {
        super(message);
        this.name = 'UserAbortError';
    }
}
export class TimeoutError extends Error {
    isTimeout = true;
    constructor(message = 'Request timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}
export class ClientProtocolError extends Error {
    isProtocolError = true;
    constructor(message) {
        super(message);
        this.name = 'ClientProtocolError';
    }
}
function parseRetryAfter(header) {
    if (!header)
        return undefined;
    const trimmed = header.trim();
    if (/^\d+$/.test(trimmed)) {
        const sec = parseInt(trimmed, 10);
        if (!Number.isNaN(sec) && sec >= 0) {
            return sec * 1000;
        }
    }
    const dateMs = Date.parse(trimmed);
    if (!Number.isNaN(dateMs)) {
        const diff = dateMs - Date.now();
        return Math.max(0, diff);
    }
    return undefined;
}
function isNetworkError(err) {
    if (!err)
        return false;
    const RETRYABLE_NETWORK_CODES = new Set([
        'ECONNREFUSED',
        'ECONNRESET',
        'ENOTFOUND',
        'ETIMEDOUT',
        'EAI_AGAIN',
        'EPIPE',
        'UND_ERR_CONNECT_TIMEOUT',
        'UND_ERR_SOCKET',
    ]);
    if (typeof err.code === 'string' && RETRYABLE_NETWORK_CODES.has(err.code)) {
        return true;
    }
    if (err.cause) {
        if (typeof err.cause.code === 'string' && RETRYABLE_NETWORK_CODES.has(err.cause.code)) {
            return true;
        }
        if (isNetworkError(err.cause)) {
            return true;
        }
    }
    return false;
}
async function sleepWithAbort(delayMs, signal) {
    if (signal?.aborted) {
        throw new UserAbortError();
    }
    return new Promise((resolve, reject) => {
        let timer;
        let onAbort;
        const cleanup = () => {
            if (timer)
                clearTimeout(timer);
            if (signal && onAbort) {
                signal.removeEventListener('abort', onAbort);
            }
        };
        timer = setTimeout(() => {
            cleanup();
            resolve();
        }, delayMs);
        if (signal) {
            onAbort = () => {
                cleanup();
                reject(new UserAbortError());
            };
            signal.addEventListener('abort', onAbort, { once: true });
        }
    });
}
export class DetunedClient {
    baseUrl;
    token;
    timeoutMs;
    maxRetries;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, '');
        this.token = options.token;
        this.timeoutMs = options.timeoutMs ?? 30000;
        this.maxRetries = options.maxRetries ?? 3;
    }
    setToken(token) {
        this.token = token;
    }
    async request(opts) {
        let url = `${this.baseUrl}/api/v1${opts.path}`;
        if (opts.query) {
            const qp = new URLSearchParams();
            for (const [k, v] of Object.entries(opts.query)) {
                if (v !== undefined) {
                    qp.append(k, String(v));
                }
            }
            const qs = qp.toString();
            if (qs)
                url += `?${qs}`;
        }
        const headers = {
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
            throw new UserAbortError();
        }
        let attempts = 0;
        while (true) {
            if (opts.signal?.aborted) {
                throw new UserAbortError();
            }
            attempts++;
            const controller = new AbortController();
            let onExternalAbort;
            let isTimedOut = false;
            let isUserAborted = false;
            if (opts.signal) {
                if (opts.signal.aborted) {
                    isUserAborted = true;
                    controller.abort();
                }
                else {
                    onExternalAbort = () => {
                        isUserAborted = true;
                        controller.abort();
                    };
                    opts.signal.addEventListener('abort', onExternalAbort, { once: true });
                }
            }
            let timeoutId;
            if (this.timeoutMs > 0) {
                timeoutId = setTimeout(() => {
                    isTimedOut = true;
                    controller.abort();
                }, this.timeoutMs);
            }
            try {
                const res = await fetch(url, {
                    method: opts.method,
                    headers,
                    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
                    signal: controller.signal,
                });
                if (isUserAborted || opts.signal?.aborted) {
                    throw new UserAbortError();
                }
                if (isTimedOut) {
                    throw new TimeoutError(`Request timed out after ${this.timeoutMs}ms`);
                }
                let json = null;
                try {
                    json = await res.json();
                }
                catch (jsonErr) {
                    if (isUserAborted || opts.signal?.aborted) {
                        throw new UserAbortError();
                    }
                    if (isTimedOut) {
                        throw new TimeoutError(`Request timed out after ${this.timeoutMs}ms`);
                    }
                    if (res.ok) {
                        throw new ClientProtocolError(`响应体 JSON 解析失败: ${jsonErr.message}`);
                    }
                }
                if (isUserAborted || opts.signal?.aborted) {
                    throw new UserAbortError();
                }
                if (isTimedOut) {
                    throw new TimeoutError(`Request timed out after ${this.timeoutMs}ms`);
                }
                if (res.ok) {
                    if (json === null || typeof json !== 'object' || Array.isArray(json)) {
                        throw new ClientProtocolError('响应体不是有效的 JSON 对象。');
                    }
                    if (json.api_version !== '1') {
                        throw new ClientProtocolError(`不支持的 API 版本: ${json.api_version}`);
                    }
                    if (typeof json.request_id !== 'string' || json.request_id.trim() === '') {
                        throw new ClientProtocolError('响应体缺少有效的 request_id。');
                    }
                    if (!('data' in json)) {
                        throw new ClientProtocolError('响应体缺少必需的 data 字段。');
                    }
                    if (json.error !== undefined && json.error !== null) {
                        throw new ClientProtocolError('成功响应中不能包含 error 字段。');
                    }
                    return { data: json.data, meta: json.meta };
                }
                const errDetail = json?.error;
                const code = errDetail?.code ?? ErrorCode.TEMPORARILY_UNAVAILABLE;
                const message = errDetail?.message ?? `HTTP ${res.status} 请求失败`;
                const serverReportedRetryable = errDetail?.retryable;
                const isNonRetryableStatus = [400, 401, 403, 404, 409, 413, 422].includes(res.status);
                const retryable = !isNonRetryableStatus &&
                    (res.status === 429 ||
                        [502, 503, 504].includes(res.status) ||
                        serverReportedRetryable === true);
                if (retryable &&
                    attempts <= this.maxRetries &&
                    !opts.signal?.aborted &&
                    !isUserAborted &&
                    !isTimedOut) {
                    const retryAfterHeader = typeof res.headers?.get === 'function'
                        ? res.headers.get('retry-after') ?? res.headers.get('Retry-After')
                        : res.headers?.['retry-after'] ?? res.headers?.['Retry-After'];
                    const retryAfterMs = parseRetryAfter(retryAfterHeader);
                    const delay = retryAfterMs !== undefined
                        ? retryAfterMs
                        : Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                    await sleepWithAbort(delay, opts.signal);
                    continue;
                }
                throw new DetunedError(code, message, res.status, retryable, errDetail?.details);
            }
            catch (err) {
                if (isUserAborted || opts.signal?.aborted || err instanceof UserAbortError) {
                    throw new UserAbortError();
                }
                if (isTimedOut || err instanceof TimeoutError) {
                    throw new TimeoutError(`Request timed out after ${this.timeoutMs}ms`);
                }
                if (err.name === 'AbortError') {
                    if (isTimedOut) {
                        throw new TimeoutError(`Request timed out after ${this.timeoutMs}ms`);
                    }
                    throw new UserAbortError();
                }
                if (err instanceof DetunedError || err instanceof ClientProtocolError) {
                    throw err;
                }
                if (isNetworkError(err) &&
                    attempts <= this.maxRetries &&
                    !opts.signal?.aborted &&
                    !isUserAborted &&
                    !isTimedOut) {
                    const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                    await sleepWithAbort(delay, opts.signal);
                    continue;
                }
                throw new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, `网络或服务不可用: ${err.message}`, 503, true);
            }
            finally {
                if (timeoutId)
                    clearTimeout(timeoutId);
                if (opts.signal && onExternalAbort) {
                    opts.signal.removeEventListener('abort', onExternalAbort);
                }
            }
        }
    }
    // API wrappers
    getCapabilities(opts) {
        return this.request({ method: 'GET', path: '/capabilities', signal: opts?.signal });
    }
    getMe(opts) {
        return this.request({ method: 'GET', path: '/me', signal: opts?.signal });
    }
    listSpaces(limit, cursor, opts) {
        return this.request({ method: 'GET', path: '/spaces', query: { limit, cursor }, signal: opts?.signal });
    }
    createSpace(body, requestKey, opts) {
        return this.request({ method: 'POST', path: '/spaces', body, requestKey, signal: opts?.signal });
    }
    patchSpace(spaceId, body, requestKey, opts) {
        return this.request({ method: 'PATCH', path: `/spaces/${spaceId}`, body, requestKey, signal: opts?.signal });
    }
    createSession(spaceId, body, opts) {
        return this.request({ method: 'POST', path: `/spaces/${spaceId}/sessions`, body, signal: opts?.signal });
    }
    getContext(spaceId, query, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/context`,
            query: { max_bytes: query?.max_bytes, focus_thread_id: query?.focus_thread_id },
            signal: opts?.signal,
        });
    }
    listThreads(spaceId, state, limit, cursor, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/threads`,
            query: { state, limit, cursor },
            signal: opts?.signal,
        });
    }
    getThread(spaceId, threadId, limit, cursor, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/threads/${threadId}`,
            query: { limit, cursor },
            signal: opts?.signal,
        });
    }
    createThread(spaceId, body, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/threads`,
            body,
            requestKey,
            signal: opts?.signal,
        });
    }
    patchThread(spaceId, threadId, body, requestKey, opts) {
        return this.request({
            method: 'PATCH',
            path: `/spaces/${spaceId}/threads/${threadId}`,
            body,
            requestKey,
            signal: opts?.signal,
        });
    }
    createPost(spaceId, threadId, body, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/threads/${threadId}/posts`,
            body,
            requestKey,
            signal: opts?.signal,
        });
    }
    getPost(spaceId, postId, revision, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/posts/${postId}`,
            query: { revision },
            signal: opts?.signal,
        });
    }
    listPostRevisions(spaceId, postId, limit, cursor, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/posts/${postId}/revisions`,
            query: { limit, cursor },
            signal: opts?.signal,
        });
    }
    createPostRevision(spaceId, postId, body, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/posts/${postId}/revisions`,
            body,
            requestKey,
            signal: opts?.signal,
        });
    }
    withdrawPost(spaceId, postId, body, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/posts/${postId}/withdraw`,
            body,
            requestKey,
            signal: opts?.signal,
        });
    }
    createRelation(spaceId, body, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/relations`,
            body,
            requestKey,
            signal: opts?.signal,
        });
    }
    resolveRelation(spaceId, relationId, expectedVersion, reasonRef, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/relations/${relationId}/resolve`,
            body: { expected_version: expectedVersion, reason_ref: reasonRef },
            requestKey,
            signal: opts?.signal,
        });
    }
    reopenRelation(spaceId, relationId, expectedVersion, reasonRef, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/relations/${relationId}/reopen`,
            body: { expected_version: expectedVersion, reason_ref: reasonRef },
            requestKey,
            signal: opts?.signal,
        });
    }
    search(spaceId, query, opts) {
        return this.request({
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
    getView(spaceId, name, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/views/${name}`,
            signal: opts?.signal,
        });
    }
    subscribe(spaceId, body, requestKey, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/subscriptions`,
            body,
            requestKey,
            signal: opts?.signal,
        });
    }
    poll(spaceId, consumerId, query, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/consumers/${consumerId}/poll`,
            body: query ?? {},
            signal: opts?.signal,
        });
    }
    ack(spaceId, consumerId, body, opts) {
        return this.request({
            method: 'POST',
            path: `/spaces/${spaceId}/consumers/${consumerId}/ack`,
            body,
            signal: opts?.signal,
        });
    }
    deactivateConsumer(spaceId, consumerId, opts) {
        return this.request({
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
    async callTool(name, params, opts) {
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
                }
                else if (kind === 'thread') {
                    return (await this.getThread(spaceId, id, undefined, undefined, opts)).data;
                }
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unsupported read kind: ${kind}`, 400);
            }
            case 'forum_publish': {
                const { op, request_key } = params;
                if (op === 'thread') {
                    return (await this.createThread(spaceId, { title: params.title, initial_post: params.initial_post }, request_key, opts)).data;
                }
                else if (op === 'post') {
                    return (await this.createPost(spaceId, params.thread_id, {
                        kind: params.kind,
                        title: params.title,
                        summary: params.summary,
                        body: params.body,
                        tags: params.tags,
                        structured: params.structured,
                        refs: params.refs,
                        artifact_ids: params.artifact_ids,
                    }, request_key, opts)).data;
                }
                else if (op === 'revision') {
                    return (await this.createPostRevision(spaceId, params.post_id, {
                        expected_revision: params.expected_revision,
                        title: params.title,
                        summary: params.summary,
                        body: params.body,
                        tags: params.tags,
                        structured: params.structured,
                        refs: params.refs,
                        artifact_ids: params.artifact_ids,
                    }, request_key, opts)).data;
                }
                else if (op === 'withdraw') {
                    return (await this.withdrawPost(spaceId, params.post_id, {
                        expected_revision: params.expected_revision,
                        reason: params.reason,
                    }, request_key, opts)).data;
                }
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unknown publish op: ${op}`, 400);
            }
            case 'forum_relate': {
                const { op, request_key } = params;
                if (op === 'create') {
                    return (await this.createRelation(spaceId, {
                        source_ref: params.source_ref,
                        target_ref: params.target_ref,
                        type: params.type,
                    }, request_key, opts)).data;
                }
                else if (op === 'resolve') {
                    return (await this.resolveRelation(spaceId, params.relation_id, params.expected_version, params.reason_ref, request_key, opts)).data;
                }
                else if (op === 'reopen') {
                    return (await this.reopenRelation(spaceId, params.relation_id, params.expected_version, params.reason_ref, request_key, opts)).data;
                }
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, `Unknown relate op: ${op}`, 400);
            }
            case 'forum_subscribe':
                return (await this.subscribe(spaceId, {
                    consumer_key: params.consumer_key,
                    thread_ids: params.thread_ids,
                    event_types: params.event_types,
                    start: params.start,
                    checkpoint_token: params.checkpoint_token,
                }, params.request_key, opts)).data;
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
//# sourceMappingURL=client.js.map