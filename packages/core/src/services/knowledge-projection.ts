import { ClaimMaterial, FailureMaterial, isHistoricalMaterialField, isPostRefArray, PostRef, Relation, RelationProjection, SourceStatus } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';

/** Historical field-by-field reads, never the new-write parser and never a database mutation. */
function fields(kind: 'claim' | 'failure', keys: readonly string[], structured: unknown, nonblank: readonly string[] = []) {
  const source = structured && typeof structured === 'object' && !Array.isArray(structured) ? structured as Record<string, unknown> : {};
  const result: Record<string, unknown> = {}; const missing: string[] = [];
  for (const key of keys) {
    const value = source[key];
    const valid = value !== undefined && isHistoricalMaterialField(kind, key, value) && (!nonblank.includes(key) || (typeof value === 'string' && value.trim() !== ''));
    result[key] = valid ? structuredClone(value) : null;
    if (!valid) missing.push(key);
  }
  return { ...result, missing_fields: missing };
}
export function projectClaimMaterial(structured: unknown): ClaimMaterial {
  return fields('claim', ['statement','assumptions','scope','falsification_plan'], structured, ['statement','scope','falsification_plan']) as ClaimMaterial;
}
export function projectFailureMaterial(structured: unknown): FailureMaterial {
  const result = fields('failure', ['attempt','category','assumptions','tested_scope','expected','observed','evidence_refs','evidence_state','evidence_missing_reason','ruled_out','not_ruled_out','retry_when'], structured) as FailureMaterial;
  const source = structured && typeof structured === 'object' ? structured as Record<string, unknown> : {};
  if (result.evidence_state === 'unverified' && (typeof result.evidence_missing_reason !== 'string' || !result.evidence_missing_reason.trim())) {
    result.evidence_missing_reason = null;
    if (!result.missing_fields.includes('evidence_missing_reason')) result.missing_fields.push('evidence_missing_reason');
  } else if (source.evidence_missing_reason === undefined && result.evidence_state !== 'unverified') {
    result.missing_fields = result.missing_fields.filter(key => key !== 'evidence_missing_reason');
  }
  return result;
}
export function projectSource(storage: StoragePort, spaceId: string, ref: PostRef): SourceStatus {
  const post = storage.findPostById(ref.post_id);
  if (!post || post.space_id !== spaceId || !storage.getPostRevision(ref.post_id, ref.revision)) return { ref, status:'unavailable',has_newer_revision:null };
  if (post.lifecycle === 'redacted') return {ref,status:'redacted',has_newer_revision:null};
  return {ref,status:post.lifecycle,has_newer_revision:post.current_revision > ref.revision};
}
export function projectSummarySources(storage: StoragePort, spaceId: string, structured: unknown): {source_refs: SourceStatus[] | null; missing_fields: ('source_refs')[]} {
  const source = structured && typeof structured === 'object' ? (structured as Record<string, unknown>).source_refs : undefined;
  if (!isPostRefArray(source)) return {source_refs:null,missing_fields:['source_refs']};
  return {source_refs:source.map(ref=>projectSource(storage,spaceId,ref)),missing_fields:[]};
}
export function projectRelation(storage: StoragePort, spaceId: string, relation: Relation): RelationProjection | null {
  if (!['supports','challenges','reproduces'].includes(relation.type) || relation.space_id !== spaceId) return null;
  const source = projectSource(storage,spaceId,{post_id:relation.source_post_id,revision:relation.source_revision});
  const target = projectSource(storage,spaceId,{post_id:relation.target_post_id,revision:relation.target_revision});
  if (source.status === 'unavailable' || target.status === 'unavailable') return null;
  return {relation_id:relation.id,relation_type:relation.type as RelationProjection['relation_type'],source_ref:source.ref,target_ref:target.ref,creator_id:relation.creator_id,source_author_id:storage.findPostById(source.ref.post_id)!.author_id,target_author_id:storage.findPostById(target.ref.post_id)!.author_id,state:relation.state,version:relation.version,source_status:source.status,target_status:target.status,source_has_newer_revision:source.has_newer_revision,target_has_newer_revision:target.has_newer_revision};
}
export function projectTargetRelations(storage: StoragePort, spaceId: string, targetId: string): RelationProjection[] {
  return storage.listRelationsByTarget(spaceId,targetId).flatMap(relation=>{const projected=projectRelation(storage,spaceId,relation);return projected ? [projected] : [];});
}
export const REPORT_FLAGS = {report_kind:'author_report'} as const;
