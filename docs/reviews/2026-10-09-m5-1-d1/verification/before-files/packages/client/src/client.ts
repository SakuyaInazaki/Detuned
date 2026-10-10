import { WEB_AUTH_PATH, WEB_CSRF_HEADER, isWebSessionResponse, type WebSessionResponse } from '@detuned/protocol';
import { artifactMetadata, snapshotUpload, downloadArtifactBytes, waitForArtifact, readArtifactJson, type ArtifactDownload } from './artifact-transfer.js';
export type { ArtifactDownload } from './artifact-transfer.js';
import { streamSpaceExport, type SpaceExportOptions } from './export-stream.js';
export type { SpaceExportOptions } from './export-stream.js';
import { RequestKeyError, normalizeServerNamespace, validateRequestKeyScope, type RequestKeyStore, type WriteOptions } from './request-key.js';
import {
  Actor,
  Membership,
  CreateActorRequest,
  CreateCredentialRequest,
  CreateMembershipRequest,
  PatchMembershipRequest,
  CreateRedactionRequest,
  CreateCredentialData,
  RevokeCredentialData,
  DeactivateMembershipData,
  RedactionResult,
  ArtifactMetadata,
  CreateArtifactMetadata,
  ErrorCode,
  ErrorCodeType,
  DetunedError,
  PostRef,
  CreateSpaceRequest,
  CreateSessionRequest,
  Session,
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
  ContextResponseData,
  ContextPage,
  ThreadPostsPage,
  ThreadPostsReadQuery,
  PostRevisionContentPage,
  PostRevisionReadQuery,
  SpaceRevisionPage,
  SpaceRevisionReadQuery,
  validateToolReadParams,
  validateToolContextParams,
  ViewResponseData,
  SearchQuery,
  SearchPage,
  SearchResultItem,
  ViewName,
} from '@detuned/protocol';

export class UserAbortError extends Error {
  readonly isUserAbort = true;
  constructor(message = 'Operation aborted by user') {
    super(message);
    this.name = 'UserAbortError';
  }
}

export class TimeoutError extends Error {
  readonly isTimeout = true;
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ClientProtocolError extends Error {
  readonly isProtocolError = true;
  constructor(message: string) {
    super(message);
    this.name = 'ClientProtocolError';
  }
}

export class ClientTransportError extends Error {
  readonly isTransportError = true;
  readonly isDetunedError = false;
  readonly isUserAbort = false;
  readonly isTimeout = false;
  readonly kind = 'transport' as const;
  readonly code: string | null;
  readonly statusCode: number | null;
  readonly retryable: boolean;

  constructor(
    message: string,
    options?: { cause?: unknown; retryable?: boolean; code?: string }
  ) {
    super(message, options ? { cause: options.cause } : undefined);
    this.name = 'ClientTransportError';
    this.code = options?.code ?? 'TRANSPORT_ERROR';
    this.statusCode = null;
    this.retryable = options?.retryable ?? false;
  }
}

function parseRetryAfter(
  header: string | null | undefined,
  maxBudgetMs = 120000
): { delayMs: number; exceedsBudget: boolean } | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  let ms: number | undefined;
  if (/^\d+$/.test(trimmed)) {
    const sec = parseInt(trimmed, 10);
    if (!Number.isNaN(sec) && sec >= 0) {
      ms = sec * 1000;
    }
  } else {
    const dateMs = Date.parse(trimmed);
    if (!Number.isNaN(dateMs)) {
      const diff = dateMs - Date.now();
      ms = Math.max(0, diff);
    }
  }
  if (ms === undefined) return undefined;
  const NODE_MAX_TIMEOUT_MS = 2147483647;
  if (!Number.isFinite(ms) || ms > maxBudgetMs || ms > NODE_MAX_TIMEOUT_MS) {
    return { delayMs: ms, exceedsBudget: true };
  }
  return { delayMs: ms, exceedsBudget: false };
}

