/** Owners finish only after their complete async finally; sockets are not ownership. */
export declare class RuntimeResources {
    private isClosing;
    private cancelFailed;
    private readonly active;
    private idle;
    private resolveIdle;
    get closing(): boolean;
    get activeCount(): number;
    acquire(cancel: () => void): () => void;
    beginClosing(): void;
    waitForIdle(): Promise<void>;
}
//# sourceMappingURL=runtime-resources.d.ts.map