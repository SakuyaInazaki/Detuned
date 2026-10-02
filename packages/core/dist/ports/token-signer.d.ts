export interface TokenSignerPort {
    sign(payload: Record<string, unknown>, secret: string): string;
    verify(token: string, secret: string): Record<string, unknown> | null;
}
export declare class HmacTokenSigner implements TokenSignerPort {
    sign(payload: Record<string, unknown>, secret: string): string;
    verify(token: string, secret: string): Record<string, unknown> | null;
}
//# sourceMappingURL=token-signer.d.ts.map