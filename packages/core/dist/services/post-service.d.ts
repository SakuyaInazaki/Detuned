import { Post, PostRevision, Relation, CreatePostRequest, CreatePostRevisionRequest, WithdrawPostRequest } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { HasherPort } from '../ports/hasher.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
export declare class PostService {
    private readonly storage;
    private readonly idGen;
    private readonly clock;
    private readonly hasher;
    private readonly authService;
    private readonly idempotency;
    constructor(storage: StoragePort, idGen: IdGeneratorPort, clock: ClockPort, hasher: HasherPort, authService: AuthService, idempotency: IdempotencyService);
    private validateStructuredContent;
    createPost(auth: AuthenticatedContext, spaceId: string, threadId: string, req: CreatePostRequest, requestKey: string): {
        post: Post;
        revision: PostRevision;
        relations: Relation[];
    };
    createRevision(auth: AuthenticatedContext, spaceId: string, postId: string, req: CreatePostRevisionRequest, requestKey: string): {
        post: Post;
        revision: PostRevision;
        relations: Relation[];
    };
    withdrawPost(auth: AuthenticatedContext, spaceId: string, postId: string, req: WithdrawPostRequest, requestKey: string): Post;
    getPost(auth: AuthenticatedContext, spaceId: string, postId: string, revision?: number): {
        post: Post;
        revision: PostRevision;
    };
}
//# sourceMappingURL=post-service.d.ts.map