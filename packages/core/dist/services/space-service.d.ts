import { Space, SpaceRevision, Session, CreateSpaceRequest, PatchSpaceRequest, CreateSessionRequest } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
import { WriteRateLimiter } from './write-rate-limiter.js';
export declare class SpaceService {
    private readonly storage;
    private readonly idGen;
    private readonly clock;
    private readonly authService;
    private readonly idempotency;
    private readonly writeRateLimiter;
    constructor(storage: StoragePort, idGen: IdGeneratorPort, clock: ClockPort, authService: AuthService, idempotency: IdempotencyService, writeRateLimiter?: WriteRateLimiter);
    createSpace(auth: AuthenticatedContext, req: CreateSpaceRequest, requestKey: string): {
        space: Space;
        revision: SpaceRevision;
    };
    patchSpace(auth: AuthenticatedContext, spaceId: string, req: PatchSpaceRequest, requestKey: string): {
        space: Space;
        revision: SpaceRevision;
    };
    createSession(auth: AuthenticatedContext, spaceId: string, req: CreateSessionRequest): Session;
}
//# sourceMappingURL=space-service.d.ts.map