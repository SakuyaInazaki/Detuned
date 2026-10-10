import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { AuthenticatedContext } from '@detuned/core';
import type { ReviewRequestService, ReviewSubmissionService, ReviewFinalizationService, ReviewStatusService } from '@detuned/module-review';
import { CreateReviewRequestSchema, CreateReviewSubmissionSchema, CancelReviewRequestSchema, FinalizeReviewRequestSchema,
 type CreateReviewRequest, type CreateReviewSubmission, type CancelReviewRequest, type FinalizeReviewRequest,
 DetunedError, ErrorCode, isNonblankString } from '@detuned/protocol';
import { validateAllowedQueryParams } from '../utils/query.js';
interface ReviewRouteOptions { requests:ReviewRequestService; submissions:ReviewSubmissionService; finalization:ReviewFinalizationService; status:ReviewStatusService; }
const auth=(req:FastifyRequest)=>(req as FastifyRequest & {auth:AuthenticatedContext}).auth;
const params=(req:FastifyRequest)=>req.params as {space_id:string;id:string};
function key(req:FastifyRequest):string {
 const raw=req.raw.rawHeaders;let count=0;
 for(let i=0;i<raw.length;i+=2)if(raw[i]?.toLowerCase()==='idempotency-key')count++;
 const value=req.headers['idempotency-key'];
 if(count!==1||typeof value!=='string'||!isNonblankString(value))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'缺少或重复的 Idempotency-Key 请求头。',400);
 return value;
}
const envelope=(requestId:string,data:unknown)=>({api_version:'1',request_id:requestId,data});
export const reviewRoutes:FastifyPluginAsync<ReviewRouteOptions>=async(app,services)=>{
 app.addHook('onRequest',async(_req,reply)=>{reply.header('Cache-Control','private, no-store');});
 app.addHook('preValidation',async req=>{validateAllowedQueryParams(req.query,[]);});
 app.post<{Body:CreateReviewRequest}>('/spaces/:space_id/review-requests',{schema:{body:CreateReviewRequestSchema}},async(req,reply)=>{
  const {space_id}=params(req);const value=services.requests.createRequest(auth(req),space_id,req.body,key(req));reply.code(201);return envelope(req.id,value);
 });
 app.get('/spaces/:space_id/review-requests/:id',async req=>{const {space_id,id}=params(req);return envelope(req.id,services.requests.getRequest(auth(req),space_id,id));});
 app.get('/spaces/:space_id/review-snapshots/:id',async req=>{const {space_id,id}=params(req);return envelope(req.id,services.requests.getSnapshot(auth(req),space_id,id));});
 app.get('/spaces/:space_id/review-requests/:id/assignment',async req=>{const {space_id,id}=params(req);return envelope(req.id,services.submissions.getOwnAssignment(auth(req),space_id,id));});
 app.post<{Body:CreateReviewSubmission}>('/spaces/:space_id/review-requests/:id/submissions',{schema:{body:CreateReviewSubmissionSchema}},async(req,reply)=>{
  const {space_id,id}=params(req);const value=services.submissions.submit(auth(req),space_id,id,req.body,key(req));reply.code(201);return envelope(req.id,value);
 });
 app.get('/spaces/:space_id/review-submissions/:id',async req=>{const {space_id,id}=params(req);return envelope(req.id,services.submissions.getSubmission(auth(req),space_id,id));});
 app.get('/spaces/:space_id/review-requests/:id/submissions',async req=>{const {space_id,id}=params(req);return envelope(req.id,services.submissions.listVisibleSubmissions(auth(req),space_id,id));});
 app.post<{Body:FinalizeReviewRequest}>('/spaces/:space_id/review-requests/:id/finalize',{schema:{body:FinalizeReviewRequestSchema}},async req=>{
  const {space_id,id}=params(req);return envelope(req.id,services.finalization.finalizeRequest(auth(req),space_id,id,req.body,key(req)));
 });
 app.post<{Body:CancelReviewRequest}>('/spaces/:space_id/review-requests/:id/cancel',{schema:{body:CancelReviewRequestSchema}},async req=>{
  const {space_id,id}=params(req);return envelope(req.id,services.requests.cancelRequest(auth(req),space_id,id,req.body,key(req)));
 });
 app.get('/spaces/:space_id/review-requests/:id/status',async req=>{const {space_id,id}=params(req);return envelope(req.id,services.status.getStatus(auth(req),space_id,id));});
 app.get('/spaces/:space_id/review-requests/:id/decision',async req=>{const {space_id,id}=params(req);return envelope(req.id,services.finalization.getDecision(auth(req),space_id,id));});
};
