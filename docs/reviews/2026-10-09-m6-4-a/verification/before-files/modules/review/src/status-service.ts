import { DetunedError,ErrorCode,type ReviewStatusView } from '@detuned/protocol';
import { AuthService,type AuthenticatedContext,type StoragePort,readIntrinsicReviewRequestRecords,readReviewValidityFacts } from '@detuned/core';
/** Internal metadata status: no sealed contents and no physical blob verification. */
export class ReviewStatusService {
  constructor(private readonly storage:StoragePort,private readonly authService:AuthService){}
  getStatus(auth:AuthenticatedContext,spaceId:string,requestId:string):ReviewStatusView {
    return this.storage.readSnapshot(()=>{
      this.authService.requireSpaceAccess(this.authService.refreshContext(auth),spaceId,'observer','read');
      const head=this.storage.findReviewRequestById(requestId);
      if(!head||head.space_id!==spaceId)throw new DetunedError(ErrorCode.NOT_FOUND,'Review request does not exist or is not accessible.',404);
      const {manifest}=readIntrinsicReviewRequestRecords(this.storage,spaceId,requestId);
      return {request_id:head.id,snapshot_id:head.snapshot_id,phase:head.phase,
        verification_status:manifest.review_policy.required_checks.length===0?'not_required':'pending',
        ...readReviewValidityFacts(this.storage,spaceId,requestId)};
    });
  }
}
