import type { FastifyPluginAsync } from 'fastify';
import type { WebSessionService } from '@detuned/core';
import { type WebAuthConfig } from '../web-auth.js';
export declare const authRoutes: FastifyPluginAsync<{
    service: WebSessionService;
    config: WebAuthConfig;
}>;
//# sourceMappingURL=auth.d.ts.map