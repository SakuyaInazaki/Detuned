export declare function readArtifactBlob(input: string, mime?: string): Promise<Blob>;
export declare function publishArtifactFile(requested: string, bytes: Uint8Array, signal?: AbortSignal, options?: {
    syncParent?: (parent: string) => Promise<void>;
}): Promise<void>;
//# sourceMappingURL=artifact-io.d.ts.map