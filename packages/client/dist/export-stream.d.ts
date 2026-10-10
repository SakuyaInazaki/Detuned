import { type SpaceExportComplete } from '@detuned/protocol';
export interface SpaceExportOptions {
    sink: (line: Uint8Array) => Promise<void> | void;
    signal?: AbortSignal;
    timeoutMs?: number;
}
/** Sink bytes are provisional until this promise resolves after the terminal line and EOF. No retries. */
export declare function streamSpaceExport(baseUrl: string, token: string | undefined, spaceId: string, defaultTimeoutMs: number, options: SpaceExportOptions, cookieSession?: boolean): Promise<SpaceExportComplete>;
//# sourceMappingURL=export-stream.d.ts.map