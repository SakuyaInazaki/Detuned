import { DetunedError, ErrorCode, NewTypedStructured, PostKind, parseNewTypedStructured } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { assertRevisionArtifacts } from './artifact-references.js';

/** New idempotent actions only: historical successful requests must never be revalidated here. */
export function validateNewTypedWrite(
  tx: StoragePort, authService: AuthService, auth: AuthenticatedContext,
  spaceId: string, kind: PostKind, structured: unknown, artifactIds: readonly string[] | undefined
): NewTypedStructured | undefined {
  const parsed = parseNewTypedStructured(kind, structured);
  if (parsed === undefined) return undefined;
  const needsRead = ('source_refs' in parsed && parsed.source_refs.length > 0) || ('evidence_refs' in parsed && parsed.evidence_refs.length > 0);
  if (needsRead) {
    const current = authService.refreshContext(auth);
    authService.requireSpaceAccess(current, spaceId, 'observer');
  }
  const refs = 'source_refs' in parsed ? parsed.source_refs : 'evidence_refs' in parsed ? parsed.evidence_refs.filter(ref => ref.kind === 'post') : [];
  for (const ref of refs) {
    const post = tx.findPostById(ref.post_id);
    if (!post || post.space_id !== spaceId) throw new DetunedError(ErrorCode.NOT_FOUND, '证据帖子不存在或无权访问。', 404);
    if (post.lifecycle === 'redacted') throw new DetunedError(ErrorCode.CONTENT_REDACTED, '证据帖子已脱敏。', 410);
    if (!tx.getPostRevision(ref.post_id, ref.revision)) throw new DetunedError(ErrorCode.NOT_FOUND, '证据帖子修订不存在。', 404);
  }
  assertRevisionArtifacts(tx, spaceId, artifactIds, parsed);
  return structuredClone(parsed);
}
