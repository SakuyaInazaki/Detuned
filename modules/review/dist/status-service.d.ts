import { type ReviewStatusView } from '@detuned/protocol';
import { AuthService, type AuthenticatedContext, type StoragePort } from '@detuned/core';
/** Internal metadata status: no sealed contents and no physical blob verification. */
export declare class ReviewStatusService {
    private readonly storage;
    private readonly authService;
    constructor(storage: StoragePort, authService: AuthService);
    getStatus(auth: AuthenticatedContext, spaceId: string, requestId: string): ReviewStatusView;
}
//# sourceMappingURL=status-service.d.ts.map