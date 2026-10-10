import { normalizeArtifactMime, canonicalizeReviewJson, isCheckRunView, isCheckSnapshotView, isCheckPostRevisionView, isCheckReceiptView, isRequiredChecksView, isIssueCheckRunCredentialData, isCheckArtifactMetadata, isReadableCheckArtifactMetadata } from '@detuned/protocol';
import { validateSearchSourceQuery, isPublicReviewSubmissionSearchPage } from '@detuned/protocol';
import { isFindingsView, isFailuresView } from '@detuned/protocol';
import { isPostReviewRequestsPage, validatePostReviewRequestsQuery } from '@detuned/protocol';
import { validateToolParams, isSession } from '@detuned/protocol';
import { isReviewRequestView, isReviewRequestReadView, isReviewSnapshotView, isOwnReviewAssignmentView, isReviewSubmissionAcknowledgement, isReviewSubmissionView, isReviewSubmissionsView, isReviewDecisionView, isReviewStatusView, isReadableArtifactMetadata } from '@detuned/protocol';
import { isPostRevisionCatalogPage, isPostRevisionArtifactsPage } from '@detuned/protocol';
import { WEB_AUTH_PATH, WEB_CSRF_HEADER, isWebSessionResponse } from '@detuned/protocol';
import { artifactMetadata, readableArtifactMetadata, snapshotUpload, downloadArtifactBytes, waitForArtifact, readArtifactJson } from './artifact-transfer.js';
import { streamSpaceExport } from './export-stream.js';
import { RequestKeyError, normalizeServerNamespace, validateRequestKeyScope } from './request-key.js';
import { ErrorCode, DetunedError, validateToolReadParams, validateToolContextParams, } from '@detuned/protocol';
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
export class ClientTransportError extends Error {
    isTransportError = true;
    isDetunedError = false;
    isUserAbort = false;
    isTimeout = false;
    kind = 'transport';
    code;
    statusCode;
    retryable;
    constructor(message, options) {
        super(message, options ? { cause: options.cause } : undefined);
        this.name = 'ClientTransportError';
        this.code = options?.code ?? 'TRANSPORT_ERROR';
        this.statusCode = null;
        this.retryable = options?.retryable ?? false;
    }
}
function parseRetryAfter(header, maxBudgetMs = 120000) {
    if (!header)
        return undefined;
    const trimmed = header.trim();
    let ms;
    if (/^\d+$/.test(trimmed)) {
        const sec = parseInt(trimmed, 10);
        if (!Number.isNaN(sec) && sec >= 0) {
            ms = sec * 1000;
        }
    }
    else {
        const dateMs = Date.parse(trimmed);
        if (!Number.isNaN(dateMs)) {
            const diff = dateMs - Date.now();
            ms = Math.max(0, diff);
        }
    }
    if (ms === undefined)
        return undefined;
    const NODE_MAX_TIMEOUT_MS = 2147483647;
    if (!Number.isFinite(ms) || ms > maxBudgetMs || ms > NODE_MAX_TIMEOUT_MS) {
        return { delayMs: ms, exceedsBudget: true };
    }
    return { delayMs: ms, exceedsBudget: false };
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
    browserSession;
    baseUrl;
    requestKeyStore;
    token;
    timeoutMs;
    maxRetries;
    maxRetryAfterMs;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, '');
        this.token = options.token;
        this.browserSession = options.browserSession;
        this.requestKeyStore = options.requestKeyStore;
        this.timeoutMs = options.timeoutMs ?? 30000;
        this.maxRetries = options.maxRetries ?? 3;
        this.maxRetryAfterMs = options.maxRetryAfterMs ?? 120000;
    }
    setToken(token) {
        this.token = token;
    }
    async request(opts) {
        return this.requestWithBody(opts);
    }
    async requestWithBody(opts, bodyFactory, artifactJson = !!bodyFactory, retryBudget = this.maxRetries, webAuth) {
        let url = `${this.baseUrl}${webAuth ? '' : '/api/v1'}${opts.path}`;
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
        const bearer = webAuth ? webAuth.token : this.browserSession ? undefined : this.token;
        if (bearer)
            headers.Authorization = `Bearer ${bearer}`;
        if ((this.browserSession || webAuth) && (!webAuth || webAuth.noContent) && opts.method !== 'GET') {
            const csrf = this.browserSession?.getCsrfToken();
            if (csrf !== undefined)
                headers[WEB_CSRF_HEADER] = csrf;
        }
        if (opts.requestKey) {
            headers['Idempotency-Key'] = opts.requestKey;
        }
        if (opts.body !== undefined && !bodyFactory) {
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
            let outcome;
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
            let artifactResponse;
            try {
                let res;
                try {
                    const fetching = fetch(url, {
                        method: opts.method,
                        credentials: (this.browserSession || webAuth) ? 'same-origin' : undefined,
                        headers,
                        body: bodyFactory ? bodyFactory() : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
                        signal: controller.signal,
                    });
                    if (artifactJson)
                        fetching.then(value => { artifactResponse = value; if (controller.signal.aborted && !value.body?.locked)
                            void value.body?.cancel().catch(() => { }); }, () => { });
                    res = artifactJson ? await waitForArtifact(fetching, controller.signal, () => isTimedOut ? new TimeoutError() : new UserAbortError()) : await fetching;
                }
                catch (fetchErr) {
                    if (isUserAborted || opts.signal?.aborted || fetchErr instanceof UserAbortError) {
                        outcome = { kind: 'error', error: new UserAbortError() };
                    }
                    else if (isTimedOut || fetchErr instanceof TimeoutError) {
                        outcome = {
                            kind: 'error',
                            error: new TimeoutError(`Request timed out after ${this.timeoutMs}ms`),
                        };
                    }
                    else if (fetchErr?.name === 'AbortError') {
                        // Unsolicited abort from upstream/network (not user cancellation, not timeout)
                        if (attempts <= retryBudget) {
                            const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                            outcome = { kind: 'retry', delay };
                        }
                        else {
                            outcome = {
                                kind: 'error',
                                error: new ClientTransportError(fetchErr.message || 'Upstream connection aborted', {
                                    cause: fetchErr,
                                    retryable: true,
                                    code: 'ABORT_ERROR',
                                }),
                            };
                        }
                    }
                    else if (isNetworkError(fetchErr)) {
                        if (attempts <= retryBudget) {
                            const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                            outcome = { kind: 'retry', delay };
                        }
                        else {
                            outcome = {
                                kind: 'error',
                                error: new ClientTransportError(fetchErr.message, {
                                    cause: fetchErr,
                                    retryable: true,
                                    code: fetchErr.cause?.code ?? fetchErr.code ?? 'NETWORK_ERROR',
                                }),
                            };
                        }
                    }
                    else {
                        outcome = {
                            kind: 'error',
                            error: new ClientTransportError(fetchErr.message ?? 'Transport failed', {
                                cause: fetchErr,
                                retryable: false,
                                code: fetchErr.cause?.code ?? fetchErr.code ?? 'TRANSPORT_ERROR',
                            }),
                        };
                    }
                }
                if (!outcome && res) {
                    if (isUserAborted || opts.signal?.aborted) {
                        outcome = { kind: 'error', error: new UserAbortError() };
                    }
                    else if (isTimedOut) {
                        outcome = {
                            kind: 'error',
                            error: new TimeoutError(`Request timed out after ${this.timeoutMs}ms`),
                        };
                    }
                    else {
                        if (webAuth?.noContent && res.status === 204)
                            return { data: undefined };
                        if (webAuth?.noContent && res.ok)
                            throw new ClientProtocolError('Invalid web logout response.');
                        let json = null;
                        try {
                            json = artifactJson ? await readArtifactJson(res, controller.signal, () => isTimedOut ? new TimeoutError() : new UserAbortError()) : await res.json();
                        }
                        catch (jsonErr) {
                            if (artifactJson && jsonErr instanceof ClientProtocolError) {
                                outcome = { kind: 'error', error: jsonErr };
                            }
                            else if (isUserAborted || opts.signal?.aborted) {
                                outcome = { kind: 'error', error: new UserAbortError() };
                            }
                            else if (isTimedOut) {
                                outcome = {
                                    kind: 'error',
                                    error: new TimeoutError(`Request timed out after ${this.timeoutMs}ms`),
                                };
                            }
                            else {
                                const isNonRetryableStatus = [400, 401, 403, 404, 409, 413, 422].includes(res.status);
                                if (isNonRetryableStatus) {
                                    // Do not retry non-retryable statuses even if body reading fails;
                                    // will fall through to error handling below with json=null.
                                }
                                else if (jsonErr?.name === 'AbortError') {
                                    // Unsolicited abort from stream
                                    if (attempts <= retryBudget) {
                                        const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                                        outcome = { kind: 'retry', delay };
                                    }
                                    else {
                                        outcome = {
                                            kind: 'error',
                                            error: new ClientTransportError(jsonErr.message || 'Stream connection aborted', {
                                                cause: jsonErr,
                                                retryable: true,
                                                code: 'ABORT_ERROR',
                                            }),
                                        };
                                    }
                                }
                                else if (isNetworkError(jsonErr)) {
                                    if (attempts <= retryBudget) {
                                        const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                                        outcome = { kind: 'retry', delay };
                                    }
                                    else {
                                        outcome = {
                                            kind: 'error',
                                            error: new ClientTransportError(jsonErr.message || 'Network stream error', {
                                                cause: jsonErr,
                                                retryable: true,
                                                code: jsonErr.cause?.code ?? jsonErr.code ?? 'NETWORK_ERROR',
                                            }),
                                        };
                                    }
                                }
                                else if (res.ok) {
                                    outcome = {
                                        kind: 'error',
                                        error: new ClientProtocolError(`响应体 JSON 解析失败: ${jsonErr.message}`),
                                    };
                                }
                            }
                        }
                        // External cancellation or timeout during body promise fulfillment must win over resolved payload
                        if (!outcome) {
                            if (isUserAborted || opts.signal?.aborted) {
                                outcome = { kind: 'error', error: new UserAbortError() };
                            }
                            else if (isTimedOut) {
                                outcome = {
                                    kind: 'error',
                                    error: new TimeoutError(`Request timed out after ${this.timeoutMs}ms`),
                                };
                            }
                        }
                        if (!outcome) {
                            if (res.ok) {
                                if (json === null || typeof json !== 'object' || Array.isArray(json)) {
                                    outcome = {
                                        kind: 'error',
                                        error: new ClientProtocolError('响应体不是有效的 JSON 对象。'),
                                    };
                                }
                                else if (json.api_version !== '1') {
                                    outcome = {
                                        kind: 'error',
                                        error: new ClientProtocolError(`不支持的 API 版本: ${json.api_version}`),
                                    };
                                }
                                else if (typeof json.request_id !== 'string' || json.request_id.trim() === '') {
                                    outcome = {
                                        kind: 'error',
                                        error: new ClientProtocolError('响应体缺少有效的 request_id。'),
                                    };
                                }
                                else if (!('data' in json)) {
                                    outcome = {
                                        kind: 'error',
                                        error: new ClientProtocolError('响应体缺少必需的 data 字段。'),
                                    };
                                }
                                else if (json.error !== undefined && json.error !== null) {
                                    outcome = {
                                        kind: 'error',
                                        error: new ClientProtocolError('成功响应中不能包含 error 字段。'),
                                    };
                                }
                                else {
                                    outcome = { kind: 'success', value: { data: json.data, meta: json.meta } };
                                }
                            }
                            else {
                                const errDetail = json?.error;
                                const code = errDetail?.code ??
                                    (res.status === 429
                                        ? ErrorCode.RATE_LIMITED
                                        : res.status >= 500
                                            ? ErrorCode.TEMPORARILY_UNAVAILABLE
                                            : ErrorCode.VALIDATION_ERROR);
                                const message = errDetail?.message ?? `HTTP ${res.status} 请求失败`;
                                const serverReportedRetryable = errDetail?.retryable;
                                const isNonRetryableStatus = [400, 401, 403, 404, 409, 413, 422].includes(res.status);
                                const retryable = !isNonRetryableStatus &&
                                    (res.status === 429 ||
                                        [502, 503, 504].includes(res.status) ||
                                        serverReportedRetryable === true);
                                if (retryable &&
                                    attempts <= retryBudget &&
                                    !opts.signal?.aborted &&
                                    !isUserAborted &&
                                    !isTimedOut) {
                                    const retryAfterHeader = typeof res.headers?.get === 'function'
                                        ? res.headers.get('retry-after') ?? res.headers.get('Retry-After')
                                        : res.headers?.['retry-after'] ?? res.headers?.['Retry-After'];
                                    const retryParsed = parseRetryAfter(retryAfterHeader, this.maxRetryAfterMs);
                                    if (retryParsed?.exceedsBudget) {
                                        // Oversized Retry-After stops automatic retries immediately and throws server error
                                        outcome = {
                                            kind: 'error',
                                            error: new DetunedError(code, message, res.status, retryable, errDetail?.details),
                                        };
                                    }
                                    else {
                                        const delay = retryParsed !== undefined
                                            ? retryParsed.delayMs
                                            : Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                                        outcome = { kind: 'retry', delay };
                                    }
                                }
                                else {
                                    outcome = {
                                        kind: 'error',
                                        error: new DetunedError(code, message, res.status, retryable, errDetail?.details),
                                    };
                                }
                            }
                        }
                    }
                }
            }
            finally {
                if (artifactJson && artifactResponse && !artifactResponse.body?.locked)
                    void artifactResponse.body?.cancel().catch(() => { });
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = undefined;
                }
                if (opts.signal && onExternalAbort) {
                    opts.signal.removeEventListener('abort', onExternalAbort);
                    onExternalAbort = undefined;
                }
            }
            if (outcome.kind === 'success') {
                return outcome.value;
            }
            if (outcome.kind === 'error') {
                throw outcome.error;
            }
            if (outcome.kind === 'retry') {
                await sleepWithAbort(outcome.delay, opts.signal);
                continue;
            }
        }
    }
    async write(scope, request, opts) {
        if (opts?.logicalOperationId === undefined)
            return this.request(request);
        const token = this.token;
        const prepared = await this.prepareWriteKey(scope, request.requestKey, opts);
        if (token !== this.token)
            throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
        if (opts.signal?.aborted)
            throw new UserAbortError();
        return this.request({ ...request, requestKey: prepared });
    }
    async prepareWriteKey(scope, explicitKey, opts) {
        if (opts?.logicalOperationId === undefined)
            return explicitKey;
        if (explicitKey !== undefined || !this.requestKeyStore)
            throw new RequestKeyError('INVALID_OPTIONS', 'Persistent operation requires a store and cannot include an explicit request key.');
        const token = this.token;
        const check = () => {
            if (opts.signal?.aborted)
                throw new UserAbortError();
            if (token !== this.token)
                throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
        };
        check();
        const serverNamespace = normalizeServerNamespace(this.baseUrl);
        const me = await this.getMe({ signal: opts.signal });
        check();
        const actorId = me.data?.actor?.id;
        if (typeof actorId !== 'string' || !actorId.trim())
            throw new ClientProtocolError('Authenticated actor ID is missing.');
        const fullScope = { serverNamespace, actorId, ...scope };
        validateRequestKeyScope(fullScope, opts.logicalOperationId);
        const pending = Promise.resolve().then(() => this.requestKeyStore.getOrCreate(fullScope, opts.logicalOperationId));
        let onAbort;
        let requestKey;
        try {
            const aborted = new Promise((_resolve, reject) => {
                onAbort = () => reject(new UserAbortError());
                opts.signal?.addEventListener('abort', onAbort, { once: true });
                if (opts.signal?.aborted)
                    onAbort();
            });
            requestKey = await Promise.race([pending, aborted]);
        }
        finally {
            if (onAbort)
                opts.signal?.removeEventListener('abort', onAbort);
        }
        check();
        if (typeof requestKey !== 'string' || !requestKey.trim())
            throw new RequestKeyError('STORE_ERROR', 'Request key store returned an invalid key.');
        return requestKey;
    }
    async createActor(body, opts) {
        return (await this.requestWithBody({ method: 'POST', path: '/admin/actors', body, signal: opts?.signal }, undefined, false, 0)).data;
    }
    async createCredential(body, opts) {
        return (await this.requestWithBody({ method: 'POST', path: '/admin/credentials', body, signal: opts?.signal }, undefined, false, 0)).data;
    }
    async revokeCredential(credentialId, opts) {
        return (await this.requestWithBody({ method: 'POST', path: `/admin/credentials/${encodeURIComponent(credentialId)}/revoke`, signal: opts?.signal }, undefined, false, 0)).data;
    }
    async createMembership(spaceId, body, opts) {
        return (await this.requestWithBody({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/memberships`, body, signal: opts?.signal }, undefined, false, 0)).data;
    }
    async patchMembership(spaceId, actorId, body, opts) {
        return (await this.requestWithBody({ method: 'PATCH', path: `/spaces/${encodeURIComponent(spaceId)}/memberships/${encodeURIComponent(actorId)}`, body, signal: opts?.signal }, undefined, false, 0)).data;
    }
    async deactivateMembership(spaceId, actorId, opts) {
        return (await this.requestWithBody({ method: 'DELETE', path: `/spaces/${encodeURIComponent(spaceId)}/memberships/${encodeURIComponent(actorId)}`, signal: opts?.signal }, undefined, false, 0)).data;
    }
    async redact(spaceId, body, requestKey, opts) {
        return (await this.write({ spaceId, operation: 'admin.redaction', target: null }, { method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/redactions`, body, requestKey, signal: opts?.signal }, opts)).data;
    }
    /** New review responses alone use the strict, bounded JSON transport. */
    async reviewResponse(request, guard, matches, scope, opts) {
        if (scope) {
            const token = this.token;
            const key = await this.prepareWriteKey(scope, request.requestKey, opts);
            if (opts?.logicalOperationId !== undefined && token !== this.token)
                throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
            request = { ...request, requestKey: key };
        }
        if (request.signal?.aborted)
            throw new UserAbortError();
        const response = await this.requestWithBody(request, undefined, true);
        if (!guard(response.data) || !matches(response.data))
            throw new ClientProtocolError('Invalid review response.');
        return response.data;
    }
    createReviewRequest(spaceId, body, requestKey, opts) {
        return this.reviewResponse({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests`, body, requestKey, signal: opts?.signal }, isReviewRequestView, v => v.space_id === spaceId && v.target_ref.post_id === body.target_ref.post_id && v.target_ref.revision === body.target_ref.revision, { spaceId, operation: 'review.request.create', target: null }, opts);
    }
    async getPostReviewRequests(spaceId, postId, query = {}, options) {
        try {
            validatePostReviewRequestsQuery(query);
        }
        catch {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid review directory query.', 400);
        }
        const result = await this.requestWithBody({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/posts/${encodeURIComponent(postId)}/review-requests`, query, signal: options?.signal }, undefined, true);
        if (!isPostReviewRequestsPage(result) || result.data.length > (query.limit ?? 20) || result.data.some(row => row.space_id !== spaceId || row.target_post_id !== postId))
            throw new ClientProtocolError('Invalid review directory response.');
        return result;
    }
    getReviewRequest(spaceId, requestId, options) {
        return this.reviewResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}`, signal: options?.signal }, isReviewRequestReadView, v => v.id === requestId && v.space_id === spaceId);
    }
    getReviewSnapshot(spaceId, snapshotId, options) {
        return this.reviewResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-snapshots/${encodeURIComponent(snapshotId)}`, signal: options?.signal }, isReviewSnapshotView, v => v.snapshot_id === snapshotId && v.space_id === spaceId && v.manifest.space_id === spaceId);
    }
    getOwnReviewAssignment(spaceId, requestId, options) {
        return this.reviewResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/assignment`, signal: options?.signal }, isOwnReviewAssignmentView, v => v.request_id === requestId);
    }
    submitReview(spaceId, requestId, body, requestKey, opts) {
        return this.reviewResponse({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/submissions`, body, requestKey, signal: opts?.signal }, isReviewSubmissionAcknowledgement, v => v.request_id === requestId && v.snapshot_sha256 === body.snapshot_sha256, { spaceId, operation: 'review.submission.create', target: requestId }, opts);
    }
    getReviewSubmission(spaceId, submissionId, options) {
        return this.reviewResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-submissions/${encodeURIComponent(submissionId)}`, signal: options?.signal }, isReviewSubmissionView, v => v.submission_id === submissionId);
    }
    listReviewSubmissions(spaceId, requestId, options) {
        return this.reviewResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/submissions`, signal: options?.signal }, isReviewSubmissionsView, v => v.request_id === requestId && v.submissions.every(s => s.request_id === requestId));
    }
    finalizeReviewRequest(spaceId, requestId, body, requestKey, opts) {
        return this.reviewResponse({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/finalize`, body, requestKey, signal: opts?.signal }, isReviewDecisionView, v => v.request_id === requestId, { spaceId, operation: 'review.request.finalize', target: requestId }, opts);
    }
    cancelReviewRequest(spaceId, requestId, body, requestKey, opts) {
        return this.reviewResponse({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/cancel`, body, requestKey, signal: opts?.signal }, isReviewRequestView, v => v.id === requestId && v.space_id === spaceId, { spaceId, operation: 'review.request.cancel', target: requestId }, opts);
    }
    getReviewStatus(spaceId, requestId, options) {
        return this.reviewResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/status`, signal: options?.signal }, isReviewStatusView, v => v.request_id === requestId);
    }
    getReviewDecision(spaceId, requestId, options) {
        return this.reviewResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/decision`, signal: options?.signal }, isReviewDecisionView, v => v.request_id === requestId);
    }
    checkRunPath(spaceId, runId) {
        return `/spaces/${encodeURIComponent(spaceId)}/check-runs/${encodeURIComponent(runId)}`;
    }
    checkWriteKey(requestKey, opts) {
        if (opts && 'logicalOperationId' in opts)
            throw new RequestKeyError('INVALID_OPTIONS', 'Check writes do not support persistent logical operation IDs.');
        if (requestKey !== undefined && (typeof requestKey !== 'string' || !requestKey.trim()))
            throw new ClientProtocolError('Invalid check request key.');
        return requestKey ?? globalThis.crypto.randomUUID();
    }
    async checkResponse(request, guard) {
        if (request.signal?.aborted)
            throw new UserAbortError();
        const response = await this.requestWithBody(request, undefined, true);
        if (!guard(response.data))
            throw new ClientProtocolError('Invalid check response.');
        return response.data;
    }
    createCheckRun(spaceId, body, requestKey, opts) {
        const key = opts?.logicalOperationId === undefined ? requestKey ?? globalThis.crypto.randomUUID() : requestKey;
        return this.reviewResponse({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/check-runs`, body, requestKey: key, signal: opts?.signal }, (value) => !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && isCheckRunView(value, spaceId, value.id) && value.request_id === body.request_id && value.snapshot_id === body.snapshot_id && value.check_name === body.check_name && value.verifier_actor_id === body.verifier_id, () => true, { spaceId, operation: 'check.run.create', target: body.request_id }, opts);
    }
    getCheckRun(spaceId, runId, opts) {
        return this.checkResponse({ method: 'GET', path: this.checkRunPath(spaceId, runId), signal: opts?.signal }, (value) => isCheckRunView(value, spaceId, runId));
    }
    async getCheckSnapshot(spaceId, runId, opts) {
        const value = await this.checkResponse({ method: 'GET', path: `${this.checkRunPath(spaceId, runId)}/snapshot`, signal: opts?.signal }, (candidate) => isCheckSnapshotView(candidate, spaceId, runId));
        try {
            const canonical = new TextEncoder().encode(canonicalizeReviewJson(value.manifest));
            const pending = globalThis.crypto.subtle.digest('SHA-256', canonical);
            const digest = opts?.signal ? await waitForArtifact(pending, opts.signal, () => new UserAbortError()) : await pending;
            const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
            if (hash !== value.manifest_sha256)
                throw new ClientProtocolError('Invalid check snapshot integrity.');
        }
        catch (cause) {
            if (cause instanceof UserAbortError || cause instanceof ClientProtocolError)
                throw cause;
            throw new ClientProtocolError('Invalid check snapshot canonical payload.');
        }
        return value;
    }
    getCheckPostRevision(spaceId, runId, postId, revision, opts) {
        return this.checkResponse({ method: 'GET', path: `${this.checkRunPath(spaceId, runId)}/posts/${encodeURIComponent(postId)}/revisions/${revision}`, signal: opts?.signal }, (value) => isCheckPostRevisionView(value, spaceId, runId, postId, revision));
    }
    async issueCheckRunCredential(spaceId, runId, body = {}, opts) {
        const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
        if (!object(body) || (opts !== undefined && !object(opts)) || Object.keys(body).some(key => key !== 'ttl_seconds') ||
            (opts && ['requestKey', 'request_key', 'logicalOperationId'].some(key => key in opts)) || arguments.length > 4)
            throw new ClientProtocolError('Credential issuance does not accept request keys.');
        const response = await this.requestWithBody({ method: 'POST', path: `${this.checkRunPath(spaceId, runId)}/credentials`, body, signal: opts?.signal }, undefined, true, 0);
        if (!isIssueCheckRunCredentialData(response.data, spaceId, runId))
            throw new ClientProtocolError('Invalid check credential response.');
        return response.data;
    }
    submitCheckReceipt(spaceId, runId, body, requestKey, opts) {
        const key = this.checkWriteKey(requestKey, opts);
        return this.checkResponse({ method: 'POST', path: `${this.checkRunPath(spaceId, runId)}/receipt`, body, requestKey: key, signal: opts?.signal }, (value) => isCheckReceiptView(value, spaceId, runId) && value.receipt_id === body.receipt_id &&
            value.observed_snapshot_sha256 === body.observed_snapshot_sha256 && value.observed_check_config_sha256 === body.observed_check_config_sha256 &&
            value.logs_artifact_id === body.logs_artifact_id && value.result === body.result && value.exit_code === body.exit_code &&
            value.environment === body.environment && value.execution_steps === body.execution_steps && value.started_at === body.started_at && value.finished_at === body.finished_at &&
            Object.keys(value.tool_versions).length === Object.keys(body.tool_versions).length && Object.entries(body.tool_versions).every(([name, version]) => value.tool_versions[name] === version));
    }
    getCheckReceipt(spaceId, runId, opts) {
        return this.checkResponse({ method: 'GET', path: `${this.checkRunPath(spaceId, runId)}/receipt`, signal: opts?.signal }, (value) => isCheckReceiptView(value, spaceId, runId));
    }
    invalidateCheckRun(spaceId, runId, body, requestKey, opts) {
        const key = opts?.logicalOperationId === undefined ? requestKey ?? globalThis.crypto.randomUUID() : requestKey;
        return this.reviewResponse({ method: 'POST', path: `${this.checkRunPath(spaceId, runId)}/invalidate`, body, requestKey: key, signal: opts?.signal }, (value) => isCheckRunView(value, spaceId, runId) && value.state === 'invalidated' && value.version === body.expected_version + 1 && value.invalidation_reason === body.reason, () => true, { spaceId, operation: 'check.run.invalidate', target: runId }, opts);
    }
    async uploadCheckArtifact(spaceId, runId, file, metadata = {}, requestKey, opts) {
        // Key policy is checked before even slicing/reading the caller's Blob.
        const key = this.checkWriteKey(requestKey, opts);
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || Object.keys(metadata).length !== 0)
            throw new ClientProtocolError('Invalid check upload metadata.');
        const snapshot = await snapshotUpload(file, metadata, opts?.signal);
        const response = await this.requestWithBody({ method: 'POST', path: `${this.checkRunPath(spaceId, runId)}/artifacts`, requestKey: key, signal: opts?.signal }, () => {
            const form = new FormData();
            form.append('metadata', snapshot.metadataJson);
            form.append('file', snapshot.blob, 'upload.bin');
            return form;
        });
        const value = response.data;
        if (!isCheckArtifactMetadata(value, spaceId, runId) || value.state !== 'ready' || value.bytes !== snapshot.bytes || value.sha256 !== snapshot.sha256 || value.mime !== normalizeArtifactMime(snapshot.blob.type))
            throw new ClientProtocolError('Invalid check upload response.');
        return value;
    }
    getCheckArtifact(spaceId, runId, artifactId, opts) {
        return this.checkResponse({ method: 'GET', path: `${this.checkRunPath(spaceId, runId)}/artifacts/${encodeURIComponent(artifactId)}`, signal: opts?.signal }, (value) => isReadableCheckArtifactMetadata(value, spaceId, runId) && value.id === artifactId);
    }
    downloadCheckArtifact(spaceId, runId, artifactId, opts) {
        return downloadArtifactBytes(this.baseUrl, this.token, spaceId, artifactId, this.timeoutMs, opts?.signal, signal => this.getCheckArtifact(spaceId, runId, artifactId, { signal }), !!this.browserSession, runId);
    }
    getRequiredChecks(spaceId, requestId, opts) {
        return this.checkResponse({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/check-runs`, signal: opts?.signal }, (value) => isRequiredChecksView(value, spaceId, requestId));
    }
    async uploadReviewArtifact(spaceId, requestId, file, metadata = {}, requestKey, opts) {
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || Object.keys(metadata).length !== 0)
            throw new ClientProtocolError('Invalid review upload metadata.');
        const snapshot = await snapshotUpload(file, metadata, opts?.signal);
        const token = this.token;
        const key = await this.prepareWriteKey({ spaceId, operation: 'artifact.review.create', target: requestId }, requestKey, opts);
        if (opts?.logicalOperationId !== undefined && token !== this.token)
            throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
        if (opts?.signal?.aborted)
            throw new UserAbortError();
        const response = await this.requestWithBody({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/review-requests/${encodeURIComponent(requestId)}/artifacts`, requestKey: key, signal: opts?.signal }, () => {
            const form = new FormData();
            form.append('metadata', snapshot.metadataJson);
            form.append('file', snapshot.blob, 'upload.bin');
            return form;
        });
        const value = response.data;
        if (!isReadableArtifactMetadata(value) || value.visibility !== 'review_assignment' || value.space_id !== spaceId || value.bytes !== snapshot.bytes || value.sha256 !== snapshot.sha256)
            throw new ClientProtocolError('Invalid review upload response.');
        return value;
    }
    async uploadArtifact(spaceId, file, metadata = {}, requestKey, opts) {
        const snapshot = await snapshotUpload(file, metadata, opts?.signal);
        const token = this.token;
        const key = await this.prepareWriteKey({ spaceId, operation: 'artifact.create', target: null }, requestKey, opts);
        if (opts?.logicalOperationId !== undefined && token !== this.token)
            throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
        if (opts?.signal?.aborted)
            throw new UserAbortError();
        const result = await this.requestWithBody({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/artifacts`, requestKey: key, signal: opts?.signal }, () => {
            const form = new FormData();
            form.append('metadata', snapshot.metadataJson);
            form.append('file', snapshot.blob, 'upload.bin');
            return form;
        });
        const value = artifactMetadata(result.data, spaceId);
        if (value.bytes !== snapshot.bytes || value.sha256 !== snapshot.sha256)
            throw new ClientProtocolError('Artifact upload integrity check failed.');
        return value;
    }
    async getArtifact(spaceId, artifactId, opts) {
        const result = await this.requestWithBody({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/artifacts/${encodeURIComponent(artifactId)}`, signal: opts?.signal }, undefined, true);
        return readableArtifactMetadata(result.data, spaceId, artifactId);
    }
    downloadArtifact(spaceId, artifactId, opts) {
        return downloadArtifactBytes(this.baseUrl, this.token, spaceId, artifactId, this.timeoutMs, opts?.signal, signal => this.getArtifact(spaceId, artifactId, { signal }), !!this.browserSession);
    }
    exportSpace(spaceId, options) {
        return streamSpaceExport(this.baseUrl, this.token, spaceId, this.timeoutMs, options, !!this.browserSession);
    }
    async createWebSession(token, options) {
        const result = await this.requestWithBody({ method: 'POST', path: WEB_AUTH_PATH, signal: options?.signal }, undefined, true, 0, { token });
        if (!isWebSessionResponse(result.data))
            throw new ClientProtocolError('Invalid web session response.');
        return result.data;
    }
    async getWebSession(options) {
        const result = await this.requestWithBody({ method: 'GET', path: WEB_AUTH_PATH, signal: options?.signal }, undefined, true, this.maxRetries, {});
        if (!isWebSessionResponse(result.data))
            throw new ClientProtocolError('Invalid web session response.');
        return result.data;
    }
    async deleteWebSession(options) {
        await this.requestWithBody({ method: 'DELETE', path: WEB_AUTH_PATH, signal: options?.signal }, undefined, true, 0, { noContent: true });
    }
    // API wrappers
    getLiveness(opts) {
        return this.request({ method: 'GET', path: '/health/live', signal: opts?.signal });
    }
    getReadiness(opts) {
        return this.request({ method: 'GET', path: '/health/ready', signal: opts?.signal });
    }
    getCapabilities(opts) {
        return this.request({ method: 'GET', path: '/capabilities', signal: opts?.signal });
    }
    getDiagnostics(opts) {
        return this.request({ method: 'GET', path: '/admin/diagnostics', signal: opts?.signal });
    }
    getMe(opts) {
        return this.request({ method: 'GET', path: '/me', signal: opts?.signal });
    }
    listSpaces(limit, cursor, opts) {
        return this.request({ method: 'GET', path: '/spaces', query: { limit, cursor }, signal: opts?.signal });
    }
    createSpace(body, requestKey, opts) {
        return this.write({ spaceId: null, operation: 'space.create', target: null }, { method: 'POST', path: '/spaces', body, requestKey, signal: opts?.signal }, opts);
    }
    patchSpace(spaceId, body, requestKey, opts) {
        return this.write({ spaceId: spaceId, operation: 'space.patch', target: spaceId }, { method: 'PATCH', path: `/spaces/${spaceId}`, body, requestKey, signal: opts?.signal }, opts);
    }
    createSession(spaceId, body, opts) {
        return this.requestWithBody({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/sessions`, body, signal: opts?.signal }, undefined, false, 0);
    }
    async getContext(spaceId, query, opts) {
        const result = await this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/context`,
            query: { max_bytes: query?.max_bytes, focus_thread_id: query?.focus_thread_id },
            signal: opts?.signal,
        });
        // Mandatory meta is this endpoint’s static contract, not new runtime validation.
        return result;
    }
    async getSpaceRevision(spaceId, revision, query = {}, opts) {
        const result = await this.request({ method: 'GET', path: `/spaces/${spaceId}/revisions/${revision}`, query: { max_bytes: query.max_bytes, cursor: query.cursor }, signal: opts?.signal });
        // This endpoint guarantees required correlated meta; no new runtime response validator.
        return result;
    }
    listThreads(spaceId, state, limit, cursor, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/threads`,
            query: { state, limit, cursor },
            signal: opts?.signal,
        });
    }
    getThreadPosts(spaceId, threadId, query, opts) {
        return this.request({ method: 'GET', path: `/spaces/${spaceId}/threads/${threadId}/posts`, query, signal: opts?.signal });
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
        return this.write({ spaceId: spaceId, operation: 'thread.create', target: null }, {
            method: 'POST',
            path: `/spaces/${spaceId}/threads`,
            body,
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    patchThread(spaceId, threadId, body, requestKey, opts) {
        return this.write({ spaceId: spaceId, operation: 'thread.patch', target: threadId }, {
            method: 'PATCH',
            path: `/spaces/${spaceId}/threads/${threadId}`,
            body,
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    createPost(spaceId, threadId, body, requestKey, opts) {
        return this.write({ spaceId: spaceId, operation: 'post.create', target: threadId }, {
            method: 'POST',
            path: `/spaces/${spaceId}/threads/${threadId}/posts`,
            body,
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    getPost(spaceId, postId, revision, opts) {
        return this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/posts/${postId}`,
            query: { revision },
            signal: opts?.signal,
        });
    }
    async getPostRevisionContent(spaceId, postId, revision, query = {}, opts) {
        const result = await this.request({
            method: 'GET', path: `/spaces/${spaceId}/posts/${postId}/revisions/${revision}`,
            query: { max_bytes: query.max_bytes, cursor: query.cursor }, signal: opts?.signal,
        });
        return { data: result.data, meta: result.meta };
    }
    async getPostRevisionCatalog(spaceId, postId, query = {}, options) {
        const result = await this.requestWithBody({ method: 'GET',
            path: `/spaces/${encodeURIComponent(spaceId)}/posts/${encodeURIComponent(postId)}/revisions/catalog`,
            query, signal: options?.signal }, undefined, true);
        if (!isPostRevisionCatalogPage(result) || result.data.post_id !== postId)
            throw new ClientProtocolError('Invalid revision catalog response.');
        return result;
    }
    async getPostRevisionArtifacts(spaceId, postId, revision, query = {}, options) {
        const result = await this.requestWithBody({ method: 'GET',
            path: `/spaces/${encodeURIComponent(spaceId)}/posts/${encodeURIComponent(postId)}/revisions/${revision}/artifacts`,
            query, signal: options?.signal }, undefined, true);
        if (!isPostRevisionArtifactsPage(result) || result.data.ref.post_id !== postId || result.data.ref.revision !== revision)
            throw new ClientProtocolError('Invalid revision artifacts response.');
        return result;
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
        return this.write({ spaceId: spaceId, operation: 'post.revision', target: postId }, {
            method: 'POST',
            path: `/spaces/${spaceId}/posts/${postId}/revisions`,
            body,
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    withdrawPost(spaceId, postId, body, requestKey, opts) {
        return this.write({ spaceId: spaceId, operation: 'post.withdraw', target: postId }, {
            method: 'POST',
            path: `/spaces/${spaceId}/posts/${postId}/withdraw`,
            body,
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    createRelation(spaceId, body, requestKey, opts) {
        return this.write({ spaceId: spaceId, operation: 'relation.create', target: null }, {
            method: 'POST',
            path: `/spaces/${spaceId}/relations`,
            body,
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    resolveRelation(spaceId, relationId, expectedVersion, reasonRef, requestKey, opts) {
        return this.write({ spaceId: spaceId, operation: 'relation.resolve', target: relationId }, {
            method: 'POST',
            path: `/spaces/${spaceId}/relations/${relationId}/resolve`,
            body: { expected_version: expectedVersion, reason_ref: reasonRef },
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    reopenRelation(spaceId, relationId, expectedVersion, reasonRef, requestKey, opts) {
        return this.write({ spaceId: spaceId, operation: 'relation.reopen', target: relationId }, {
            method: 'POST',
            path: `/spaces/${spaceId}/relations/${relationId}/reopen`,
            body: { expected_version: expectedVersion, reason_ref: reasonRef },
            requestKey,
            signal: opts?.signal,
        }, opts);
    }
    async search(spaceId, query, opts) {
        const result = await this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/search`,
            query: {
                q: query.q.trim(),
                kind: query.kind,
                tags_json: query.tags === undefined ? undefined : JSON.stringify(query.tags),
                thread_id: query.thread_id,
                limit: query.limit,
                cursor: query.cursor,
            },
            signal: opts?.signal,
        });
        // Endpoint contract supplies mandatory meta; this is a static type boundary,
        // not additional runtime response validation.
        return result;
    }
    async searchPublicReviewSubmissions(spaceId, query, opts) {
        validateSearchSourceQuery(query);
        if (query.source !== 'review_submissions')
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid public review search source.', 400);
        const result = await this.requestWithBody({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/search`, query: { ...query, q: query.q.trim() }, signal: opts?.signal }, undefined, true);
        if (!isPublicReviewSubmissionSearchPage(result, spaceId, query) || result.data.length > (query.limit ?? 20))
            throw new ClientProtocolError('Invalid public review search response.');
        return result;
    }
    async getView(spaceId, name, opts) {
        const result = await this.request({
            method: 'GET',
            path: `/spaces/${spaceId}/views/${name}`,
            signal: opts?.signal,
        });
        if ((name === 'findings' && !isFindingsView(result.data, spaceId)) || (name === 'failures' && !isFailuresView(result.data, spaceId)))
            throw new ClientProtocolError('Invalid knowledge view response.');
        return result;
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
            path: `/spaces/${encodeURIComponent(spaceId)}/consumers/${encodeURIComponent(consumerId)}`,
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
        if (!validateToolParams(name, params))
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid forum tool arguments.', 400);
        const spaceId = params.space_id;
        if (!spaceId) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Tool call missing space_id', 400);
        }
        switch (name) {
            case 'forum_context':
                validateToolContextParams(params);
                return await this.getContext(spaceId, {
                    max_bytes: params.max_bytes,
                    focus_thread_id: params.focus_thread_id,
                }, opts);
            case 'forum_search':
                if (params.source === 'review_submissions')
                    return await this.searchPublicReviewSubmissions(spaceId, { source: 'review_submissions', q: params.q, request_id: params.filters?.request_id, target_post_id: params.filters?.target_post_id, limit: params.limit, cursor: params.cursor }, opts);
                return await this.search(spaceId, {
                    q: params.q,
                    kind: params.filters?.kind,
                    tags: params.filters?.tags,
                    thread_id: params.filters?.thread_id,
                    limit: params.limit,
                    cursor: params.cursor,
                }, opts);
            case 'forum_read': {
                validateToolReadParams(params);
                if (params.kind === 'check_run')
                    return this.getCheckRun(spaceId, params.id, opts);
                if (params.kind === 'check_snapshot')
                    return this.getCheckSnapshot(spaceId, params.id, opts);
                if (params.kind === 'check_receipt')
                    return this.getCheckReceipt(spaceId, params.id, opts);
                if (params.kind === 'required_checks')
                    return this.getRequiredChecks(spaceId, params.id, opts);
                if (params.kind === 'check_post_revision')
                    return this.getCheckPostRevision(spaceId, params.run_id, params.id, params.revision, opts);
                if (params.kind === 'check_artifact')
                    return this.getCheckArtifact(spaceId, params.run_id, params.id, opts);
                if (params.kind === 'review_requests')
                    return this.getPostReviewRequests(spaceId, params.id, { limit: params.limit, cursor: params.cursor, max_bytes: params.max_bytes }, opts);
                if (params.kind === 'space')
                    return this.getSpaceRevision(spaceId, params.revision, { max_bytes: params.max_bytes, cursor: params.cursor }, opts);
                if (params.kind === 'thread_posts')
                    return this.getThreadPosts(spaceId, params.id, { limit: params.limit, max_bytes: params.max_bytes, cursor: params.cursor, sort: params.sort }, opts);
                if (params.kind === 'post_revision')
                    return this.getPostRevisionContent(spaceId, params.id, params.revision, { max_bytes: params.max_bytes, cursor: params.cursor }, opts);
                const { kind, id } = params;
                if (kind === 'review_request')
                    return this.getReviewRequest(spaceId, id, opts);
                if (kind === 'review_snapshot')
                    return this.getReviewSnapshot(spaceId, id, opts);
                if (kind === 'review_assignment')
                    return this.getOwnReviewAssignment(spaceId, id, opts);
                if (kind === 'review_submission')
                    return this.getReviewSubmission(spaceId, id, opts);
                if (kind === 'review_submissions')
                    return this.listReviewSubmissions(spaceId, id, opts);
                if (kind === 'review_status')
                    return this.getReviewStatus(spaceId, id, opts);
                if (kind === 'review_decision')
                    return this.getReviewDecision(spaceId, id, opts);
                if (kind === 'artifact')
                    return this.getArtifact(spaceId, id, opts);
                if (kind === 'post') {
                    return (await this.getPost(spaceId, id, params.revision, opts)).data;
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
            case 'forum_review': {
                // The canonical validator above proves this discriminated input boundary.
                const review = params;
                if (review.op === 'check_create') {
                    const { space_id: _space, op: _op, request_key, ...body } = review;
                    return this.createCheckRun(spaceId, body, request_key, opts);
                }
                if (review.op === 'check_invalidate') {
                    const { space_id: _space, op: _op, request_key, run_id, ...body } = review;
                    return this.invalidateCheckRun(spaceId, run_id, body, request_key, opts);
                }
                if (review.op === 'request') {
                    const { space_id: _space, op: _op, request_key, ...body } = review;
                    return this.createReviewRequest(spaceId, body, request_key, opts);
                }
                if (review.op === 'submit') {
                    const { space_id: _space, op: _op, request_key, request_id, ...body } = review;
                    return this.submitReview(spaceId, request_id, body, request_key, opts);
                }
                if (review.op === 'finalize') {
                    const { space_id: _space, op: _op, request_key, request_id, ...body } = review;
                    return this.finalizeReviewRequest(spaceId, request_id, body, request_key, opts);
                }
                if (review.op === 'cancel') {
                    const { space_id: _space, op: _op, request_key, request_id, ...body } = review;
                    return this.cancelReviewRequest(spaceId, request_id, body, request_key, opts);
                }
                const token = this.token;
                const assignment = await this.getOwnReviewAssignment(spaceId, review.request_id, opts);
                if (opts?.signal?.aborted)
                    throw new Error('Operation aborted');
                if (token !== this.token)
                    throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
                const response = await this.createSession(spaceId, { client_name: review.client_name, client_version: review.client_version }, opts);
                if (opts?.signal?.aborted)
                    throw new Error('Operation aborted');
                if (token !== this.token)
                    throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
                if (!isSession(response.data) || response.data.space_id !== spaceId || response.data.actor_id !== assignment.reviewer_actor_id)
                    throw new ClientProtocolError('Invalid review session response.');
                return response.data;
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