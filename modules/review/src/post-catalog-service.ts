import {DetunedError,ErrorCode,isPostReviewRequestsCursor,validatePostReviewRequestsQuery,postReviewRequestsEnvelopeBytes,type PostReviewRequestsQuery,type PostReviewRequestsPage} from '@detuned/protocol';
import {AuthService,type AuthenticatedContext,type StoragePort,type TokenSignerPort,type ClockPort} from '@detuned/core';
import {ReviewStatusService} from './status-service.js';
const invalid=()=>new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid review directory query or cursor.',400);
const tooBroad=()=>new DetunedError(ErrorCode.QUERY_TOO_BROAD,'Required review metadata cannot fit the budget. Increase max_bytes.',422);
export class ReviewPostCatalogService {
 constructor(private readonly storage:StoragePort,private readonly auth:AuthService,private readonly status:ReviewStatusService,private readonly signer:TokenSignerPort,private readonly secret:string,private readonly clock:ClockPort){}
 getRequests(context:AuthenticatedContext,spaceId:string,postId:string,query:PostReviewRequestsQuery,budget:{request_id:string}):PostReviewRequestsPage {
  return this.storage.readSnapshot(()=>{
   const current=this.auth.refreshContext(context);this.auth.requireSpaceAccess(current,spaceId,'observer','read');
   const post=this.storage.findPostById(postId);
   if(!post||post.space_id!==spaceId)throw new DetunedError(ErrorCode.NOT_FOUND,'Post does not exist or is not accessible.',404);
   if(post.lifecycle==='redacted')throw new DetunedError(ErrorCode.CONTENT_REDACTED,'Post content has been redacted.',410);
   try{validatePostReviewRequestsQuery(query);}catch{throw invalid();}
   if(!budget||typeof budget.request_id!=='string')throw invalid();
   const now=Math.floor(this.clock.now().getTime()/1000);let exp=now+86400,after:number|undefined;
   if(query.cursor!==undefined){const payload=this.signer.verify(query.cursor,this.secret,now);
    if(!isPostReviewRequestsCursor(payload)||payload.actor_id!==current.actor.id||payload.space_id!==spaceId||payload.post_id!==postId||payload.exp<now||payload.exp>exp)throw invalid();
    after=payload.after_round;exp=payload.exp;
   }
   const listed=this.storage.listPostReviewRequests(spaceId,postId,query.limit??20,after);
   const data=listed.requests.map(row=>({...this.status.getStatus(current,spaceId,row.id),space_id:spaceId,target_post_id:postId,round:row.round,target_revision:row.target_ref.revision,created_at:row.created_at}));
   let removed=false;
   while(true){const more=listed.has_more||removed,last=data.at(-1);
    if(more&&!last)throw tooBroad();
    const cursor=more?this.signer.sign({v:1,purpose:'post_review_requests',actor_id:current.actor.id,space_id:spaceId,post_id:postId,sort:'round_desc',after_round:last!.round,exp},this.secret):null;
    const page={data,meta:{truncated:removed,next_cursor:cursor}};
    if((cursor===null||cursor.length<=4096)&&postReviewRequestsEnvelopeBytes(budget.request_id,page)<=(query.max_bytes??12288))return page;
    if(data.length<=1)throw tooBroad();data.pop();removed=true;
   }
  });
 }
}
