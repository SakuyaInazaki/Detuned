import { StoragePort } from '../ports/storage.js';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';
export type NestedRelationRef = {
    id: string;
    version: number;
    state: 'open' | 'resolved';
};
export type IdempotencyResultRef = {
    v: 1;
    kind: 'space';
    space_id: string;
    revision: number;
} | {
    v: 1;
    kind: 'thread.create';
    thread_id: string;
    thread_version: number;
    initial_post_id?: string;
    initial_post_revision?: number;
    relation_ids?: string[];
    relations?: NestedRelationRef[];
} | {
    v: 1;
    kind: 'thread.patch';
    thread_id: string;
    thread_version: number;
} | {
    v: 1;
    kind: 'post';
    post_id: string;
    revision: number;
    relation_ids?: string[];
    relations?: NestedRelationRef[];
} | {
    v: 1;
    kind: 'post.withdraw';
    post_id: string;
} | {
    v: 1;
    kind: 'relation.create';
    relation_id: string;
    relation_version: number;
    relation_state: 'open' | 'resolved';
} | {
    v: 1;
    kind: 'relation.resolve' | 'relation.reopen';
    relation_id: string;
    relation_version: number;
    relation_state: 'open' | 'resolved';
    resolution_id: string;
} | {
    v: 1;
    kind: 'admin.redaction';
    redaction_id: string;
} | {
    v: 1;
    kind: 'unreplayable';
    op: string;
    reason: string;
};
export type OperationFamily = 'space.create' | 'space.patch' | 'thread.create' | 'thread.patch' | 'post.create' | 'post.revision' | 'post.withdraw' | 'relation.create' | 'relation.resolve' | 'relation.reopen' | 'admin.redaction';
export interface ParsedOperation {
    family: OperationFamily;
    expectedKind: IdempotencyResultRef['kind'];
    targetId?: string;
}
export declare function parseOperation(operation: string): ParsedOperation;
export declare function getExpectedKindForOperation(operation: string): string | null;
export declare function hasForbiddenContent(val: unknown, depth?: number): boolean;
export declare const REGISTERED_UNREPLAYABLE_REASONS: readonly ["historical_relation_version_unrecoverable", "historical_thread_version_unrecoverable"];
export type RegisteredUnreplayableReason = (typeof REGISTERED_UNREPLAYABLE_REASONS)[number];
export declare const allowedKeysByKind: Record<string, string[]>;
export declare function parseAndValidateLegacyRevision(value: unknown, fieldName: string): number | undefined;
export declare function resolveLegacyRevision(topRevVal: unknown, nestedRevVal: unknown, entityName: string): number | undefined;
export declare function parseAndValidateVersion(value: unknown, fieldName: string): number | undefined;
export declare function parseAndValidateState(value: unknown, fieldName: string): 'open' | 'resolved' | undefined;
export declare function validateLegacyRelationIds(value: unknown, fieldName: string): string[];
export interface NormalizedLegacyRelation {
    id: string;
    version?: number;
    state?: 'open' | 'resolved';
}
export declare function validateLegacyRelations(value: unknown, fieldName: string): NormalizedLegacyRelation[];
export declare function resolveArrayAlias<T>(topVal: unknown, nestedVal: unknown, fieldName: string, validator: (val: unknown, name: string) => T[]): {
    provided: boolean;
    value?: T[];
};
export interface ProcessLegacyRelationsResult {
    kind: 'resolved' | 'unreplayable' | 'omitted';
    relation_ids?: string[];
    relations?: NestedRelationRef[];
    unreplayableRef?: IdempotencyResultRef;
}
export declare function processLegacyRelations(storage: StoragePort, spaceId: string | undefined, postId: string, revisionNum: number, operation: string, relIdsRes: {
    provided: boolean;
    value?: string[];
}, relsRes: {
    provided: boolean;
    value?: NormalizedLegacyRelation[];
}): ProcessLegacyRelationsResult;
export declare function validateNestedRelationsFormat(obj: any, label: string): void;
export declare function validateNestedRelationsKnownFacts(storage: StoragePort, spaceId: string | undefined, sourcePostId: string, sourceRevision: number, relationIds?: string[], relations?: Array<{
    id: string;
    version?: number;
    state?: string;
} | any>): void;
export declare function validateStoredResultRefPrecheck(storage: StoragePort, operation: string, spaceId: string, parsed: any): void;
export declare function validateResultRef(operation: string, raw: unknown): IdempotencyResultRef;
export declare function validateResultRefSemantics(tx: StoragePort, operation: string, spaceId: string, ref: IdempotencyResultRef | any): void;
export declare function extractResultRef(operation: string, result: any): string;
export declare const encodeResult: typeof extractResultRef;
export declare function normalizeLegacyResultRef(tx: StoragePort, operation: string, parsed: any, spaceId?: string): IdempotencyResultRef;
export declare function reconstructResult(tx: StoragePort, operation: string, resultRefStr: string, spaceId?: string): any;
export declare class IdempotencyService {
    private readonly storage;
    private readonly hasher;
    private readonly clock;
    constructor(storage: StoragePort, hasher: HasherPort, clock: ClockPort);
    executeIdempotent<T>(actorId: string, spaceId: string, operation: string, key: string, payload: unknown, statusCode: number, action: (tx: StoragePort) => T): {
        data: T;
        isReplay: boolean;
    };
}
//# sourceMappingURL=idempotency-service.d.ts.map