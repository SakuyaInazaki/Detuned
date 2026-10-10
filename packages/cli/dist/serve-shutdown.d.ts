export declare function parseShutdownTimeout(value: unknown): number;
export interface ServeShutdownDependencies {
    beginDraining(): void;
    closeApp(): Promise<void>;
    closeDatabase(): void;
    releaseLock(): void;
    disposeLogs(): void;
    reportFailure(): void;
    exit(code: number): void;
}
/** One owned close task; failed or expired phases never advance to DB/lock cleanup. */
export declare function createServeShutdown(deps: ServeShutdownDependencies, timeoutMs: number): {
    shutdown: (exitCode?: number) => Promise<void>;
    attachSignals(target?: NodeJS.Process): void;
    dispose: () => void;
};
//# sourceMappingURL=serve-shutdown.d.ts.map