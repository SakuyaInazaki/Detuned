import { DetunedError, EXPORT_LIMITS } from '@detuned/protocol';
import type { SpaceExportSnapshot } from '../ports/space-export-snapshot.js';
import type { StoragePort } from '../ports/storage.js';
import type { ClockPort } from '../ports/clock.js';
import { AuthService, type AuthenticatedContext } from './auth-service.js';
export type SpaceExportLimits = {
    [K in keyof typeof EXPORT_LIMITS]: number;
};
export type SpaceExportNext = {
    kind: 'line';
    line: string;
} | {
    kind: 'pending';
} | {
    kind: 'done';
};
export interface SpaceExportOptions {
    limits?: Partial<SpaceExportLimits>;
}
export interface SpaceExportOpenOptions {
    onError?: (error: DetunedError) => void;
}
/** One content reader per active export; live authorization always uses the original storage. */
export declare class SpaceExportService {
    private readonly storage;
    private readonly authService;
    private readonly clock;
    private readonly sessions;
    private readonly limits;
    constructor(storage: StoragePort, authService: AuthService, clock: ClockPort, options?: SpaceExportOptions);
    get activeCount(): number;
    open(auth: AuthenticatedContext, spaceId: string, options?: SpaceExportOpenOptions): SpaceExportSession;
    closeAll(): void;
}
export declare class SpaceExportSession {
    private readonly storage;
    private readonly authService;
    private readonly clock;
    private readonly snapshot;
    private readonly auth;
    private readonly spaceId;
    private readonly limits;
    private readonly options;
    private readonly released;
    private closed;
    private terminalError?;
    private phase;
    private count;
    private bytes;
    private chain;
    private checkedThrough;
    private readonly timer;
    private readonly deadline;
    private readonly createdAt;
    private readonly exportId;
    constructor(storage: StoragePort, authService: AuthService, clock: ClockPort, snapshot: SpaceExportSnapshot, auth: AuthenticatedContext, spaceId: string, limits: SpaceExportLimits, options: SpaceExportOpenOptions, released: () => void);
    private guard;
    private postRef;
    private evidence;
    private structured;
    private project;
    private encode;
    /** Synchronous guard immediately before delivery. Call only when downstream is ready for one line. */
    nextLine(): SpaceExportNext;
    terminate(error: DetunedError): void;
    close(): void;
}
//# sourceMappingURL=space-export-service.d.ts.map