import { DetunedError,ErrorCode } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
import { AuthService,type AuthenticatedContext } from './auth-service.js';
import { readCheckRun,assertCheckOnlinePrivacy } from './check-records.js';
import { readReviewSnapshotRecords,assertReviewSnapshotCurrent } from './review-request-records.js';
export function authorizeCheck(storage:StoragePort,authService:AuthService,auth:AuthenticatedContext,spaceId:string,runId:string,fresh=false,verifierOnly=false) {
  const current=authService.refreshContext(auth);
  if(current.credential.capabilities.includes('verify')){
    const binding=storage.findCheckRunCredentialByCredentialId(current.credential.id);
    if(binding?.check_run_id!==runId||current.credential.allowed_space_ids[0]!==spaceId)throw new DetunedError(ErrorCode.NOT_FOUND,'Check does not exist or is not accessible.',404);
  }else {
    if(verifierOnly)throw new DetunedError(ErrorCode.FORBIDDEN,'An assigned verification credential is required.',403);
    authService.requireSpaceAccess(current,spaceId,'observer','read');
  }
  const run=readCheckRun(storage,spaceId,runId);assertCheckOnlinePrivacy(storage,spaceId,run);
  if(fresh){const head=storage.findReviewRequestById(run.request_id)!;if(run.state!=='pending'||!['collecting','revealed'].includes(head.phase))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Check cannot accept new execution material.',400);assertReviewSnapshotCurrent(storage,readReviewSnapshotRecords(storage,spaceId,run.snapshot_id));}
  return {current,run};
}
