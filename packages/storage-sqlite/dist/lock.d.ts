export declare class DirectoryLockUnavailableError extends Error {
    constructor();
}
export declare class DirectoryLock {
    private lockFd;
    private strictUnlinkPending;
    private readonly lockFilePath;
    constructor(dataDir: string);
    acquire(): void;
    /** Strict runtime shutdown path; legacy best-effort release remains unchanged. */
    releaseStrict(): void;
    release(): void;
}
//# sourceMappingURL=lock.d.ts.map