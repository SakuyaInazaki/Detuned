import type { SpaceExportSnapshot, SpaceExportCandidate, SpaceExportRefState, SpaceExportArtifactState } from '@detuned/core';
/** Does not run SqliteStorage init pragmas, migrations or write transactions. */
export declare class SqliteSpaceExportSnapshot implements SpaceExportSnapshot {
    private readonly db;
    private readonly spaceId;
    private family;
    private last;
    private closed;
    readonly spaceRevision: number;
    readonly aclEpoch: number;
    readonly eventSeq: string;
    private constructor();
    static open(file: string, spaceId: string): SqliteSpaceExportSnapshot;
    nextCandidate(maxRawBytes: number): SpaceExportCandidate | null;
    postRef(postId: string, revision: number): SpaceExportRefState | null;
    artifactState(artifactId: string): SpaceExportArtifactState | null;
    close(): void;
}
//# sourceMappingURL=space-export-snapshot.d.ts.map