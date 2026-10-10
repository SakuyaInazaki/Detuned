import { type PostRef, type CreateReviewRequest, type ReviewPolicy } from '@detuned/protocol';
import { type StoragePort, type HasherPort, type ClockPort, type IdGeneratorPort, AuthService, type AuthenticatedContext } from '@detuned/core';
export interface ReviewSnapshotManifest {
    manifest_version: 1;
    space_id: string;
    target: {
        ref: PostRef;
        content_hash: string;
        statement: string;
        assumptions: string[];
        scope: string;
        falsification_plan: string;
    };
    dependencies: {
        ref: PostRef;
        content_hash: string;
    }[];
    artifacts: {
        artifact_id: string;
        sha256: string;
        bytes: number;
    }[];
    code_refs: CreateReviewRequest['code_refs'];
    rules_revision: number;
    policy_revision: number;
    review_policy: ReviewPolicy;
    check_profiles: {
        check_name: string;
        config_sha256: string;
        verifier_actor_ids: string[];
        description: string;
    }[];
    contributors: string[];
    reproduction_instructions: string;
}
/** Material construction only: neither reviewer eligibility nor a persisted review round. */
export declare class ReviewModule {
    private readonly storage;
    private readonly hasher;
    private readonly clock;
    private readonly idGen;
    private readonly authService;
    constructor(storage: StoragePort, hasher: HasherPort, clock: ClockPort, idGen: IdGeneratorPort, authService: AuthService);
    generateSnapshotManifest(auth: AuthenticatedContext, spaceId: string, req: CreateReviewRequest): {
        manifest: ReviewSnapshotManifest;
        manifestHash: string;
    };
}
export * from './request-service.js';
export * from "./submission-service.js";
export * from './finalization-service.js';
export * from './status-service.js';
export { ReviewPostCatalogService } from './post-catalog-service.js';
//# sourceMappingURL=index.d.ts.map