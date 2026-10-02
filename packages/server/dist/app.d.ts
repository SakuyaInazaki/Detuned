import { FastifyInstance } from 'fastify';
import { StoragePort, ClockPort, IdGeneratorPort, HasherPort, TokenSignerPort } from '@detuned/core';
export interface AppOptions {
    storage: StoragePort;
    clock?: ClockPort;
    idGen?: IdGeneratorPort;
    hasher?: HasherPort;
    tokenSigner?: TokenSignerPort;
    tokenSecret?: string;
}
export declare function buildApp(options: AppOptions): FastifyInstance;
//# sourceMappingURL=app.d.ts.map