import { authorizeCheck } from './check-authorization.js';
import { DetunedError, ErrorCode, normalizeArtifactMime, resolveArtifactLimits, resolveResourceLimits, isArtifactMetadata, toArtifactMetadata } from '@detuned/protocol';
import { assertReviewArtifactReadAccess } from './review-artifact-access.js';
import { readReviewSnapshotRecords, reconstructReviewRequestView, assertReviewSnapshotCurrent } from './review-request-records.js';
import { resourceQuotaError } from './resource-quota.js';
export class ArtifactService {
    storage;
    blobs;
    auth;
    idempotency;
    idGen;
    clock;
    limits;
    resourceLimits;
    constructor(storage, blobs, auth, idempotency, idGen, clock, limits, resourceLimits) {
        this.storage = storage;
        this.blobs = blobs;
        this.auth = auth;
        this.idempotency = idempotency;
        this.idGen = idGen;
        this.clock = clock;
        this.limits = resolveArtifactLimits(limits);
        this.resourceLimits = resolveResourceLimits(resourceLimits);
    }
    authorizeUpload(auth, spaceId) {
        this.auth.requireSpaceAccess(this.auth.refreshContext(auth), spaceId, 'contributor');
    }
    authorizeRead(auth, spaceId, id) {
        this.auth.requireSpaceAccess(this.auth.refreshContext(auth), spaceId, 'observer');
        const artifact = this.storage.findArtifactById(id);
        if (!artifact || artifact.space_id !== spaceId || (artifact.visibility !== 'space' && artifact.visibility !== 'review_assignment'))
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件不存在或无权访问。', 404);
        assertReviewArtifactReadAccess(this.storage, spaceId, auth.actor.id, artifact);
        if (artifact.state === 'redacted')
            throw new DetunedError(ErrorCode.CONTENT_REDACTED, '附件已脱敏。', 410);
        if (artifact.state !== 'ready')
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件文件不存在。', 404);
        return artifact;
    }
    async getMetadata(auth, spaceId, id) {
        const artifact = this.authorizeRead(auth, spaceId, id);
        if (!await this.blobs.exists(artifact.storage_key))
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件文件不存在。', 404);
        return this.toReadableMetadata(artifact);
    }
    async getContent(auth, spaceId, id) {
        const artifact = this.authorizeRead(auth, spaceId, id);
        const handle = await this.blobs.open(artifact.storage_key);
        if (!handle)
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件文件不存在。', 404);
        return { metadata: this.toReadableMetadata(artifact), chunks: handle.chunks, dispose: () => handle.dispose(), download_name: artifact.id };
    }
    toReadableMetadata(artifact) {
        if (artifact.visibility === 'space')
            return toArtifactMetadata(artifact);
        if (!artifact.review_assignment_id)
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件不存在或无权访问。', 404);
        return { id: artifact.id, space_id: artifact.space_id, owner_id: artifact.owner_id, visibility: 'review_assignment', review_assignment_id: artifact.review_assignment_id, sha256: artifact.sha256, bytes: artifact.bytes, mime: artifact.mime, state: artifact.state, created_at: artifact.created_at, content_url: `/api/v1/spaces/${encodeURIComponent(artifact.space_id)}/artifacts/${encodeURIComponent(artifact.id)}/content` };
    }
    authorizeReviewUploadForRequest(auth, spaceId, requestId) {
        return this.storage.readSnapshot(() => {
            const current = this.auth.refreshContext(auth);
            this.auth.requireSpaceAccess(current, spaceId, 'observer', 'write');
            const assignment = this.storage.findReviewAssignment(requestId, current.actor.id);
            if (!assignment)
                throw new DetunedError(ErrorCode.NOT_FOUND, '评审身份不存在或无权访问。', 404);
            this.authorizeReviewUpload(current, spaceId, assignment.id, false);
            return assignment.id;
        });
    }
    authorizeReviewUpload(auth, spaceId, assignmentId, fresh) {
        const current = this.auth.refreshContext(auth);
        this.auth.requireSpaceAccess(current, spaceId, 'observer', 'write');
        const assignment = this.storage.findReviewAssignmentById(assignmentId);
        const request = assignment ? this.storage.findReviewRequestById(assignment.request_id) : null;
        if (!assignment || !request || request.space_id !== spaceId || assignment.reviewer_actor_id !== current.actor.id)
            throw new DetunedError(ErrorCode.NOT_FOUND, '评审身份不存在或无权访问。', 404);
        reconstructReviewRequestView(this.storage, spaceId, request.id);
        const records = readReviewSnapshotRecords(this.storage, spaceId, request.snapshot_id);
        const { manifest } = records;
        if (fresh) {
            assertReviewSnapshotCurrent(this.storage, records);
            const member = this.storage.getMembership(spaceId, current.actor.id);
            if (!member || !member.active || !member.reviewer_eligible || !['human', 'agent'].includes(current.actor.kind))
                throw new DetunedError(ErrorCode.FORBIDDEN, '当前身份不能上传评审附件。', 403);
            if (manifest.review_policy.distinct_independence_groups) {
                const groups = this.storage.listReviewAssignments(request.id).map(a => this.storage.getMembership(spaceId, a.reviewer_actor_id)?.independence_group);
                if (groups.some(g => typeof g !== 'string' || !/\S/.test(g)) || new Set(groups).size !== groups.length)
                    throw new DetunedError(ErrorCode.VALIDATION_ERROR, '当前评审分组不满足要求。', 400);
            }
            if (request.phase !== 'collecting' || this.storage.findReviewSubmissionByAssignmentId(assignmentId))
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '当前评审身份不可新增附件。', 400);
        }
        return current;
    }
    async create(auth, spaceId, input, requestKey) {
        const result = await this.createInternal(auth, spaceId, input, requestKey);
        if (!isArtifactMetadata(result))
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '附件结果不一致。', 422);
        return result;
    }
    async createForReview(auth, spaceId, assignmentId, input, requestKey) {
        const result = await this.createInternal(auth, spaceId, input, requestKey, assignmentId);
        if (result.visibility !== 'review_assignment')
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '附件结果不一致。', 422);
        return result;
    }
    authorizeCheckUpload(auth, spaceId, runId, fresh = false) { this.storage.readSnapshot(() => authorizeCheck(this.storage, this.auth, auth, spaceId, runId, fresh, true)); }
    async createForCheck(auth, spaceId, runId, input, key) { const result = await this.createInternal(auth, spaceId, input, key, undefined, runId); if (!isArtifactMetadata(result))
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'Check log result is inconsistent.', 422); return result; }
    authorizeCheckRead(auth, spaceId, runId, id) {
        return this.storage.readSnapshot(() => {
            const { run } = authorizeCheck(this.storage, this.auth, auth, spaceId, runId), artifact = this.storage.findArtifactById(id);
            const snapshot = readReviewSnapshotRecords(this.storage, spaceId, run.snapshot_id);
            if (!artifact || artifact.space_id !== spaceId || artifact.visibility !== 'space' || (!(artifact.check_run_id === run.id && artifact.owner_id === run.verifier_actor_id) && !snapshot.manifest.artifacts.some(a => a.artifact_id === id)))
                throw new DetunedError(ErrorCode.NOT_FOUND, 'Check material is not accessible.', 404);
            if (artifact.state === 'redacted')
                throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Check material was redacted.', 410);
            if (artifact.state !== 'ready')
                throw new DetunedError(ErrorCode.NOT_FOUND, 'Check material is unavailable.', 404);
            return artifact;
        });
    }
    async getCheckMetadata(auth, spaceId, runId, id) { const artifact = this.authorizeCheckRead(auth, spaceId, runId, id); if (!await this.blobs.exists(artifact.storage_key))
        throw new DetunedError(ErrorCode.NOT_FOUND, 'Check material is unavailable.', 404); this.authorizeCheckRead(auth, spaceId, runId, id); return toArtifactMetadata(artifact); }
    async getCheckContent(auth, spaceId, runId, id) { const artifact = this.authorizeCheckRead(auth, spaceId, runId, id), handle = await this.blobs.open(artifact.storage_key); if (!handle)
        throw new DetunedError(ErrorCode.NOT_FOUND, 'Check material is unavailable.', 404); try {
        this.authorizeCheckRead(auth, spaceId, runId, id);
    }
    catch (error) {
        await handle.dispose();
        throw error;
    } return { metadata: toArtifactMetadata(artifact), chunks: handle.chunks, dispose: () => handle.dispose(), download_name: artifact.id }; }
    async createInternal(auth, spaceId, input, requestKey, assignmentId, runId) {
        let publishedKey;
        let keep = false;
        let failure;
        try {
            if (runId)
                this.authorizeCheckUpload(auth, spaceId, runId, false);
            else if (assignmentId)
                this.authorizeReviewUpload(auth, spaceId, assignmentId, false);
            else
                this.authorizeUpload(auth, spaceId);
            if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata) ||
                Object.keys(input.metadata).some(key => key !== 'visibility') ||
                (input.metadata.visibility !== undefined && input.metadata.visibility !== 'space')) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '仅支持space附件元信息。', 400);
            }
            const staged = input.staged;
            if (!Number.isSafeInteger(staged.bytes) || staged.bytes < 0 || !/^[0-9a-f]{64}$/.test(staged.sha256))
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '附件哈希或字节数非法。', 400);
            if (staged.bytes > this.limits.max_file_bytes)
                throw new DetunedError(ErrorCode.PAYLOAD_TOO_LARGE, '附件超过文件上限。', 413);
            let mime;
            try {
                mime = normalizeArtifactMime(input.mime);
            }
            catch {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '附件MIME非法。', 400);
            }
            if (typeof requestKey !== 'string' || !requestKey.trim())
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少Idempotency-Key。', 400);
            const storageKey = this.idGen.generateId('blob');
            await this.blobs.publish(staged, storageKey);
            // Only a successful publish transfers ownership of this final key.
            publishedKey = storageKey;
            const payload = { sha256: staged.sha256, bytes: staged.bytes, mime, visibility: assignmentId ? 'review_assignment' : 'space' };
            const result = this.storage.transaction(() => {
                const current = this.auth.refreshContext(auth);
                if (runId)
                    this.authorizeCheckUpload(current, spaceId, runId, false);
                else if (assignmentId)
                    this.authorizeReviewUpload(current, spaceId, assignmentId, false);
                else
                    this.auth.requireSpaceAccess(current, spaceId, 'contributor');
                return this.idempotency.executeIdempotent(current.actor.id, spaceId, runId ? 'artifact.check.create:' + runId : assignmentId ? 'artifact.review.create:' + assignmentId : 'artifact.create', requestKey, payload, 201, inner => {
                    if (runId)
                        this.authorizeCheckUpload(current, spaceId, runId, true);
                    else if (assignmentId)
                        this.authorizeReviewUpload(current, spaceId, assignmentId, true);
                    const usage = inner.getArtifactUsage(this.resourceLimits.artifact_max_objects);
                    if (usage.objects >= this.resourceLimits.artifact_max_objects || usage.bytes > BigInt(this.resourceLimits.artifact_max_total_bytes) - BigInt(staged.bytes))
                        throw resourceQuotaError('instance_artifacts');
                    const used = inner.getArtifactBytesInSpace(spaceId);
                    if (used > this.limits.max_space_bytes - staged.bytes)
                        throw new DetunedError(ErrorCode.QUOTA_EXCEEDED, '空间附件配额不足。', 429);
                    const artifact = { id: this.idGen.generateId('art'), space_id: spaceId, owner_id: current.actor.id,
                        visibility: assignmentId ? 'review_assignment' : 'space', review_assignment_id: assignmentId ?? null, check_run_id: runId ?? null, sha256: staged.sha256, bytes: staged.bytes,
                        mime, storage_key: storageKey, state: 'ready', created_at: this.clock.nowIso() };
                    inner.createArtifact(artifact);
                    inner.appendEvent(spaceId, { id: this.idGen.generateId('evt'), space_id: spaceId, type: 'artifact.created', object_id: artifact.id,
                        revision: null, visibility: assignmentId ? 'review_assignment' : 'public', actor_id: current.actor.id, created_at: artifact.created_at });
                    return this.toReadableMetadata(artifact);
                });
            });
            if (!result.isReplay) {
                keep = true;
                return result.data;
            }
            return runId ? await this.getCheckMetadata(auth, spaceId, runId, result.data.id) : await this.getMetadata(auth, spaceId, result.data.id);
        }
        catch (error) {
            failure = error;
            throw error;
        }
        finally {
            // Best effort cleanup never changes a committed result or hides the original business failure.
            const cleanups = [() => this.blobs.discardStage(input.staged)];
            if (publishedKey && !keep)
                cleanups.push(() => this.blobs.discardPublished(publishedKey));
            for (const cleanup of cleanups) {
                try {
                    await cleanup();
                }
                catch {
                    if (failure instanceof Error) {
                        try {
                            Object.defineProperty(failure, 'cleanup_failed', { value: true, configurable: true });
                        }
                        catch { /* preserve original error */ }
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=artifact-service.js.map