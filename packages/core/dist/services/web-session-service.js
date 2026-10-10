import { randomBytes, timingSafeEqual } from 'node:crypto';
import { DetunedError, ErrorCode } from '@detuned/protocol';
/** Process-local browser authentication, independent from forum diagnostic sessions. */
export class WebSessionService {
    authService;
    clock;
    hasher;
    options;
    sessions = new Map();
    closed = false;
    observed = 0;
    loginUnits = 20n * 60000n;
    loginAt;
    ttl;
    max;
    per;
    constructor(authService, clock, hasher, options = {}) {
        this.authService = authService;
        this.clock = clock;
        this.hasher = hasher;
        this.options = options;
        this.ttl = options.ttlMs ?? 1800000;
        this.max = options.maxSessions ?? 1000;
        this.per = options.maxPerCredential ?? 8;
        if (!Number.isSafeInteger(this.ttl) || this.ttl < 1 || this.ttl > 1800000 || !Number.isSafeInteger(this.max) || this.max < 1 || this.max > 1000 || !Number.isSafeInteger(this.per) || this.per < 1 || this.per > 8)
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid web session configuration.', 400);
    }
    now() { const n = this.clock.now().getTime(); if (!Number.isSafeInteger(n))
        throw new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, 'Service clock unavailable.', 503, true); this.observed = Math.max(this.observed, n); return this.observed; }
    available() { if (this.closed)
        throw new DetunedError(ErrorCode.SERVICE_NOT_READY, 'Web authentication unavailable.', 503, true); }
    sweep(now) { for (const [key, e] of this.sessions)
        if (e.expires <= now)
            this.sessions.delete(key); }
    meter() { const wall = BigInt(this.clock.now().getTime()); if (this.loginAt === undefined)
        this.loginAt = wall; const now = wall > this.loginAt ? wall : this.loginAt; this.loginUnits = this.loginUnits + (now - this.loginAt) * 120n; this.loginUnits = this.loginUnits > 1200000n ? 1200000n : this.loginUnits; this.loginAt = now; if (this.loginUnits < 60000n) {
        const wait = (60000n - this.loginUnits + (now - wall) * 120n + 119999n) / 120000n;
        throw new DetunedError(ErrorCode.RATE_LIMITED, 'Login rate limit reached.', 429, true, { scope: 'web_login', retry_after_seconds: Number(wait > 600000n ? 600000n : wait < 1n ? 1n : wait) });
    } this.loginUnits -= 60000n; }
    /** HTTP entry calls this after trusted Host/Origin and before body/credential parsing. */
    admitLoginAttempt() { this.available(); this.now(); this.meter(); }
    nonce() { return Buffer.from((this.options.random ?? randomBytes)(32)).toString('base64url'); }
    key(secret) { if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(secret))
        throw new DetunedError(ErrorCode.UNAUTHENTICATED, 'Web session unavailable.', 401); return this.hasher.sha256(secret); }
    data(e) { return { me: this.authService.getMe(e.auth), csrf_token: e.csrf, expires_at: new Date(e.expires).toISOString() }; }
    login(rawToken, previousSecret) {
        this.available();
        const now = this.now();
        const auth = this.authService.authenticateToken(rawToken);
        this.authService.requireOrdinaryAccess(auth);
        if (auth.actor.kind !== 'human')
            throw new DetunedError(ErrorCode.FORBIDDEN, 'Human credentials required.', 403);
        this.sweep(now);
        const old = previousSecret ? this.sessions.get(this.key(previousSecret)) : undefined;
        let same = 0;
        for (const e of this.sessions.values())
            if (e.auth.credential.id === auth.credential.id)
                same++;
        const replacing = old !== undefined;
        if (this.sessions.size - (replacing ? 1 : 0) >= this.max || same - (old?.auth.credential.id === auth.credential.id ? 1 : 0) >= this.per)
            throw new DetunedError(ErrorCode.RATE_LIMITED, 'Web session capacity reached.', 429, true, { scope: 'web_session', limit: this.sessions.size - (replacing ? 1 : 0) >= this.max ? 'instance' : 'credential', retry_after_seconds: 1 });
        const secret = this.nonce(), key = this.key(secret), e = { auth, csrf: this.nonce(), expires: now + this.ttl };
        if (this.sessions.has(key))
            throw new DetunedError(ErrorCode.INTERNAL_ERROR, 'Web session creation failed.', 500);
        const data = this.data(e);
        this.sessions.set(key, e);
        if (replacing)
            this.sessions.delete(this.key(previousSecret));
        return { secret, data };
    }
    get(secret) { this.available(); const now = this.now(); this.sweep(now); const key = this.key(secret), e = this.sessions.get(key); if (!e)
        throw new DetunedError(ErrorCode.UNAUTHENTICATED, 'Web session unavailable.', 401); try {
        e.auth = this.authService.refreshContext(e.auth);
    }
    catch (error) {
        this.sessions.delete(key);
        throw error;
    } return { auth: e.auth, data: this.data(e) }; }
    authorize(secret, csrf) { const result = this.get(secret); if (csrf !== undefined) {
        const a = Buffer.from(this.hasher.sha256(csrf)), b = Buffer.from(this.hasher.sha256(result.data.csrf_token));
        if (!timingSafeEqual(a, b))
            throw new DetunedError(ErrorCode.FORBIDDEN, 'Invalid web request verification.', 403);
    } return result.auth; }
    logout(secret, csrf) { this.authorize(secret, csrf); this.sessions.delete(this.key(secret)); }
    close() { this.closed = true; this.sessions.clear(); }
}
//# sourceMappingURL=web-session-service.js.map