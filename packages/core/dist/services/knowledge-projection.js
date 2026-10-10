import { isHistoricalMaterialField, isPostRefArray } from '@detuned/protocol';
/** Historical field-by-field reads, never the new-write parser and never a database mutation. */
function fields(kind, keys, structured, nonblank = []) {
    const source = structured && typeof structured === 'object' && !Array.isArray(structured) ? structured : {};
    const result = {};
    const missing = [];
    for (const key of keys) {
        const value = source[key];
        const valid = value !== undefined && isHistoricalMaterialField(kind, key, value) && (!nonblank.includes(key) || (typeof value === 'string' && value.trim() !== ''));
        result[key] = valid ? structuredClone(value) : null;
        if (!valid)
            missing.push(key);
    }
    return { ...result, missing_fields: missing };
}
export function projectClaimMaterial(structured) {
    return fields('claim', ['statement', 'assumptions', 'scope', 'falsification_plan'], structured, ['statement', 'scope', 'falsification_plan']);
}
export function projectFailureMaterial(structured) {
    const result = fields('failure', ['attempt', 'category', 'assumptions', 'tested_scope', 'expected', 'observed', 'evidence_refs', 'evidence_state', 'evidence_missing_reason', 'ruled_out', 'not_ruled_out', 'retry_when'], structured);
    const source = structured && typeof structured === 'object' ? structured : {};
    if (result.evidence_state === 'unverified' && (typeof result.evidence_missing_reason !== 'string' || !result.evidence_missing_reason.trim())) {
        result.evidence_missing_reason = null;
        if (!result.missing_fields.includes('evidence_missing_reason'))
            result.missing_fields.push('evidence_missing_reason');
    }
    else if (source.evidence_missing_reason === undefined && result.evidence_state !== 'unverified') {
        result.missing_fields = result.missing_fields.filter(key => key !== 'evidence_missing_reason');
    }
    return result;
}
export function projectSource(storage, spaceId, ref) {
    const post = storage.findPostById(ref.post_id);
    if (!post || post.space_id !== spaceId || !storage.getPostRevision(ref.post_id, ref.revision))
        return { ref, status: 'unavailable', has_newer_revision: null };
    if (post.lifecycle === 'redacted')
        return { ref, status: 'redacted', has_newer_revision: null };
    return { ref, status: post.lifecycle, has_newer_revision: post.current_revision > ref.revision };
}
export function projectSummarySources(storage, spaceId, structured) {
    const source = structured && typeof structured === 'object' ? structured.source_refs : undefined;
    if (!isPostRefArray(source))
        return { source_refs: null, missing_fields: ['source_refs'] };
    return { source_refs: source.map(ref => projectSource(storage, spaceId, ref)), missing_fields: [] };
}
export function projectRelation(storage, spaceId, relation) {
    if (!['supports', 'challenges', 'reproduces'].includes(relation.type) || relation.space_id !== spaceId)
        return null;
    const source = projectSource(storage, spaceId, { post_id: relation.source_post_id, revision: relation.source_revision });
    const target = projectSource(storage, spaceId, { post_id: relation.target_post_id, revision: relation.target_revision });
    if (source.status === 'unavailable' || target.status === 'unavailable')
        return null;
    return { relation_id: relation.id, relation_type: relation.type, source_ref: source.ref, target_ref: target.ref, creator_id: relation.creator_id, source_author_id: storage.findPostById(source.ref.post_id).author_id, target_author_id: storage.findPostById(target.ref.post_id).author_id, state: relation.state, version: relation.version, source_status: source.status, target_status: target.status, source_has_newer_revision: source.has_newer_revision, target_has_newer_revision: target.has_newer_revision };
}
export function projectTargetRelations(storage, spaceId, targetId) {
    return storage.listRelationsByTarget(spaceId, targetId).flatMap(relation => { const projected = projectRelation(storage, spaceId, relation); return projected ? [projected] : []; });
}
export const REPORT_FLAGS = { report_kind: 'author_report' };
//# sourceMappingURL=knowledge-projection.js.map