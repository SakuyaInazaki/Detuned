/** Dedicated independent read-only connection. Its content snapshot survives awaits; it never authorizes delivery. */
export type SpaceExportKind = 'space' | 'space_revision' | 'thread' | 'thread_version' | 'post' | 'post_revision' | 'relation' | 'relation_resolution' | 'revision_artifact' | 'artifact';
export interface SpaceExportCandidate { kind: SpaceExportKind; data: Record<string, unknown> }
export interface SpaceExportRefState { space_id: string; lifecycle: string; exists: boolean }
export interface SpaceExportArtifactState { space_id: string; visibility: string; state: string }
export interface SpaceExportSnapshot {
  readonly spaceRevision: number;
  readonly aclEpoch: number;
  readonly eventSeq: string;
  nextCandidate(maxRawBytes: number): SpaceExportCandidate | null;
  postRef(postId: string, revision: number): SpaceExportRefState | null;
  artifactState(artifactId: string): SpaceExportArtifactState | null;
  close(): void;
}
