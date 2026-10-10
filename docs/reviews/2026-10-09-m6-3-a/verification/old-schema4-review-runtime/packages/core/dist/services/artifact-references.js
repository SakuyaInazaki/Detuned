import { DetunedError, ErrorCode } from '@detuned/protocol';
/** Called within the post/revision transaction; no filesystem I/O belongs here. */
export function assertRevisionArtifacts(tx, spaceId, ids, structured) {
    const artifacts = ids ?? [];
    if (!Array.isArray(artifacts) || artifacts.some(id => typeof id !== 'string') || new Set(artifacts).size !== artifacts.length) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'artifact_ids必须是互异字符串列表。', 400);
    }
    const evidence = structured?.evidence_refs;
    if (Array.isArray(evidence)) {
        for (const ref of evidence) {
            if (ref && typeof ref === 'object' && ref.kind === 'artifact' && !artifacts.includes(ref.artifact_id)) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '附件证据必须同时列入artifact_ids。', 400);
            }
        }
    }
    for (const id of artifacts) {
        const artifact = tx.findArtifactById(id);
        if (!artifact || artifact.space_id !== spaceId || artifact.visibility !== 'space')
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件不存在或无权访问。', 404);
        if (artifact.state === 'redacted')
            throw new DetunedError(ErrorCode.CONTENT_REDACTED, '附件已脱敏。', 410);
        if (artifact.state !== 'ready')
            throw new DetunedError(ErrorCode.NOT_FOUND, '附件不可引用。', 404);
    }
}
export function linkRevisionArtifacts(tx, spaceId, postId, revision, ids, structured) {
    assertRevisionArtifacts(tx, spaceId, ids, structured);
    for (const id of ids ?? [])
        tx.createRevisionArtifact(postId, revision, id, 'evidence');
}
//# sourceMappingURL=artifact-references.js.map