import { Thread, Post, PostRevision, CreateThreadRequest, PatchThreadRequest } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { HasherPort } from '../ports/hasher.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
export interface CreateThreadResult {
    thread: Thread;
    initial_post?: {
        post: Post;
        revision: PostRevision;
    };
}
export declare class ThreadService {
    private readonly storage;
    private readonly idGen;
    private readonly clock;
    private readonly hasher;
    private readonly authService;
    private readonly idempotency;
    constructor(storage: StoragePort, idGen: IdGeneratorPort, clock: ClockPort, hasher: HasherPort, authService: AuthService, idempotency: IdempotencyService);
    private validateStructuredContent;
    createThread(auth: AuthenticatedContext, spaceId: string, req: CreateThreadRequest, requestKey: string): CreateThreadResult;
    patchThread(auth: AuthenticatedContext, spaceId: string, threadId: string, req: PatchThreadRequest, requestKey: string): Thread;
}
//# sourceMappingURL=thread-service.d.ts.map