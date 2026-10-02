import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
export interface CreateRedactionInput {
    target_type: 'post' | 'artifact';
    target_id: string;
    reason: string;
}
export interface RedactionResult {
    redaction_id: string;
}
export declare class RedactionService {
    private readonly storage;
    private readonly idGen;
    private readonly clock;
    private readonly authService;
    private readonly idempotency;
    constructor(storage: StoragePort, idGen: IdGeneratorPort, clock: ClockPort, authService: AuthService, idempotency: IdempotencyService);
    createRedaction(auth: AuthenticatedContext, spaceId: string, input: CreateRedactionInput, idempotencyKey: string): {
        data: RedactionResult;
        isReplay: boolean;
    };
}
//# sourceMappingURL=redaction-service.d.ts.map