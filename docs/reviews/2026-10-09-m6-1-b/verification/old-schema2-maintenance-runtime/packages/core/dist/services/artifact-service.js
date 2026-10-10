import { DetunedError, ErrorCode, normalizeArtifactMime, resolveArtifactLimits, resolveResourceLimits, toArtifactMetadata } from '@detuned/protocol';
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
        if (!artifact || artifact.space_id !== spaceId || artifact.visibility !== 'space')
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件不存在或无权访问。', 404);
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
        return toArtifactMetadata(artifact);
    }
    async getContent(auth, spaceId, id) {
        const artifact = this.authorizeRead(auth, spaceId, id);
        const handle = await this.blobs.open(artifact.storage_key);
        if (!handle)
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件文件不存在。', 404);
        return { metadata: toArtifactMetadata(artifact), chunks: handle.chunks, dispose: () => handle.dispose(), download_name: artifact.id };
    }
    async create(auth, spaceId, input, requestKey) {
        let publishedKey;
        let keep = false;
        let failure;
        try {
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
            const payload = { sha256: staged.sha256, bytes: staged.bytes, mime, visibility: 'space' };
            const result = this.storage.transaction(() => {
                const current = this.auth.refreshContext(auth);
                this.auth.requireSpaceAccess(current, spaceId, 'contributor');
                return this.idempotency.executeIdempotent(current.actor.id, spaceId, 'artifact.create', requestKey, payload, 201, inner => {
                    const usage = inner.getArtifactUsage(this.resourceLimits.artifact_max_objects);
                    if (usage.objects >= this.resourceLimits.artifact_max_objects || usage.bytes > BigInt(this.resourceLimits.artifact_max_total_bytes) - BigInt(staged.bytes))
                        throw resourceQuotaError('instance_artifacts');
                    const used = inner.getArtifactBytesInSpace(spaceId);
                    if (used > this.limits.max_space_bytes - staged.bytes)
                        throw new DetunedError(ErrorCode.QUOTA_EXCEEDED, '空间附件配额不足。', 429);
                    const artifact = { id: this.idGen.generateId('art'), space_id: spaceId, owner_id: current.actor.id,
                        visibility: 'space', review_assignment_id: null, check_run_id: null, sha256: staged.sha256, bytes: staged.bytes,
                        mime, storage_key: storageKey, state: 'ready', created_at: this.clock.nowIso() };
                    inner.createArtifact(artifact);
                    inner.appendEvent(spaceId, { id: this.idGen.generateId('evt'), space_id: spaceId, type: 'artifact.created', object_id: artifact.id,
                        revision: null, visibility: 'public', actor_id: current.actor.id, created_at: artifact.created_at });
                    return toArtifactMetadata(artifact);
                });
            });
            if (!result.isReplay) {
                keep = true;
                return result.data;
            }
            return await this.getMetadata(auth, spaceId, result.data.id);
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