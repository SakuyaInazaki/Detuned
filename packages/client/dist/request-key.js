export class RequestKeyError extends Error {
    code;
    constructor(code, message, options) {
        super(message, options);
        this.code = code;
        this.name = 'RequestKeyError';
    }
}
function field(value, maximum) {
    return typeof value === 'string' && value.trim().length > 0 && new TextEncoder().encode(value).length <= maximum;
}
export function validateRequestKeyScope(scope, logicalOperationId) {
    const keys = ['serverNamespace', 'actorId', 'spaceId', 'operation', 'target'];
    if (!scope || Object.keys(scope).length !== keys.length || keys.some(key => !Object.hasOwn(scope, key)) ||
        !field(scope.serverNamespace, 4096) || !field(scope.actorId, 512) || !field(scope.operation, 128) ||
        !(scope.spaceId === null || field(scope.spaceId, 512)) || !(scope.target === null || field(scope.target, 512)) ||
        !field(logicalOperationId, 512))
        throw new RequestKeyError('INVALID_OPTIONS', 'Invalid persistent request key scope or logical operation ID.');
    const targets = { 'check.run.create': true, 'check.run.invalidate': true, 'review.request.create': false, 'review.request.cancel': true, 'review.request.finalize': true, 'review.submission.create': true, 'artifact.review.create': true, 'admin.redaction': false, 'artifact.create': false, 'space.create': false, 'space.patch': true, 'thread.create': false, 'thread.patch': true, 'post.create': true, 'post.revision': true, 'post.withdraw': true, 'relation.create': false, 'relation.resolve': true, 'relation.reopen': true };
    if (!Object.hasOwn(targets, scope.operation) || (scope.operation === 'space.create' ? scope.spaceId !== null : scope.spaceId === null) || (targets[scope.operation] ? scope.target === null : scope.target !== null)) {
        throw new RequestKeyError('INVALID_OPTIONS', 'Invalid persistent operation or target scope.');
    }
}
export function requestKeyTuple(scope, logicalOperationId) {
    validateRequestKeyScope(scope, logicalOperationId);
    return JSON.stringify([1, scope.serverNamespace, scope.actorId, scope.spaceId, scope.operation, scope.target, logicalOperationId]);
}
export function normalizeServerNamespace(baseUrl) {
    let url;
    try {
        url = new URL(baseUrl);
    }
    catch {
        throw new RequestKeyError('INVALID_OPTIONS', 'Persistent request keys require an absolute HTTP URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || baseUrl.includes('?') || baseUrl.includes('#')) {
        throw new RequestKeyError('INVALID_OPTIONS', 'Persistent request key URL must not contain credentials, query or fragment.');
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
//# sourceMappingURL=request-key.js.map