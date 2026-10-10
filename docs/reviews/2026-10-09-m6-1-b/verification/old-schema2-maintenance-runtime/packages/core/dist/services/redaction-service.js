import { DetunedError, ErrorCode } from '@detuned/protocol';
export class RedactionService {
    storage;
    idGen;
    clock;
    authService;
    idempotency;
    constructor(storage, idGen, clock, authService, idempotency) {
        this.storage = storage;
        this.idGen = idGen;
        this.clock = clock;
        this.authService = authService;
        this.idempotency = idempotency;
    }
    createRedaction(auth, spaceId, input, idempotencyKey) {
        this.authService.requireSpaceAccess(auth, spaceId, 'owner');
        if (!input.target_type || !input.target_id || !input.reason) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 target_type, target_id 或 reason。', 400);
        }
        if (input.target_type !== 'post' && input.target_type !== 'artifact') {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '非法的 target_type。', 400);
        }
        // Pre-check target existence in space
        if (input.target_type === 'post') {
            const post = this.storage.findPostById(input.target_id);
            if (!post || post.space_id !== spaceId) {
                throw new DetunedError(ErrorCode.NOT_FOUND, '目标帖子不存在或不属于该空间。', 404);
            }
        }
        else if (input.target_type === 'artifact') {
            const artifact = this.storage.findArtifactById(input.target_id);
            if (!artifact || artifact.space_id !== spaceId) {
                throw new DetunedError(ErrorCode.NOT_FOUND, '目标附件不存在或不属于该空间。', 404);
            }
        }
        const payload = {
            target_type: input.target_type,
            target_id: input.target_id,
            reason: input.reason,
        };
        return this.idempotency.executeIdempotent(auth.actor.id, spaceId, 'admin.redaction', idempotencyKey, payload, 201, (tx) => {
            // Re-verify in transaction
            if (input.target_type === 'post') {
                const post = tx.findPostById(input.target_id);
                if (!post || post.space_id !== spaceId) {
                    throw new DetunedError(ErrorCode.NOT_FOUND, '目标帖子不存在或不属于该空间。', 404);
                }
            }
            else if (input.target_type === 'artifact') {
                const artifact = tx.findArtifactById(input.target_id);
                if (!artifact || artifact.space_id !== spaceId) {
                    throw new DetunedError(ErrorCode.NOT_FOUND, '目标附件不存在或不属于该空间。', 404);
                }
            }
            const redactionId = this.idGen.generateId('red');
            const now = this.clock.nowIso();
            tx.createRedaction({
                id: redactionId,
                space_id: spaceId,
                target_type: input.target_type,
                target_id: input.target_id,
                affected_revisions: [1],
                operator_id: auth.actor.id,
                reason: input.reason,
                created_at: now,
            });
            tx.appendEvent(spaceId, {
                id: this.idGen.generateId('evt'),
                space_id: spaceId,
                type: input.target_type === 'post' ? 'post.redacted' : 'artifact.redacted',
                object_id: input.target_id,
                revision: 1,
                visibility: 'public',
                actor_id: auth.actor.id,
                created_at: now,
            });
            return { redaction_id: redactionId };
        });
    }
}
//# sourceMappingURL=redaction-service.js.map