export declare class DirectoryLock {
    private lockFd;
    private readonly lockFilePath;
    constructor(dataDir: string);
    acquire(): void;
    release(): void;
}
//# sourceMappingURL=lock.d.ts.map