function isNetworkError(err: any): boolean {
  if (!err) return false;
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

async function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new UserAbortError();
  }
  return new Promise<void>((resolve, reject) => {
    let timer: any;
    let onAbort: (() => void) | undefined;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
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

export interface DetunedClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
  maxRetries?: number;
  maxRetryAfterMs?: number;
  requestKeyStore?: RequestKeyStore;
  browserSession?: { getCsrfToken: () => string | undefined };
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
  private browserSession?: { getCsrfToken: () => string | undefined };
  private baseUrl: string;
  private requestKeyStore?: RequestKeyStore;
  private token?: string;
  private timeoutMs: number;
  private maxRetries: number;
  private maxRetryAfterMs: number;

  constructor(options: DetunedClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.browserSession = options.browserSession;
    this.requestKeyStore = options.requestKeyStore;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? 120000;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async request<T>(opts: RequestOptions): Promise<{ data: T; meta?: any }> {
    return this.requestWithBody<T>(opts);
  }

  private async requestWithBody<T>(opts: RequestOptions, bodyFactory?: () => FormData, artifactJson = !!bodyFactory, retryBudget = this.maxRetries, webAuth?: { token?: string; noContent?: boolean }): Promise<{ data: T; meta?: any }> {
    let url = `${this.baseUrl}${webAuth ? '' : '/api/v1'}${opts.path}`;
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
    const bearer = webAuth ? webAuth.token : this.browserSession ? undefined : this.token;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if ((this.browserSession || webAuth) && (!webAuth || webAuth.noContent) && opts.method !== 'GET') {
      const csrf = this.browserSession?.getCsrfToken();
      if (csrf !== undefined) headers[WEB_CSRF_HEADER] = csrf;
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

      type AttemptOutcome =
        | { kind: 'success'; value: { data: T; meta?: any } }
        | { kind: 'retry'; delay: number }
        | { kind: 'error'; error: Error };

      let outcome: AttemptOutcome | undefined;

      const controller = new AbortController();
      let onExternalAbort: (() => void) | undefined;
      let isTimedOut = false;
      let isUserAborted = false;

      if (opts.signal) {
        if (opts.signal.aborted) {
          isUserAborted = true;
          controller.abort();
        } else {
          onExternalAbort = () => {
            isUserAborted = true;
            controller.abort();
          };
          opts.signal.addEventListener('abort', onExternalAbort, { once: true });
        }
      }

      let timeoutId: any;
      if (this.timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          isTimedOut = true;
          controller.abort();
        }, this.timeoutMs);
      }

      let artifactResponse: Response | undefined;
      try {
        let res: Response | undefined;
        try {
          const fetching = fetch(url, {
            method: opts.method,
            credentials: (this.browserSession || webAuth) ? 'same-origin' : undefined,
            headers,
            body: bodyFactory ? bodyFactory() : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            signal: controller.signal,
          });
          if (artifactJson) fetching.then(value => { artifactResponse = value; if (controller.signal.aborted && !value.body?.locked) void value.body?.cancel().catch(() => {}); }, () => {});
          res = artifactJson ? await waitForArtifact(fetching, controller.signal, () => isTimedOut ? new TimeoutError() : new UserAbortError()) : await fetching;
        } catch (fetchErr: any) {
          if (isUserAborted || opts.signal?.aborted || fetchErr instanceof UserAbortError) {
            outcome = { kind: 'error', error: new UserAbortError() };
          } else if (isTimedOut || fetchErr instanceof TimeoutError) {
            outcome = {
              kind: 'error',
              error: new TimeoutError(`Request timed out after ${this.timeoutMs}ms`),
            };
          } else if (fetchErr?.name === 'AbortError') {
            // Unsolicited abort from upstream/network (not user cancellation, not timeout)
            if (attempts <= retryBudget) {
              const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
              outcome = { kind: 'retry', delay };
            } else {
              outcome = {
                kind: 'error',
                error: new ClientTransportError(fetchErr.message || 'Upstream connection aborted', {
                  cause: fetchErr,
                  retryable: true,
                  code: 'ABORT_ERROR',
                }),
              };
            }
          } else if (isNetworkError(fetchErr)) {
            if (attempts <= retryBudget) {
              const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
              outcome = { kind: 'retry', delay };
            } else {
              outcome = {
                kind: 'error',
                error: new ClientTransportError(fetchErr.message, {
                  cause: fetchErr,
                  retryable: true,
                  code: fetchErr.cause?.code ?? fetchErr.code ?? 'NETWORK_ERROR',
                }),
              };
            }
          } else {
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
          } else if (isTimedOut) {
            outcome = {
              kind: 'error',
              error: new TimeoutError(`Request timed out after ${this.timeoutMs}ms`),
            };
          } else {
            if (webAuth?.noContent && res.status === 204) return { data: undefined as T };
            if (webAuth?.noContent && res.ok) throw new ClientProtocolError('Invalid web logout response.');
            let json: any = null;
            try {
              json = artifactJson ? await readArtifactJson(res, controller.signal, () => isTimedOut ? new TimeoutError() : new UserAbortError()) : await res.json();
            } catch (jsonErr: any) {
              if (artifactJson && jsonErr instanceof ClientProtocolError) {
                outcome = { kind: 'error', error: jsonErr };
              } else if (isUserAborted || opts.signal?.aborted) {
                outcome = { kind: 'error', error: new UserAbortError() };
              } else if (isTimedOut) {
                outcome = {
                  kind: 'error',
                  error: new TimeoutError(`Request timed out after ${this.timeoutMs}ms`),
                };
              } else {
                const isNonRetryableStatus = [400, 401, 403, 404, 409, 413, 422].includes(res.status);
                if (isNonRetryableStatus) {
                  // Do not retry non-retryable statuses even if body reading fails;
                  // will fall through to error handling below with json=null.
                } else if (jsonErr?.name === 'AbortError') {
                  // Unsolicited abort from stream
                  if (attempts <= retryBudget) {
                    const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                    outcome = { kind: 'retry', delay };
                  } else {
                    outcome = {
                      kind: 'error',
                      error: new ClientTransportError(jsonErr.message || 'Stream connection aborted', {
                        cause: jsonErr,
                        retryable: true,
                        code: 'ABORT_ERROR',
                      }),
                    };
                  }
                } else if (isNetworkError(jsonErr)) {
                  if (attempts <= retryBudget) {
                    const delay = Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                    outcome = { kind: 'retry', delay };
                  } else {
                    outcome = {
                      kind: 'error',
                      error: new ClientTransportError(jsonErr.message || 'Network stream error', {
                        cause: jsonErr,
                        retryable: true,
                        code: jsonErr.cause?.code ?? jsonErr.code ?? 'NETWORK_ERROR',
                      }),
                    };
                  }
                } else if (res.ok) {
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
              } else if (isTimedOut) {
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
                } else if (json.api_version !== '1') {
                  outcome = {
                    kind: 'error',
                    error: new ClientProtocolError(`不支持的 API 版本: ${json.api_version}`),
                  };
                } else if (typeof json.request_id !== 'string' || json.request_id.trim() === '') {
                  outcome = {
                    kind: 'error',
                    error: new ClientProtocolError('响应体缺少有效的 request_id。'),
                  };
                } else if (!('data' in json)) {
                  outcome = {
                    kind: 'error',
                    error: new ClientProtocolError('响应体缺少必需的 data 字段。'),
                  };
                } else if (json.error !== undefined && json.error !== null) {
                  outcome = {
                    kind: 'error',
                    error: new ClientProtocolError('成功响应中不能包含 error 字段。'),
                  };
                } else {
                  outcome = { kind: 'success', value: { data: json.data, meta: json.meta } };
                }
              } else {
                const errDetail = json?.error;
                const code: ErrorCodeType =
                  errDetail?.code ??
                  (res.status === 429
                    ? ErrorCode.RATE_LIMITED
                    : res.status >= 500
                    ? ErrorCode.TEMPORARILY_UNAVAILABLE
                    : ErrorCode.VALIDATION_ERROR);
                const message: string = errDetail?.message ?? `HTTP ${res.status} 请求失败`;
                const serverReportedRetryable = errDetail?.retryable;

                const isNonRetryableStatus = [400, 401, 403, 404, 409, 413, 422].includes(res.status);
                const retryable =
                  !isNonRetryableStatus &&
                  (res.status === 429 ||
                    [502, 503, 504].includes(res.status) ||
                    serverReportedRetryable === true);

                if (
                  retryable &&
                  attempts <= retryBudget &&
                  !opts.signal?.aborted &&
                  !isUserAborted &&
                  !isTimedOut
                ) {
                  const retryAfterHeader =
                    typeof res.headers?.get === 'function'
                      ? res.headers.get('retry-after') ?? res.headers.get('Retry-After')
                      : (res.headers as any)?.['retry-after'] ?? (res.headers as any)?.['Retry-After'];
                  const retryParsed = parseRetryAfter(retryAfterHeader, this.maxRetryAfterMs);

                  if (retryParsed?.exceedsBudget) {
                    // Oversized Retry-After stops automatic retries immediately and throws server error
                    outcome = {
                      kind: 'error',
                      error: new DetunedError(code, message, res.status, retryable, errDetail?.details),
                    };
                  } else {
                    const delay =
                      retryParsed !== undefined
                        ? retryParsed.delayMs
                        : Math.min(1000 * Math.pow(2, attempts - 1) + Math.random() * 500, 10000);
                    outcome = { kind: 'retry', delay };
                  }
                } else {
                  outcome = {
                    kind: 'error',
                    error: new DetunedError(code, message, res.status, retryable, errDetail?.details),
                  };
                }
              }
            }
          }
        }
      } finally {
        if (artifactJson && artifactResponse && !artifactResponse.body?.locked) void artifactResponse.body?.cancel().catch(() => {});
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        if (opts.signal && onExternalAbort) {
          opts.signal.removeEventListener('abort', onExternalAbort);
          onExternalAbort = undefined;
        }
      }

      if (outcome!.kind === 'success') {
        return outcome!.value;
      }
      if (outcome!.kind === 'error') {
        throw outcome!.error;
      }
      if (outcome!.kind === 'retry') {
        await sleepWithAbort(outcome!.delay, opts.signal);
        continue;
      }
    }
  }

  private async write<T>(scope: { spaceId: string | null; operation: string; target: string | null }, request: RequestOptions, opts?: WriteOptions): Promise<{ data: T; meta?: any }> {
    if (opts?.logicalOperationId === undefined) return this.request<T>(request);
    const token = this.token;
    const prepared = await this.prepareWriteKey(scope, request.requestKey, opts);
    if (token !== this.token) throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
    if (opts.signal?.aborted) throw new UserAbortError();
    return this.request<T>({ ...request, requestKey: prepared });
  }

  private async prepareWriteKey(scope: { spaceId: string | null; operation: string; target: string | null }, explicitKey?: string, opts?: WriteOptions): Promise<string | undefined> {
    if (opts?.logicalOperationId === undefined) return explicitKey;
    if (explicitKey !== undefined || !this.requestKeyStore) throw new RequestKeyError('INVALID_OPTIONS', 'Persistent operation requires a store and cannot include an explicit request key.');
    const token = this.token;
    const check = () => {
      if (opts.signal?.aborted) throw new UserAbortError();
      if (token !== this.token) throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
    };
    check();
    const serverNamespace = normalizeServerNamespace(this.baseUrl);
    const me = await this.getMe({ signal: opts.signal });
    check();
    const actorId = me.data?.actor?.id;
    if (typeof actorId !== 'string' || !actorId.trim()) throw new ClientProtocolError('Authenticated actor ID is missing.');
    const fullScope = { serverNamespace, actorId, ...scope };
    validateRequestKeyScope(fullScope, opts.logicalOperationId);
    const pending = Promise.resolve().then(() => this.requestKeyStore!.getOrCreate(fullScope, opts.logicalOperationId!));
    let onAbort: (() => void) | undefined;
    let requestKey: string;
    try {
      const aborted = new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(new UserAbortError());
        opts.signal?.addEventListener('abort', onAbort, { once: true });
        if (opts.signal?.aborted) onAbort();
      });
      requestKey = await Promise.race([pending, aborted]);
    } finally { if (onAbort) opts.signal?.removeEventListener('abort', onAbort); }
    check();
    if (typeof requestKey !== 'string' || !requestKey.trim()) throw new RequestKeyError('STORE_ERROR', 'Request key store returned an invalid key.');
    return requestKey;
  }

  async createActor(body: CreateActorRequest, opts?: { signal?: AbortSignal }): Promise<Actor> {
    return (await this.requestWithBody<Actor>({ method: 'POST', path: '/admin/actors', body, signal: opts?.signal }, undefined, false, 0)).data;
  }

  async createCredential(body: CreateCredentialRequest, opts?: { signal?: AbortSignal }): Promise<CreateCredentialData> {
    return (await this.requestWithBody<CreateCredentialData>({ method: 'POST', path: '/admin/credentials', body, signal: opts?.signal }, undefined, false, 0)).data;
  }

  async revokeCredential(credentialId: string, opts?: { signal?: AbortSignal }): Promise<RevokeCredentialData> {
    return (await this.requestWithBody<RevokeCredentialData>({ method: 'POST', path: `/admin/credentials/${encodeURIComponent(credentialId)}/revoke`, signal: opts?.signal }, undefined, false, 0)).data;
  }

  async createMembership(spaceId: string, body: CreateMembershipRequest, opts?: { signal?: AbortSignal }): Promise<Membership> {
    return (await this.requestWithBody<Membership>({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/memberships`, body, signal: opts?.signal }, undefined, false, 0)).data;
  }

  async patchMembership(spaceId: string, actorId: string, body: PatchMembershipRequest, opts?: { signal?: AbortSignal }): Promise<Membership> {
    return (await this.requestWithBody<Membership>({ method: 'PATCH', path: `/spaces/${encodeURIComponent(spaceId)}/memberships/${encodeURIComponent(actorId)}`, body, signal: opts?.signal }, undefined, false, 0)).data;
  }

  async deactivateMembership(spaceId: string, actorId: string, opts?: { signal?: AbortSignal }): Promise<DeactivateMembershipData> {
    return (await this.requestWithBody<DeactivateMembershipData>({ method: 'DELETE', path: `/spaces/${encodeURIComponent(spaceId)}/memberships/${encodeURIComponent(actorId)}`, signal: opts?.signal }, undefined, false, 0)).data;
  }

  async redact(spaceId: string, body: CreateRedactionRequest, requestKey?: string, opts?: WriteOptions): Promise<RedactionResult> {
    return (await this.write<RedactionResult>({ spaceId, operation: 'admin.redaction', target: null }, { method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/redactions`, body, requestKey, signal: opts?.signal }, opts)).data;
  }

  async uploadArtifact(spaceId: string, file: Blob, metadata: CreateArtifactMetadata = {}, requestKey?: string, opts?: WriteOptions): Promise<ArtifactMetadata> {
    const snapshot = await snapshotUpload(file, metadata, opts?.signal);
    const token = this.token;
    const key = await this.prepareWriteKey({ spaceId, operation: 'artifact.create', target: null }, requestKey, opts);
    if (opts?.logicalOperationId !== undefined && token !== this.token) throw new RequestKeyError('IDENTITY_CHANGED', 'Credential changed while preparing a persistent write.');
    if (opts?.signal?.aborted) throw new UserAbortError();
    const result = await this.requestWithBody<unknown>({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/artifacts`, requestKey: key, signal: opts?.signal }, () => {
      const form = new FormData();
      form.append('metadata', snapshot.metadataJson);
      form.append('file', snapshot.blob, 'upload.bin');
      return form;
    });
    const value = artifactMetadata(result.data, spaceId);
    if (value.bytes !== snapshot.bytes || value.sha256 !== snapshot.sha256) throw new ClientProtocolError('Artifact upload integrity check failed.');
    return value;
  }

  async getArtifact(spaceId: string, artifactId: string, opts?: { signal?: AbortSignal }): Promise<ArtifactMetadata> {
    const result = await this.requestWithBody<unknown>({ method: 'GET', path: `/spaces/${encodeURIComponent(spaceId)}/artifacts/${encodeURIComponent(artifactId)}`, signal: opts?.signal }, undefined, true);
    return artifactMetadata(result.data, spaceId, artifactId);
  }

  downloadArtifact(spaceId: string, artifactId: string, opts?: { signal?: AbortSignal }): Promise<ArtifactDownload> {
    return downloadArtifactBytes(this.baseUrl, this.token, spaceId, artifactId, this.timeoutMs, opts?.signal, signal => this.getArtifact(spaceId, artifactId, { signal }), !!this.browserSession);
  }

  exportSpace(spaceId: string, options: SpaceExportOptions) {
    return streamSpaceExport(this.baseUrl, this.token, spaceId, this.timeoutMs, options, !!this.browserSession);
  }

  async createWebSession(token: string, options?: { signal?: AbortSignal }): Promise<WebSessionResponse> {
    const result = await this.requestWithBody<unknown>({ method: 'POST', path: WEB_AUTH_PATH, signal: options?.signal }, undefined, true, 0, { token });
    if (!isWebSessionResponse(result.data)) throw new ClientProtocolError('Invalid web session response.');
    return result.data;
  }
  async getWebSession(options?: { signal?: AbortSignal }): Promise<WebSessionResponse> {
    const result = await this.requestWithBody<unknown>({ method: 'GET', path: WEB_AUTH_PATH, signal: options?.signal }, undefined, true, this.maxRetries, {});
    if (!isWebSessionResponse(result.data)) throw new ClientProtocolError('Invalid web session response.');
    return result.data;
  }
  async deleteWebSession(options?: { signal?: AbortSignal }): Promise<void> {
    await this.requestWithBody({ method: 'DELETE', path: WEB_AUTH_PATH, signal: options?.signal }, undefined, true, 0, { noContent: true });
  }

  // API wrappers
  getLiveness(opts?: { signal?: AbortSignal }) {
    return this.request<import('@detuned/protocol').LivenessData>({ method: 'GET', path: '/health/live', signal: opts?.signal });
  }

  getReadiness(opts?: { signal?: AbortSignal }) {
    return this.request<import('@detuned/protocol').ReadinessData>({ method: 'GET', path: '/health/ready', signal: opts?.signal });
  }

  getCapabilities(opts?: { signal?: AbortSignal }) {
    return this.request<any>({ method: 'GET', path: '/capabilities', signal: opts?.signal });
  }

  getDiagnostics(opts?: { signal?: AbortSignal }) {
    return this.request<import('@detuned/protocol').OperationsDiagnostics>({method:'GET',path:'/admin/diagnostics',signal:opts?.signal});
  }

  getMe(opts?: { signal?: AbortSignal }) {
    return this.request<any>({ method: 'GET', path: '/me', signal: opts?.signal });
  }

  listSpaces(limit?: number, cursor?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any[]>({ method: 'GET', path: '/spaces', query: { limit, cursor }, signal: opts?.signal });
  }

  createSpace(body: CreateSpaceRequest, requestKey?: string, opts?: WriteOptions) {
    return this.write<any>({ spaceId: null, operation: 'space.create', target: null }, { method: 'POST', path: '/spaces', body, requestKey, signal: opts?.signal }, opts);
  }

  patchSpace(spaceId: string, body: PatchSpaceRequest, requestKey?: string, opts?: WriteOptions) {
    return this.write<any>({ spaceId: spaceId, operation: 'space.patch', target: spaceId }, { method: 'PATCH', path: `/spaces/${spaceId}`, body, requestKey, signal: opts?.signal }, opts);
  }

  createSession(spaceId: string, body: CreateSessionRequest, opts?: { signal?: AbortSignal }) {
    return this.requestWithBody<Session>({ method: 'POST', path: `/spaces/${encodeURIComponent(spaceId)}/sessions`, body, signal: opts?.signal }, undefined, false, 0);
  }

  async getContext(spaceId: string, query?: ContextQuery, opts?: { signal?: AbortSignal }): Promise<ContextPage> {
    const result = await this.request<ContextResponseData>({
      method: 'GET',
      path: `/spaces/${spaceId}/context`,
      query: { max_bytes: query?.max_bytes, focus_thread_id: query?.focus_thread_id },
      signal: opts?.signal,
    });
    // Mandatory meta is this endpoint’s static contract, not new runtime validation.
    return result as ContextPage;
  }

  async getSpaceRevision(spaceId: string, revision: number, query: SpaceRevisionReadQuery = {}, opts?: { signal?: AbortSignal }): Promise<SpaceRevisionPage> {
    const result = await this.request<SpaceRevisionPage['data']>({ method: 'GET', path: `/spaces/${spaceId}/revisions/${revision}`, query: { max_bytes: query.max_bytes, cursor: query.cursor }, signal: opts?.signal });
    // This endpoint guarantees required correlated meta; no new runtime response validator.
    return result as SpaceRevisionPage;
  }

  listThreads(spaceId: string, state?: string, limit?: number, cursor?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any[]>({
      method: 'GET',
      path: `/spaces/${spaceId}/threads`,
      query: { state, limit, cursor },
      signal: opts?.signal,
    });
  }

  getThreadPosts(spaceId: string, threadId: string, query?: ThreadPostsReadQuery, opts?: { signal?: AbortSignal }): Promise<ThreadPostsPage> {
    return this.request<ThreadPostsPage['data']>({ method: 'GET', path: `/spaces/${spaceId}/threads/${threadId}/posts`, query, signal: opts?.signal }) as Promise<ThreadPostsPage>;
  }

  getThread(spaceId: string, threadId: string, limit?: number, cursor?: string, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/threads/${threadId}`,
      query: { limit, cursor },
      signal: opts?.signal,
    });
  }

  createThread(spaceId: string, body: CreateThreadRequest, requestKey?: string, opts?: WriteOptions) {
    return this.write<any>({ spaceId: spaceId, operation: 'thread.create', target: null }, {
      method: 'POST',
      path: `/spaces/${spaceId}/threads`,
      body,
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  patchThread(spaceId: string, threadId: string, body: PatchThreadRequest, requestKey?: string, opts?: WriteOptions) {
    return this.write<any>({ spaceId: spaceId, operation: 'thread.patch', target: threadId }, {
      method: 'PATCH',
      path: `/spaces/${spaceId}/threads/${threadId}`,
      body,
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  createPost(spaceId: string, threadId: string, body: CreatePostRequest, requestKey?: string, opts?: WriteOptions) {
    return this.write<any>({ spaceId: spaceId, operation: 'post.create', target: threadId }, {
      method: 'POST',
      path: `/spaces/${spaceId}/threads/${threadId}/posts`,
      body,
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  getPost(spaceId: string, postId: string, revision?: number, opts?: { signal?: AbortSignal }) {
    return this.request<any>({
      method: 'GET',
      path: `/spaces/${spaceId}/posts/${postId}`,
      query: { revision },
      signal: opts?.signal,
    });
  }

  async getPostRevisionContent(spaceId: string, postId: string, revision: number, query: PostRevisionReadQuery = {}, opts?: { signal?: AbortSignal }): Promise<PostRevisionContentPage> {
    const result = await this.request<PostRevisionContentPage['data']>({
      method: 'GET', path: `/spaces/${spaceId}/posts/${postId}/revisions/${revision}`,
      query: { max_bytes: query.max_bytes, cursor: query.cursor }, signal: opts?.signal,
    });
    return { data: result.data, meta: result.meta } as PostRevisionContentPage;
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
    opts?: WriteOptions
  ) {
    return this.write<any>({ spaceId: spaceId, operation: 'post.revision', target: postId }, {
      method: 'POST',
      path: `/spaces/${spaceId}/posts/${postId}/revisions`,
      body,
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  withdrawPost(
    spaceId: string,
    postId: string,
    body: WithdrawPostRequest,
    requestKey?: string,
    opts?: WriteOptions
  ) {
    return this.write<any>({ spaceId: spaceId, operation: 'post.withdraw', target: postId }, {
      method: 'POST',
      path: `/spaces/${spaceId}/posts/${postId}/withdraw`,
      body,
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  createRelation(spaceId: string, body: CreateRelationRequest, requestKey?: string, opts?: WriteOptions) {
    return this.write<any>({ spaceId: spaceId, operation: 'relation.create', target: null }, {
      method: 'POST',
      path: `/spaces/${spaceId}/relations`,
      body,
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  resolveRelation(
    spaceId: string,
    relationId: string,
    expectedVersion: number,
    reasonRef: PostRef,
    requestKey?: string,
    opts?: WriteOptions
  ) {
    return this.write<any>({ spaceId: spaceId, operation: 'relation.resolve', target: relationId }, {
      method: 'POST',
      path: `/spaces/${spaceId}/relations/${relationId}/resolve`,
      body: { expected_version: expectedVersion, reason_ref: reasonRef },
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  reopenRelation(
    spaceId: string,
    relationId: string,
    expectedVersion: number,
    reasonRef: PostRef,
    requestKey?: string,
    opts?: WriteOptions
  ) {
    return this.write<any>({ spaceId: spaceId, operation: 'relation.reopen', target: relationId }, {
      method: 'POST',
      path: `/spaces/${spaceId}/relations/${relationId}/reopen`,
      body: { expected_version: expectedVersion, reason_ref: reasonRef },
      requestKey,
      signal: opts?.signal,
    }, opts);
  }

  async search(spaceId: string, query: SearchQuery, opts?: { signal?: AbortSignal }): Promise<SearchPage> {
    const result = await this.request<SearchResultItem[]>({
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
    return result as SearchPage;
  }

  getView<N extends ViewName>(spaceId: string, name: N, opts?: { signal?: AbortSignal }) {
    return this.request<ViewResponseData<N>>({
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
      body: query ?? {},
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
    return this.request<{ deactivated: true }>({
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
        validateToolContextParams(params);
        return await this.getContext(spaceId, {
          max_bytes: params.max_bytes,
          focus_thread_id: params.focus_thread_id,
        }, opts);

      case 'forum_search':
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
        if (params.kind === 'space') return this.getSpaceRevision(spaceId, params.revision, { max_bytes: params.max_bytes, cursor: params.cursor }, opts);
        if (params.kind === 'thread_posts') return this.getThreadPosts(spaceId, params.id, { limit: params.limit, max_bytes: params.max_bytes, cursor: params.cursor }, opts);
        if (params.kind === 'post_revision') return this.getPostRevisionContent(spaceId, params.id, params.revision, { max_bytes: params.max_bytes, cursor: params.cursor }, opts);
        const { kind, id } = params;
        if (kind === 'post') {
          return (await this.getPost(spaceId, id, params.revision, opts)).data;
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
