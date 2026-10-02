import { DetunedError, ErrorCode, } from '@detuned/protocol';
export class ReviewModule {
    storage;
    hasher;
    clock;
    idGen;
    constructor(storage, hasher, clock, idGen) {
        this.storage = storage;
        this.hasher = hasher;
        this.clock = clock;
        this.idGen = idGen;
    }
    generateSnapshotManifest(spaceId, req) {
        const targetPost = this.storage.findPostById(req.target_ref.post_id);
        if (!targetPost || targetPost.space_id !== spaceId) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '评审目标帖子不存在。', 404);
        }
        const targetRev = this.storage.getPostRevision(req.target_ref.post_id, req.target_ref.revision);
        if (!targetRev) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '评审目标帖子修订不存在。', 404);
        }
        const dependencies = [];
        for (const dep of req.dependency_refs) {
            const depPost = this.storage.findPostById(dep.post_id);
            if (!depPost || depPost.space_id !== spaceId) {
                throw new DetunedError(ErrorCode.NOT_FOUND, `依赖帖子 ${dep.post_id} 不存在。`, 404);
            }
            const depRev = this.storage.getPostRevision(dep.post_id, dep.revision);
            if (!depRev) {
                throw new DetunedError(ErrorCode.NOT_FOUND, `依赖帖子修订 ${dep.revision} 不存在。`, 404);
            }
            dependencies.push({
                post_id: dep.post_id,
                revision: dep.revision,
                content_hash: depRev.content_hash,
            });
        }
        // Sort dependencies by post_id and revision for canonical ordering
        dependencies.sort((a, b) => a.post_id.localeCompare(b.post_id) || a.revision - b.revision);
        const space = this.storage.findSpaceById(spaceId);
        const spaceRev = this.storage.getSpaceRevision(spaceId, space.current_revision);
        const manifest = {
            target: {
                post_id: req.target_ref.post_id,
                revision: req.target_ref.revision,
                content_hash: targetRev.content_hash,
            },
            dependencies,
            artifact_ids: [...req.artifact_ids].sort(),
            code_refs: req.code_refs,
            declared_contributors: [...req.declared_contributors].sort(),
            policy_revision: space.policy_revision,
            required_checks: [...spaceRev.review_policy.required_checks].sort(),
        };
        const canonicalJson = this.hasher.canonicalJson(manifest);
        const manifestHash = this.hasher.sha256(canonicalJson);
        return { manifest, manifestHash };
    }
}
//# sourceMappingURL=index.js.map