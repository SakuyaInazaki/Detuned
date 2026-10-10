export interface StagedBlob {
  readonly stage_key: string;
  readonly sha256: string;
  readonly bytes: number;
}
export interface BlobReadHandle {
  readonly chunks: AsyncIterable<Uint8Array>;
  dispose(): Promise<void>;
}
/** Internal file handles and keys never cross the public protocol boundary. */
export interface BlobStorePort {
  stage(chunks: AsyncIterable<Uint8Array>, maxBytes: number, signal?: AbortSignal): Promise<StagedBlob>;
  publish(staged: StagedBlob, storageKey: string): Promise<void>;
  discardStage(staged: StagedBlob): Promise<void>;
  discardPublished(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  open(storageKey: string): Promise<BlobReadHandle | null>;
}
