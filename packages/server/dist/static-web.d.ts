import type { FastifyInstance, FastifyRequest } from 'fastify';
/** Explicit build directory only; never infer it from the instance data directory. */
export declare function resolveWebAssetsDir(value: string | undefined, webOrigin: string | undefined, dataDir?: string): string | undefined;
export declare function isWebStaticRequest(req: FastifyRequest): boolean;
export declare function staticWebRoutes(app: FastifyInstance, options: {
    root: string;
}): Promise<void>;
//# sourceMappingURL=static-web.d.ts.map