type BodySchema = {
    properties: Record<string, unknown>;
    required?: readonly string[];
    [key: string]: unknown;
};
/** Offline JSON projection of canonical schemas. No token/client access or new runtime dependency. */
export declare function cliInputSchema(target: string, op: string, kind?: string): BodySchema;
export {};
//# sourceMappingURL=schema.d.ts.map