import { type WriteRateLimits } from '@detuned/protocol';
import type { ClockPort } from '../ports/clock.js';
/** Process-local admission, independent of database transaction rollback. */
export declare class WriteRateLimiter {
    private readonly clock;
    private readonly buckets;
    private readonly limits;
    private readonly capacity;
    private readonly maxActors;
    private observedAt;
    constructor(clock: ClockPort, limits?: Partial<WriteRateLimits>, options?: {
        maxActors?: number;
    });
    private refill;
    private seconds;
    private reject;
    admit(actorId: string): void;
}
//# sourceMappingURL=write-rate-limiter.d.ts.map