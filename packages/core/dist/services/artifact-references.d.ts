import { StoragePort } from '../ports/storage.js';
/** Called within the post/revision transaction; no filesystem I/O belongs here. */
export declare function assertRevisionArtifacts(tx: StoragePort, spaceId: string, ids: readonly string[] | undefined, structured: Record<string, unknown> | undefined): void;
export declare function linkRevisionArtifacts(tx: StoragePort, spaceId: string, postId: string, revision: number, ids: string[] | undefined, structured: Record<string, unknown> | undefined): void;
//# sourceMappingURL=artifact-references.d.ts.map