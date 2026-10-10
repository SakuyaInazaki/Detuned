/** Internal local diagnostics only; never constructed from raw input or cause.message. */
export declare class CliSafeError extends Error {
}
export declare function renderCliError(error: unknown): {
    code: string;
    message: string;
    details?: Record<string, unknown>;
};
//# sourceMappingURL=cli-errors.d.ts.map