import { Relation, RelationResolution, CreateRelationRequest, ResolveRelationRequest, ReopenRelationRequest } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
export declare class RelationService {
    private readonly storage;
    private readonly idGen;
    private readonly clock;
    private readonly authService;
    private readonly idempotency;
    constructor(storage: StoragePort, idGen: IdGeneratorPort, clock: ClockPort, authService: AuthService, idempotency: IdempotencyService);
    createRelation(auth: AuthenticatedContext, spaceId: string, req: CreateRelationRequest, requestKey: string): Relation;
    resolveChallenge(auth: AuthenticatedContext, spaceId: string, relationId: string, req: ResolveRelationRequest, requestKey: string): {
        relation: Relation;
        resolution: RelationResolution;
    };
    reopenChallenge(auth: AuthenticatedContext, spaceId: string, relationId: string, req: ReopenRelationRequest, requestKey: string): {
        relation: Relation;
        resolution: RelationResolution;
    };
}
//# sourceMappingURL=relation-service.d.ts.map