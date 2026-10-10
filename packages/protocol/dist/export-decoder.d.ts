import { type SpaceExportLine, type SpaceExportComplete } from './export.js';
export declare class ExportDecodeError extends Error {
    constructor(message: string);
}
export interface SpaceExportDecodeOptions {
    onLine?: (line: SpaceExportLine, rawLine: Uint8Array) => void | Promise<void>;
    signal?: AbortSignal;
    expectedSpaceId?: string;
    limits?: Partial<Record<'max_line_bytes' | 'max_total_bytes' | 'max_records', number>>;
}
/** Every callback is provisional. Only complete end plus EOF resolves successfully. */
export declare function decodeSpaceExport(chunks: AsyncIterable<Uint8Array>, options?: SpaceExportDecodeOptions): Promise<SpaceExportComplete>;
//# sourceMappingURL=export-decoder.d.ts.map