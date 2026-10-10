import type { Writable } from 'node:stream';
/** Bounded best-effort NDJSON; never destroys the process-owned output stream. */
export declare function createRequestLogWriter(stream: Writable): {
    write: (entry: unknown) => void;
    close: () => void;
    readonly pendingBytes: number;
    readonly pendingEntries: number;
};
//# sourceMappingURL=request-log-writer.d.ts.map