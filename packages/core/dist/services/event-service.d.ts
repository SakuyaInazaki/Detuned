import { Subscription, Consumer, CreateSubscriptionRequest, PollRequest, PollResponseData, AckRequest, AckResponseData } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
export declare class EventService {
    private readonly storage;
    private readonly idGen;
    private readonly clock;
    private readonly tokenSigner;
    private readonly authService;
    private readonly tokenSecret;
    constructor(storage: StoragePort, idGen: IdGeneratorPort, clock: ClockPort, tokenSigner: TokenSignerPort, authService: AuthService, tokenSecret: string);
    subscribe(auth: AuthenticatedContext, spaceId: string, req: CreateSubscriptionRequest): {
        subscription: Subscription;
        consumer: Consumer;
    };
    poll(auth: AuthenticatedContext, spaceId: string, consumerId: string, req: PollRequest): PollResponseData;
    ack(auth: AuthenticatedContext, spaceId: string, consumerId: string, req: AckRequest): AckResponseData;
    deactivateConsumer(auth: AuthenticatedContext, spaceId: string, consumerId: string): void;
}
//# sourceMappingURL=event-service.d.ts.map