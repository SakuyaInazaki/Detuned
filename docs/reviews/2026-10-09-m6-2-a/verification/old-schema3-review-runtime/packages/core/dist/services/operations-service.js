import { DetunedError, ErrorCode } from '@detuned/protocol';
/** Health is a sampled hint; administrator diagnostics never confer research permissions. */
export class OperationsService {
    storage;
    auth;
    draining = false;
    constructor(storage, auth) {
        this.storage = storage;
        this.auth = auth;
    }
    beginDraining() { this.draining = true; }
    getReadiness() { return !this.draining && this.storage.checkReadiness(); }
    getDiagnostics(context) {
        const current = this.auth.refreshContext(context);
        this.auth.requireInstanceAdmin(current);
        try {
            const sample = this.storage.sampleOperationalStatus();
            return { ...sample, lifecycle: this.draining ? 'draining' : 'running', ready: this.getReadiness() };
        }
        catch {
            throw new DetunedError(ErrorCode.INTERNAL_ERROR, '运行统计暂不可用。', 500);
        }
    }
}
//# sourceMappingURL=operations-service.js.map