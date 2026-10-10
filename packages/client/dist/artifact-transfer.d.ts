import { type ArtifactMetadata, type ReadableArtifactMetadata, type CreateArtifactMetadata } from '@detuned/protocol';
export interface ArtifactDownload {
    metadata: ReadableArtifactMetadata;
    bytes: Uint8Array;
}
export declare function artifactMetadata(value: unknown, spaceId: string, artifactId?: string): ArtifactMetadata;
export declare function readableArtifactMetadata(value: unknown, spaceId: string, artifactId: string): ReadableArtifactMetadata;
/** Race observes late settlement; resource-owning callers also dispose late values. */
export declare function waitForArtifact<T>(pending: Promise<T>, signal: AbortSignal, error: () => Error): Promise<T>;
export declare function snapshotUpload(file: Blob, metadata: CreateArtifactMetadata, signal?: AbortSignal): Promise<{
    blob: import("buffer").Blob;
    metadataJson: string;
    bytes: number;
    sha256: string;
}>;
export declare function downloadArtifactBytes(baseUrl: string, token: string | undefined, spaceId: string, artifactId: string, timeoutMs: number, external: AbortSignal | undefined, getMetadata: (signal: AbortSignal) => Promise<ReadableArtifactMetadata>, cookieSession?: boolean, checkRunId?: string): Promise<ArtifactDownload>;
/** New artifact JSON transport only; old generic JSON requests keep their semantics. */
export declare function readArtifactJson(response: Response, signal: AbortSignal, error: () => Error): Promise<unknown>;
//# sourceMappingURL=artifact-transfer.d.ts.map