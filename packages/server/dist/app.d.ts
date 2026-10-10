import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import { type ServerTlsOptions } from './tls-config.js';
import { RuntimeResources } from './runtime-resources.js';
import { FastifyInstance } from 'fastify';
import { StoragePort, ClockPort, IdGeneratorPort, HasherPort, TokenSignerPort, BlobStorePort } from '@detuned/core';
import { type ResourceLimits, type WriteRateLimits, type ArtifactLimits } from '@detuned/protocol';
import { type RequestLogSink } from './observability.js';
declare module 'fastify' {
    interface FastifyInstance {
        detunedBeginDraining(): void;
        runtimeResources: RuntimeResources;
    }
}
export interface AppOptions {
    storage: StoragePort;
    tls?: ServerTlsOptions;
    webOrigin?: string;
    webAssetsDir?: string;
    allowInsecureLoopback?: boolean;
    requestLogSink?: RequestLogSink;
    clock?: ClockPort;
    idGen?: IdGeneratorPort;
    hasher?: HasherPort;
    tokenSigner?: TokenSignerPort;
    tokenSecret?: string;
    artifactBlobs?: BlobStorePort;
    artifactLimits?: Partial<ArtifactLimits>;
    writeRateLimits?: Partial<WriteRateLimits>;
    resourceLimits?: Partial<ResourceLimits>;
    artifactMaxUploads?: number;
    exportLimits?: {
        max_raw_bytes?: number;
        max_line_bytes?: number;
        max_total_bytes?: number;
        max_records?: number;
        deadline_ms?: number;
        max_active?: number;
    };
}
export type ServerApp = FastifyInstance<HttpServer | HttpsServer>;
export declare function buildApp(options: AppOptions): ServerApp;
//# sourceMappingURL=app.d.ts.map