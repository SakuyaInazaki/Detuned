export interface HasherPort {
    sha256(data: string | Buffer): string;
    canonicalJson(data: unknown): string;
}
export declare function canonicalJsonStringify(data: unknown): string;
export declare class CryptoHasher implements HasherPort {
    sha256(data: string | Buffer): string;
    canonicalJson(data: unknown): string;
}
//# sourceMappingURL=hasher.d.ts.map