import type { BlobStorePort, BlobReadHandle, StagedBlob } from '@detuned/core';
/** Owned local directories. Initialization and orphan cleanup belong to locked CLI startup. */
export declare class ArtifactFileStore implements BlobStorePort {
    private readonly dataRoot;
    private readonly root;
    private readonly staging;
    private readonly objects;
    private constructor();
    static create(dataDir: string): Promise<ArtifactFileStore>;
    private checkRoots;
    private keyPath;
    private remove;
    stage(chunks: AsyncIterable<Uint8Array>, maxBytes: number, signal?: AbortSignal): Promise<StagedBlob>;
    publish(staged: StagedBlob, storageKey: string): Promise<void>;
    discardStage(staged: StagedBlob): Promise<void>;
    discardPublished(storageKey: string): Promise<void>;
    exists(storageKey: string): Promise<boolean>;
    open(storageKey: string): Promise<BlobReadHandle | null>;
    /** Invoke only after acquiring DirectoryLock and coordinating DB, before listen. */
    cleanupOrphans(liveStorageKeys: readonly string[]): Promise<void>;
}
//# sourceMappingURL=artifact-files.d.ts.map