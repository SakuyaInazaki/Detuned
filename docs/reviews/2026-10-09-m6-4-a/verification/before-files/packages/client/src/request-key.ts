/** Local recovery metadata; never a business idempotency or permission decision. */
export interface RequestKeyScope {
  serverNamespace: string;
  actorId: string;
  spaceId: string | null;
  operation: string;
  target: string | null;
}
export interface RequestKeyStore {
  getOrCreate(scope: RequestKeyScope, logicalOperationId: string): Promise<string>;
}
export interface WriteOptions { signal?: AbortSignal; logicalOperationId?: string }
export class RequestKeyError extends Error {
  constructor(public readonly code: 'INVALID_OPTIONS' | 'STORE_ERROR' | 'IDENTITY_CHANGED', message: string, options?: ErrorOptions) {
    super(message, options); this.name = 'RequestKeyError';
  }
}
function field(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && new TextEncoder().encode(value).length <= maximum;
}
export function validateRequestKeyScope(scope: RequestKeyScope, logicalOperationId: string): void {
  const keys = ['serverNamespace', 'actorId', 'spaceId', 'operation', 'target'];
  if (!scope || Object.keys(scope).length !== keys.length || keys.some(key => !Object.hasOwn(scope, key)) ||
      !field(scope.serverNamespace, 4096) || !field(scope.actorId, 512) || !field(scope.operation, 128) ||
      !(scope.spaceId === null || field(scope.spaceId, 512)) || !(scope.target === null || field(scope.target, 512)) ||
      !field(logicalOperationId, 512)) throw new RequestKeyError('INVALID_OPTIONS', 'Invalid persistent request key scope or logical operation ID.');
  const targets: Record<string, boolean> = { 'admin.redaction': false, 'artifact.create': false, 'space.create': false, 'space.patch': true, 'thread.create': false, 'thread.patch': true, 'post.create': true, 'post.revision': true, 'post.withdraw': true, 'relation.create': false, 'relation.resolve': true, 'relation.reopen': true };
  if (!Object.hasOwn(targets, scope.operation) || (scope.operation === 'space.create' ? scope.spaceId !== null : scope.spaceId === null) || (targets[scope.operation] ? scope.target === null : scope.target !== null)) {
    throw new RequestKeyError('INVALID_OPTIONS', 'Invalid persistent operation or target scope.');
  }
}
export function requestKeyTuple(scope: RequestKeyScope, logicalOperationId: string): string {
  validateRequestKeyScope(scope, logicalOperationId);
  return JSON.stringify([1, scope.serverNamespace, scope.actorId, scope.spaceId, scope.operation, scope.target, logicalOperationId]);
}
export function normalizeServerNamespace(baseUrl: string): string {
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new RequestKeyError('INVALID_OPTIONS', 'Persistent request keys require an absolute HTTP URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || baseUrl.includes('?') || baseUrl.includes('#')) {
    throw new RequestKeyError('INVALID_OPTIONS', 'Persistent request key URL must not contain credentials, query or fragment.');
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
