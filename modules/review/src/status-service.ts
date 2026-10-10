import { type ReviewStatusView } from '@detuned/protocol';
import { AuthService, type AuthenticatedContext, type StoragePort, readReviewStatusFacts } from '@detuned/core';
/** Internal metadata status: no sealed contents and no physical blob verification. */
export class ReviewStatusService {
  constructor(private readonly storage:StoragePort,private readonly authService:AuthService){}
  getStatus(auth:AuthenticatedContext,spaceId:string,requestId:string):ReviewStatusView {
    return this.storage.readSnapshot(()=>{
      this.authService.requireSpaceAccess(this.authService.refreshContext(auth),spaceId,'observer','read');
      return readReviewStatusFacts(this.storage, spaceId, requestId);
    });
  }
}
