import type { FastifyRequest } from 'fastify';
export interface WebAuthConfig {
    origin: string;
    authority: string;
    secure: boolean;
}
export declare function resolveWebAuthConfig(options: {
    webOrigin?: string;
    allowInsecureLoopback?: boolean;
}): WebAuthConfig | undefined;
export declare function uniqueHeader(req: FastifyRequest, name: string, max?: number): string | undefined;
export declare function checkWebRequest(req: FastifyRequest, config: WebAuthConfig, requireOrigin?: boolean): void;
export declare function readWebCookie(req: FastifyRequest): string | undefined;
export declare function readCsrf(req: FastifyRequest): string;
export declare function bearerToken(req: FastifyRequest): string;
export declare function sessionCookie(secret: string | undefined, config: WebAuthConfig): string;
//# sourceMappingURL=web-auth.d.ts.map