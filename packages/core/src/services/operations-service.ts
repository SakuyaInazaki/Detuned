import { DetunedError, ErrorCode, type OperationsDiagnostics } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
import { AuthService, type AuthenticatedContext } from './auth-service.js';

/** Health is a sampled hint; administrator diagnostics never confer research permissions. */
export class OperationsService {
  private draining = false;
  constructor(private readonly storage:StoragePort, private readonly auth:AuthService) {}
  beginDraining():void { this.draining=true; }
  getReadiness():boolean { return !this.draining && this.storage.checkReadiness(); }
  getDiagnostics(context:AuthenticatedContext):OperationsDiagnostics {
    const current=this.auth.refreshContext(context);
    this.auth.requireInstanceAdmin(current);
    try {
      const sample=this.storage.sampleOperationalStatus();
      return {...sample,lifecycle:this.draining ? 'draining' : 'running',ready:this.getReadiness()};
    } catch { throw new DetunedError(ErrorCode.INTERNAL_ERROR,'运行统计暂不可用。',500); }
  }
}
