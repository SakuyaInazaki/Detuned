import { Artifact, ArtifactLimits, ArtifactMetadata, CreateArtifactMetadata, DetunedError, ErrorCode, normalizeArtifactMime, resolveArtifactLimits, resolveResourceLimits, type ResourceLimits, type ReadableArtifactMetadata, type ReviewArtifactMetadata, isArtifactMetadata, toArtifactMetadata } from '@detuned/protocol';
import { BlobStorePort, StagedBlob } from '../ports/blob-store.js';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { AuthenticatedContext, AuthService } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
import { assertReviewArtifactReadAccess } from './review-artifact-access.js';
import { readReviewSnapshotRecords, reconstructReviewRequestView, assertReviewSnapshotCurrent } from './review-request-records.js';
import { resourceQuotaError } from './resource-quota.js';

export interface CreateArtifactInput { staged: StagedBlob; mime: string; metadata: CreateArtifactMetadata }
export interface ArtifactContent { metadata: ReadableArtifactMetadata; chunks: AsyncIterable<Uint8Array>; dispose(): Promise<void>; download_name: string }
export class ArtifactService {
  private readonly limits: ArtifactLimits;
  private readonly resourceLimits: ResourceLimits;
  constructor(private readonly storage: StoragePort, private readonly blobs: BlobStorePort,
    private readonly auth: AuthService, private readonly idempotency: IdempotencyService,
    private readonly idGen: IdGeneratorPort, private readonly clock: ClockPort, limits: ArtifactLimits, resourceLimits?: Partial<ResourceLimits>) {
    this.limits = resolveArtifactLimits(limits);
    this.resourceLimits = resolveResourceLimits(resourceLimits);
  }
  authorizeUpload(auth: AuthenticatedContext, spaceId: string): void {
    this.auth.requireSpaceAccess(this.auth.refreshContext(auth), spaceId, 'contributor');
  }
  private authorizeRead(auth: AuthenticatedContext, spaceId: string, id: string): Artifact {
    this.auth.requireSpaceAccess(this.auth.refreshContext(auth), spaceId, 'observer');
    const artifact = this.storage.findArtifactById(id);
    if (!artifact || artifact.space_id !== spaceId || (artifact.visibility !== 'space' && artifact.visibility !== 'review_assignment')) throw new DetunedError(ErrorCode.NOT_FOUND, '附件不存在或无权访问。', 404);
    assertReviewArtifactReadAccess(this.storage, spaceId, auth.actor.id, artifact);
    if (artifact.state === 'redacted') throw new DetunedError(ErrorCode.CONTENT_REDACTED, '附件已脱敏。', 410);
    if (artifact.state !== 'ready') throw new DetunedError(ErrorCode.NOT_FOUND, '附件文件不存在。', 404);
    return artifact;
  }
  async getMetadata(auth: AuthenticatedContext, spaceId: string, id: string): Promise<ReadableArtifactMetadata> {
    const artifact = this.authorizeRead(auth, spaceId, id);
    if (!await this.blobs.exists(artifact.storage_key)) throw new DetunedError(ErrorCode.NOT_FOUND, '附件文件不存在。', 404);
    return this.toReadableMetadata(artifact);
  }
  async getContent(auth: AuthenticatedContext, spaceId: string, id: string): Promise<ArtifactContent> {
    const artifact = this.authorizeRead(auth, spaceId, id);
    const handle = await this.blobs.open(artifact.storage_key);
    if (!handle) throw new DetunedError(ErrorCode.NOT_FOUND, '附件文件不存在。', 404);
    return { metadata: this.toReadableMetadata(artifact), chunks: handle.chunks, dispose: () => handle.dispose(), download_name: artifact.id };
  }
  private toReadableMetadata(artifact: Artifact): ReadableArtifactMetadata {
    if (artifact.visibility === 'space') return toArtifactMetadata(artifact);
    if (!artifact.review_assignment_id) throw new DetunedError(ErrorCode.NOT_FOUND, '附件不存在或无权访问。', 404);
    return {id:artifact.id,space_id:artifact.space_id,owner_id:artifact.owner_id,visibility:'review_assignment',review_assignment_id:artifact.review_assignment_id,sha256:artifact.sha256,bytes:artifact.bytes,mime:artifact.mime,state:artifact.state,created_at:artifact.created_at,content_url:`/api/v1/spaces/${encodeURIComponent(artifact.space_id)}/artifacts/${encodeURIComponent(artifact.id)}/content`};
  }
  authorizeReviewUploadForRequest(auth: AuthenticatedContext, spaceId: string, requestId: string): string {
    return this.storage.readSnapshot(() => {
      const current = this.auth.refreshContext(auth);
      this.auth.requireSpaceAccess(current, spaceId, 'observer', 'write');
      const assignment = this.storage.findReviewAssignment(requestId, current.actor.id);
      if (!assignment) throw new DetunedError(ErrorCode.NOT_FOUND, '评审身份不存在或无权访问。', 404);
      this.authorizeReviewUpload(current, spaceId, assignment.id, false);
      return assignment.id;
    });
  }
  private authorizeReviewUpload(auth: AuthenticatedContext, spaceId: string, assignmentId: string, fresh: boolean): AuthenticatedContext {
    const current = this.auth.refreshContext(auth);
    this.auth.requireSpaceAccess(current,spaceId,'observer','write');
    const assignment = this.storage.findReviewAssignmentById(assignmentId);
    const request = assignment ? this.storage.findReviewRequestById(assignment.request_id) : null;
    if (!assignment || !request || request.space_id !== spaceId || assignment.reviewer_actor_id !== current.actor.id) throw new DetunedError(ErrorCode.NOT_FOUND,'评审身份不存在或无权访问。',404);
    reconstructReviewRequestView(this.storage,spaceId,request.id);
    const records = readReviewSnapshotRecords(this.storage,spaceId,request.snapshot_id);
    const {manifest} = records;
    if (fresh) {
      assertReviewSnapshotCurrent(this.storage,records);
      const member = this.storage.getMembership(spaceId,current.actor.id);
      if (!member || !member.active || !member.reviewer_eligible || !['human','agent'].includes(current.actor.kind)) throw new DetunedError(ErrorCode.FORBIDDEN,'当前身份不能上传评审附件。',403);
      if (manifest.review_policy.distinct_independence_groups) {
        const groups = this.storage.listReviewAssignments(request.id).map(a => this.storage.getMembership(spaceId,a.reviewer_actor_id)?.independence_group);
        if (groups.some(g => typeof g !== 'string' || !/\S/.test(g)) || new Set(groups).size !== groups.length) throw new DetunedError(ErrorCode.VALIDATION_ERROR,'当前评审分组不满足要求。',400);
      }
      if (request.phase !== 'collecting' || this.storage.findReviewSubmissionByAssignmentId(assignmentId)) throw new DetunedError(ErrorCode.VALIDATION_ERROR,'当前评审身份不可新增附件。',400);
    }
    return current;
  }
  async create(auth: AuthenticatedContext, spaceId: string, input: CreateArtifactInput, requestKey: string): Promise<ArtifactMetadata> {
    const result = await this.createInternal(auth,spaceId,input,requestKey);
    if (!isArtifactMetadata(result)) throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'附件结果不一致。',422);
    return result;
  }
  async createForReview(auth: AuthenticatedContext, spaceId: string, assignmentId: string, input: CreateArtifactInput, requestKey: string): Promise<ReviewArtifactMetadata> {
    const result = await this.createInternal(auth,spaceId,input,requestKey,assignmentId);
    if (result.visibility !== 'review_assignment') throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'附件结果不一致。',422);
    return result;
  }
  private async createInternal(auth: AuthenticatedContext, spaceId: string, input: CreateArtifactInput, requestKey: string, assignmentId?: string): Promise<ReadableArtifactMetadata> {
    let publishedKey: string | undefined;
    let keep = false;
    let failure: unknown;
    try {
      if (assignmentId) this.authorizeReviewUpload(auth,spaceId,assignmentId,false); else this.authorizeUpload(auth, spaceId);
      if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata) ||
          Object.keys(input.metadata).some(key => key !== 'visibility') ||
          (input.metadata.visibility !== undefined && input.metadata.visibility !== 'space')) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '仅支持space附件元信息。', 400);
      }
      const staged = input.staged;
      if (!Number.isSafeInteger(staged.bytes) || staged.bytes < 0 || !/^[0-9a-f]{64}$/.test(staged.sha256)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '附件哈希或字节数非法。', 400);
      if (staged.bytes > this.limits.max_file_bytes) throw new DetunedError(ErrorCode.PAYLOAD_TOO_LARGE, '附件超过文件上限。', 413);
      let mime: string;
      try { mime = normalizeArtifactMime(input.mime); } catch { throw new DetunedError(ErrorCode.VALIDATION_ERROR, '附件MIME非法。', 400); }
      if (typeof requestKey !== 'string' || !requestKey.trim()) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少Idempotency-Key。', 400);
      const storageKey = this.idGen.generateId('blob');
      await this.blobs.publish(staged, storageKey);
      // Only a successful publish transfers ownership of this final key.
      publishedKey = storageKey;
      const payload = { sha256: staged.sha256, bytes: staged.bytes, mime, visibility: assignmentId ? 'review_assignment' as const : 'space' as const };
      const result = this.storage.transaction(() => {
        const current = this.auth.refreshContext(auth);
        if (assignmentId) this.authorizeReviewUpload(current,spaceId,assignmentId,false); else this.auth.requireSpaceAccess(current, spaceId, 'contributor');
        return this.idempotency.executeIdempotent(current.actor.id, spaceId, assignmentId ? 'artifact.review.create:'+assignmentId : 'artifact.create', requestKey, payload, 201, inner => {
          if (assignmentId) this.authorizeReviewUpload(current,spaceId,assignmentId,true);
          const usage = inner.getArtifactUsage(this.resourceLimits.artifact_max_objects);
          if (usage.objects >= this.resourceLimits.artifact_max_objects || usage.bytes > BigInt(this.resourceLimits.artifact_max_total_bytes) - BigInt(staged.bytes)) throw resourceQuotaError('instance_artifacts');
          const used = inner.getArtifactBytesInSpace(spaceId);
          if (used > this.limits.max_space_bytes - staged.bytes) throw new DetunedError(ErrorCode.QUOTA_EXCEEDED, '空间附件配额不足。', 429);
          const artifact: Artifact = { id: this.idGen.generateId('art'), space_id: spaceId, owner_id: current.actor.id,
            visibility: assignmentId ? 'review_assignment' : 'space', review_assignment_id: assignmentId ?? null, check_run_id: null, sha256: staged.sha256, bytes: staged.bytes,
            mime, storage_key: storageKey, state: 'ready', created_at: this.clock.nowIso() };
          inner.createArtifact(artifact);
          inner.appendEvent(spaceId, { id: this.idGen.generateId('evt'), space_id: spaceId, type: 'artifact.created', object_id: artifact.id,
            revision: null, visibility: assignmentId ? 'review_assignment' : 'public', actor_id: current.actor.id, created_at: artifact.created_at });
          return this.toReadableMetadata(artifact);
        });
      });
      if (!result.isReplay) { keep = true; return result.data; }
      return await this.getMetadata(auth, spaceId, result.data.id);
    } catch (error) { failure = error; throw error; }
    finally {
      // Best effort cleanup never changes a committed result or hides the original business failure.
      const cleanups = [() => this.blobs.discardStage(input.staged)];
      if (publishedKey && !keep) cleanups.push(() => this.blobs.discardPublished(publishedKey!));
      for (const cleanup of cleanups) {
        try { await cleanup(); } catch {
          if (failure instanceof Error) {
            try { Object.defineProperty(failure, 'cleanup_failed', { value: true, configurable: true }); } catch { /* preserve original error */ }
          }
        }
      }
    }
  }
}
