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
export interface WriteOptions {
    signal?: AbortSignal;
    logicalOperationId?: string;
}
export declare class RequestKeyError extends Error {
    readonly code: 'INVALID_OPTIONS' | 'STORE_ERROR' | 'IDENTITY_CHANGED';
    constructor(code: 'INVALID_OPTIONS' | 'STORE_ERROR' | 'IDENTITY_CHANGED', message: string, options?: ErrorOptions);
}
export declare function validateRequestKeyScope(scope: RequestKeyScope, logicalOperationId: string): void;
export declare function requestKeyTuple(scope: RequestKeyScope, logicalOperationId: string): string;
export declare function normalizeServerNamespace(baseUrl: string): string;
//# sourceMappingURL=request-key.d.ts.map