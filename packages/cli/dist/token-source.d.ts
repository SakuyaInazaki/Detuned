/** Preserve the CLI two-argument composition contract; shared logic reads no ambient environment. */
export declare function resolveCliToken(options: {
    token?: string;
    tokenFile?: string;
}, env: {
    DETUNED_TOKEN?: string;
    DETUNED_TOKEN_FILE?: string;
}): string | undefined;
//# sourceMappingURL=token-source.d.ts.map