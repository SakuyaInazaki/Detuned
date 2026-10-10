import { type RequestKeyScope, type RequestKeyStore } from './request-key.js';
/** Opt-in local store. The directory must be trusted against changes by the same OS user. */
export declare class FileRequestKeyStore implements RequestKeyStore {
    private readonly directory;
    private constructor();
    static create(directory: string): Promise<FileRequestKeyStore>;
    private checkDirectory;
    private syncDirectory;
    private read;
    getOrCreate(scope: RequestKeyScope, logicalOperationId: string): Promise<string>;
}
//# sourceMappingURL=file-request-key-store.d.ts.map