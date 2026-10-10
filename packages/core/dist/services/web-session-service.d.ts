import { type WebSessionResponse } from '@detuned/protocol';
import { AuthService, type AuthenticatedContext } from './auth-service.js';
import type { ClockPort } from '../ports/clock.js';
import type { HasherPort } from '../ports/hasher.js';
export interface WebSessionOptions {
    ttlMs?: number;
    maxSessions?: number;
    maxPerCredential?: number;
    random?: (bytes: number) => Uint8Array;
}
/** Process-local browser authentication, independent from forum diagnostic sessions. */
export declare class WebSessionService {
    private readonly authService;
    private readonly clock;
    private readonly hasher;
    private readonly options;
    private readonly sessions;
    private closed;
    private observed;
    private loginUnits;
    private loginAt;
    private readonly ttl;
    private readonly max;
    private readonly per;
    constructor(authService: AuthService, clock: ClockPort, hasher: HasherPort, options?: WebSessionOptions);
    private now;
    private available;
    private sweep;
    private meter;
    /** HTTP entry calls this after trusted Host/Origin and before body/credential parsing. */
    admitLoginAttempt(): void;
    private nonce;
    private key;
    private data;
    login(rawToken: string, previousSecret?: string): {
        secret: string;
        data: WebSessionResponse;
    };
    get(secret: string): {
        auth: AuthenticatedContext;
        data: WebSessionResponse;
    };
    authorize(secret: string, csrf?: string): AuthenticatedContext;
    logout(secret: string, csrf: string): void;
    close(): void;
}
//# sourceMappingURL=web-session-service.d.ts.map