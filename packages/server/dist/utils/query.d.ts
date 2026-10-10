export interface ParseIntegerQueryOptions {
    min?: number;
    max?: number;
    defaultValue?: number;
    required?: boolean;
}
export declare function parseIntegerQuery(val: unknown, paramName: string, options?: ParseIntegerQueryOptions): number | undefined;
export interface ParseStringQueryOptions {
    required?: boolean;
    allowedValues?: string[] | Set<string>;
    defaultValue?: string;
    allowEmpty?: boolean;
}
export declare function parseStringQuery(val: unknown, paramName: string, options?: ParseStringQueryOptions): string | undefined;
export declare function parseCsvQuery(val: unknown, paramName: string): string[] | undefined;
export declare function validateAllowedQueryParams(query: unknown, allowedKeys: string[]): void;
export declare function validateNoBody(body: unknown, operationName?: string): void;
export declare function parseSearchTagsJson(val: unknown): string[] | undefined;
//# sourceMappingURL=query.d.ts.map