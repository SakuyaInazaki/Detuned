import type { FastifyPluginAsync } from 'fastify';
import type { ArtifactService, BlobStorePort } from '@detuned/core';
import { type ArtifactLimits } from '@detuned/protocol';
interface ArtifactRouteOptions {
    service?: ArtifactService;
    blobs?: BlobStorePort;
    limits: ArtifactLimits;
    maxUploads: number;
}
export declare const artifactRoutes: FastifyPluginAsync<ArtifactRouteOptions>;
export {};
//# sourceMappingURL=artifacts.d.ts.map