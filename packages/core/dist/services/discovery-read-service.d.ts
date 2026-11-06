import { type RelationHistoryQuery, type RelationHistoryPage } from '@detuned/protocol';
import { type PostRelationsQuery, type PostRelationsPage, type RelationReadView } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { ClockPort } from '../ports/clock.js';
import { AuthService, type AuthenticatedContext } from './auth-service.js';
export declare class DiscoveryReadService {
    private readonly storage;
    private readonly signer;
    private readonly authService;
    private readonly secret;
    private readonly clock;
    constructor(storage: StoragePort, signer: TokenSignerPort, authService: AuthService, secret: string, clock: ClockPort);
    private project;
    getRelation(auth: AuthenticatedContext, spaceId: string, id: string): RelationReadView;
    getRelationHistory(auth: AuthenticatedContext, spaceId: string, relationId: string, query: RelationHistoryQuery, budget: {
        request_id: string;
    }): RelationHistoryPage;
    private projectReason;
    getPostRelations(auth: AuthenticatedContext, spaceId: string, postId: string, revision: number, query: PostRelationsQuery, budget: {
        request_id: string;
    }): PostRelationsPage;
}
//# sourceMappingURL=discovery-read-service.d.ts.map