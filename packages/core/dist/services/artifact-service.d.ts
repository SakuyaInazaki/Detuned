import { ArtifactLimits, ArtifactMetadata, CreateArtifactMetadata, type ResourceLimits, type ReadableArtifactMetadata, type ReviewArtifactMetadata } from '@detuned/protocol';
import { BlobStorePort, StagedBlob } from '../ports/blob-store.js';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { AuthenticatedContext, AuthService } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
export interface CreateArtifactInput {
    staged: StagedBlob;
    mime: string;
    metadata: CreateArtifactMetadata;
}
export interface ArtifactContent {
    metadata: ReadableArtifactMetadata;
    chunks: AsyncIterable<Uint8Array>;
    dispose(): Promise<void>;
    download_name: string;
}
export declare class ArtifactService {
    private readonly storage;
    private readonly blobs;
    private readonly auth;
    private readonly idempotency;
    private readonly idGen;
    private readonly clock;
    private readonly limits;
    private readonly resourceLimits;
    constructor(storage: StoragePort, blobs: BlobStorePort, auth: AuthService, idempotency: IdempotencyService, idGen: IdGeneratorPort, clock: ClockPort, limits: ArtifactLimits, resourceLimits?: Partial<ResourceLimits>);
    authorizeUpload(auth: AuthenticatedContext, spaceId: string): void;
    private authorizeRead;
    getMetadata(auth: AuthenticatedContext, spaceId: string, id: string): Promise<ReadableArtifactMetadata>;
    getContent(auth: AuthenticatedContext, spaceId: string, id: string): Promise<ArtifactContent>;
    private toReadableMetadata;
    authorizeReviewUploadForRequest(auth: AuthenticatedContext, spaceId: string, requestId: string): string;
    private authorizeReviewUpload;
    create(auth: AuthenticatedContext, spaceId: string, input: CreateArtifactInput, requestKey: string): Promise<ArtifactMetadata>;
    createForReview(auth: AuthenticatedContext, spaceId: string, assignmentId: string, input: CreateArtifactInput, requestKey: string): Promise<ReviewArtifactMetadata>;
    authorizeCheckUpload(auth: AuthenticatedContext, spaceId: string, runId: string, fresh?: boolean): void;
    createForCheck(auth: AuthenticatedContext, spaceId: string, runId: string, input: CreateArtifactInput, key: string): Promise<ArtifactMetadata>;
    private authorizeCheckRead;
    getCheckMetadata(auth: AuthenticatedContext, spaceId: string, runId: string, id: string): Promise<ArtifactMetadata>;
    getCheckContent(auth: AuthenticatedContext, spaceId: string, runId: string, id: string): Promise<ArtifactContent>;
    private createInternal;
}
//# sourceMappingURL=artifact-service.d.ts.map