import { CreateReviewRequest } from '@detuned/protocol';
import { StoragePort, HasherPort, ClockPort, IdGeneratorPort } from '@detuned/core';
export interface ManifestItem {
    type: string;
    id: string;
    revision: number | null;
    hash: string;
}
export interface ReviewSnapshotManifest {
    target: {
        post_id: string;
        revision: number;
        content_hash: string;
    };
    dependencies: {
        post_id: string;
        revision: number;
        content_hash: string;
    }[];
    artifact_ids: string[];
    code_refs: {
        repository: string;
        commit: string;
        reproduction_instructions: string;
    }[];
    declared_contributors: string[];
    policy_revision: number;
    required_checks: string[];
}
export declare class ReviewModule {
    private readonly storage;
    private readonly hasher;
    private readonly clock;
    private readonly idGen;
    constructor(storage: StoragePort, hasher: HasherPort, clock: ClockPort, idGen: IdGeneratorPort);
    generateSnapshotManifest(spaceId: string, req: CreateReviewRequest): {
        manifest: ReviewSnapshotManifest;
        manifestHash: string;
    };
}
//# sourceMappingURL=index.d.ts.map