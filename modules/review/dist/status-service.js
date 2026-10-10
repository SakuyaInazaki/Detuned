import { readReviewStatusFacts } from '@detuned/core';
/** Internal metadata status: no sealed contents and no physical blob verification. */
export class ReviewStatusService {
    storage;
    authService;
    constructor(storage, authService) {
        this.storage = storage;
        this.authService = authService;
    }
    getStatus(auth, spaceId, requestId) {
        return this.storage.readSnapshot(() => {
            this.authService.requireSpaceAccess(this.authService.refreshContext(auth), spaceId, 'observer', 'read');
            return readReviewStatusFacts(this.storage, spaceId, requestId);
        });
    }
}
//# sourceMappingURL=status-service.js.map