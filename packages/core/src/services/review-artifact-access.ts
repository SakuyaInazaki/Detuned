import { DetunedError, ErrorCode, isReadableArtifactMetadata, type Artifact, type ReviewSubmissionRecord } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
import { readReviewSnapshotRecords } from './review-request-records.js';
import { validateReviewSubmissionRecords } from './review-submission-records.js';
function absent(): never { throw new DetunedError(ErrorCode.NOT_FOUND, '附件不存在或无权访问。', 404); }
function artifactPrivacy(storage: StoragePort, spaceId: string, artifact: Artifact): void {
  if (artifact.space_id !== spaceId) absent();
  if (artifact.visibility === 'review_assignment') {
    const assignment = artifact.review_assignment_id ? storage.findReviewAssignmentById(artifact.review_assignment_id) : null;
    const request = assignment ? storage.findReviewRequestById(assignment.request_id) : null;
    if (!assignment || !request || request.space_id !== spaceId || artifact.owner_id !== assignment.reviewer_actor_id) absent();
  } else if (artifact.visibility !== 'space') absent();
  if (artifact.state === 'redacted') throw new DetunedError(ErrorCode.CONTENT_REDACTED, '附件已脱敏。', 410);
}
/** Caller refreshes authentication and checks current space read access before this scope gate. */
export function assertReviewArtifactReadAccess(storage: StoragePort, spaceId: string, actorId: string, artifact: Artifact): void {
  if (artifact.space_id !== spaceId) absent();
  if (artifact.visibility === 'review_assignment') {
    const assignment = artifact.review_assignment_id ? storage.findReviewAssignmentById(artifact.review_assignment_id) : null;
    if (!assignment) absent();
    const request = storage.findReviewRequestById(assignment.request_id);
    if (!request || request.space_id !== spaceId) absent();
    if (assignment.reviewer_actor_id !== actorId) {
      const stored = storage.findReviewSubmissionByAssignmentId(assignment.id);
      if (!stored || stored.revealed_at === null) absent();
      const submission = validateReviewSubmissionRecords(storage, spaceId, stored.id);
      if (!submission.payload.evidence_refs.some(ref => ref.kind === 'artifact' && ref.artifact_id === artifact.id)) absent();
    }
    readReviewSnapshotRecords(storage,spaceId,request.snapshot_id);
  }
  artifactPrivacy(storage, spaceId, artifact);
}
/** Internal reveal/privacy check: no materials returned, no public read authorization bypass. */
export function assertStoredSubmissionEvidencePrivacy(storage: StoragePort, spaceId: string, submission: ReviewSubmissionRecord): void {
  const record = validateReviewSubmissionRecords(storage, spaceId, submission.id);
  const request = storage.findReviewRequestById(record.request_id);
  if (!request || request.space_id !== spaceId) absent();
  readReviewSnapshotRecords(storage,spaceId,request.snapshot_id);
  for (const ref of record.payload.evidence_refs) {
    if (ref.kind === 'post') {
      const post = storage.findPostById(ref.post_id);
      if (!post || post.space_id !== spaceId || !storage.getPostRevisionMetadata(ref.post_id,ref.revision)) absent();
      if (post.lifecycle === 'redacted') throw new DetunedError(ErrorCode.CONTENT_REDACTED,'评审材料已脱敏。',410);
      continue;
    }
    if (ref.kind !== 'artifact') continue;
    const artifact = storage.findArtifactById(ref.artifact_id);
    if (!artifact || artifact.space_id !== spaceId) absent();
    if (artifact.visibility === 'review_assignment' && (artifact.review_assignment_id !== record.assignment_id || artifact.owner_id !== record.reviewer_actor_id)) absent();
    artifactPrivacy(storage, spaceId, artifact);
  }
}
/** Fresh submission/reveal only; historical read/replay does not rejudge readiness. */
export function assertStoredSubmissionEvidenceReady(storage: StoragePort, spaceId: string, submission: ReviewSubmissionRecord): void {
  assertStoredSubmissionEvidencePrivacy(storage, spaceId, submission);
  for (const ref of submission.payload.evidence_refs) {
    if (ref.kind === 'artifact' && storage.findArtifactById(ref.artifact_id)?.state !== 'ready') throw new DetunedError(ErrorCode.SNAPSHOT_STALE, '评审证据已不再就绪。', 409);
  }
}
/** Fresh evidence scope check; readiness is checked separately by the review service. */
export function assertReviewEvidenceArtifact(storage: StoragePort, spaceId: string, assignmentId: string, artifactId: string): Artifact {
  const assignment = storage.findReviewAssignmentById(assignmentId);
  const request = assignment ? storage.findReviewRequestById(assignment.request_id) : null;
  const artifact = storage.findArtifactById(artifactId);
  if (!assignment || !request || request.space_id !== spaceId || !artifact || artifact.space_id !== spaceId) absent();
  if (artifact.visibility === 'review_assignment' && (artifact.review_assignment_id !== assignmentId || artifact.owner_id !== assignment.reviewer_actor_id)) absent();
  artifactPrivacy(storage, spaceId, artifact);
  return artifact;
}
/** Intrinsic private artifact metadata only; caller applies online assignment/current privacy. */
export function reconstructReviewArtifactResult(storage: StoragePort, spaceId: string, artifactId: string): import('@detuned/protocol').ReviewArtifactMetadata {
  const artifact = storage.findArtifactById(artifactId);
  const assignment = artifact?.review_assignment_id ? storage.findReviewAssignmentById(artifact.review_assignment_id) : null;
  const request = assignment ? storage.findReviewRequestById(assignment.request_id) : null;
  if (!artifact || !assignment || !request || artifact.space_id !== spaceId || request.space_id !== spaceId || artifact.visibility !== 'review_assignment' || artifact.owner_id !== assignment.reviewer_actor_id || !/^[0-9a-f]{64}$/.test(artifact.sha256) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0 || artifact.bytes > 26214400) throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'评审附件记录无法安全恢复。',409);
  const metadata = {id:artifact.id,space_id:artifact.space_id,owner_id:artifact.owner_id,visibility:'review_assignment' as const,review_assignment_id:assignment.id,sha256:artifact.sha256,bytes:artifact.bytes,mime:artifact.mime,state:artifact.state,created_at:artifact.created_at,content_url:`/api/v1/spaces/${encodeURIComponent(spaceId)}/artifacts/${encodeURIComponent(artifact.id)}/content`};
  if (!isReadableArtifactMetadata(metadata) || metadata.visibility !== 'review_assignment') throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'评审附件记录无法安全恢复。',409);
  return metadata;
}
export function validateStoredReviewArtifactReference(storage: StoragePort, operation: string, spaceId: string, raw: unknown): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'评审附件引用无法安全恢复。',409);
  const ref = raw as Record<string,unknown>;
  if (Object.keys(ref).length !== 4 || Object.keys(ref).some(k => !['v','kind','artifact_id','assignment_id'].includes(k)) || ref.v !== 1 || ref.kind !== 'artifact.review' || typeof ref.artifact_id !== 'string' || typeof ref.assignment_id !== 'string' || operation !== 'artifact.review.create:'+ref.assignment_id) throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'评审附件引用无法安全恢复。',409);
  const metadata = reconstructReviewArtifactResult(storage,spaceId,ref.artifact_id);
  if (metadata.review_assignment_id !== ref.assignment_id) throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'评审附件引用无法安全恢复。',409);
}
