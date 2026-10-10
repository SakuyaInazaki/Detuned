import type { FastifyPluginAsync,FastifyRequest } from 'fastify';
import type { CheckService,AuthenticatedContext } from '@detuned/core';
import { CreateCheckRunSchema,InvalidateCheckRunSchema,SubmitCheckReceiptSchema,IssueCheckRunCredentialRequestSchema,
 type CreateCheckRun,type InvalidateCheckRun,type SubmitCheckReceipt,type IssueCheckRunCredentialRequest,type CheckRunRecord,
 isCheckRunView,isCheckSnapshotView,isCheckPostRevisionView,isCheckReceiptView,isRequiredChecksView,isIssueCheckRunCredentialData,
 CheckRunParamsSchema,CheckSpaceParamsSchema,CheckPostParamsSchema,CheckRequestParamsSchema,
 DetunedError,ErrorCode } from '@detuned/protocol';
import {validateAllowedQueryParams} from '../utils/query.js';
const auth=(req:FastifyRequest)=>(req as FastifyRequest&{auth:AuthenticatedContext}).auth;
const params=(req:FastifyRequest)=>req.params as {space_id:string;run_id:string;post_id:string;revision:string;request_id:string};
function key(req:FastifyRequest){let count=0;for(let i=0;i<req.raw.rawHeaders.length;i+=2)if(req.raw.rawHeaders[i]?.toLowerCase()==='idempotency-key')count++;const value=req.headers['idempotency-key'];if(count!==1||typeof value!=='string'||!value.trim())throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Missing or duplicate Idempotency-Key.',400);return value;}
const publicRun=(run:CheckRunRecord,spaceId:string)=>{const {created_request_version,...view}=run;return {...view,space_id:spaceId};};
function checked(req:FastifyRequest,data:unknown,valid:boolean){if(!valid)throw new DetunedError(ErrorCode.RESYNC_REQUIRED,'Check response cannot be safely reconstructed.',409);return {api_version:'1',request_id:req.id,data};}
export const checkRoutes:FastifyPluginAsync<{service:CheckService}>=async(app,{service})=>{
 app.addHook('onRequest',async(_req,reply)=>{reply.header('Cache-Control','private, no-store');});
 app.addHook('preValidation',async req=>{validateAllowedQueryParams(req.query,[]);});
 const base='/spaces/:space_id/check-runs',run=base+'/:run_id';
 app.post<{Body:CreateCheckRun}>(base,{schema:{params:CheckSpaceParamsSchema,body:CreateCheckRunSchema}},async(req,reply)=>{const {space_id}=params(req);const data=publicRun(service.createRun(auth(req),space_id,req.body,key(req)),space_id);reply.code(201);return checked(req,data,isCheckRunView(data,space_id,data.id));});
 app.get(run,{schema:{params:CheckRunParamsSchema}},async req=>{const {space_id,run_id}=params(req),data=publicRun(service.getRun(auth(req),space_id,run_id),space_id);return checked(req,data,isCheckRunView(data,space_id,run_id));});
 app.get(run+'/snapshot',{schema:{params:CheckRunParamsSchema}},async req=>{const {space_id,run_id}=params(req),{record,manifest}=service.getSnapshot(auth(req),space_id,run_id);const data={snapshot_id:record.id,space_id,check_run_id:run_id,manifest_sha256:record.manifest_sha256,manifest,created_by:record.created_by,created_at:record.created_at};return checked(req,data,isCheckSnapshotView(data,space_id,run_id));});
 app.get(run+'/posts/:post_id/revisions/:revision',{schema:{params:CheckPostParamsSchema}},async req=>{const {space_id,run_id,post_id,revision}=params(req);const rev=Number(revision);if(!Number.isSafeInteger(rev)||rev<1)throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid fixed revision.',400);const data={...service.getPostRevision(auth(req),space_id,run_id,post_id,rev),space_id,check_run_id:run_id};return checked(req,data,isCheckPostRevisionView(data,space_id,run_id,post_id,rev));});
 app.post<{Body:IssueCheckRunCredentialRequest}>(run+'/credentials',{schema:{params:CheckRunParamsSchema,body:IssueCheckRunCredentialRequestSchema}},async(req,reply)=>{if(req.raw.rawHeaders.some((v,i)=>i%2===0&&v.toLowerCase()==='idempotency-key'))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Credential issuance does not accept Idempotency-Key.',400);const {space_id,run_id}=params(req),data=service.issueCredential(auth(req),space_id,run_id,req.body.ttl_seconds);reply.code(201);return checked(req,data,isIssueCheckRunCredentialData(data,space_id,run_id));});
 app.post<{Body:SubmitCheckReceipt}>(run+'/receipt',{schema:{params:CheckRunParamsSchema,body:SubmitCheckReceiptSchema}},async(req,reply)=>{const {space_id,run_id}=params(req),data={...service.submitReceipt(auth(req),space_id,run_id,req.body,key(req)),space_id};reply.code(201);return checked(req,data,isCheckReceiptView(data,space_id,run_id));});
 app.get(run+'/receipt',{schema:{params:CheckRunParamsSchema}},async req=>{const {space_id,run_id}=params(req),data={...service.getReceipt(auth(req),space_id,run_id),space_id};return checked(req,data,isCheckReceiptView(data,space_id,run_id));});
 app.post<{Body:InvalidateCheckRun}>(run+'/invalidate',{schema:{params:CheckRunParamsSchema,body:InvalidateCheckRunSchema}},async req=>{const {space_id,run_id}=params(req),data=publicRun(service.invalidateRun(auth(req),space_id,run_id,req.body,key(req)),space_id);return checked(req,data,isCheckRunView(data,space_id,run_id));});
 app.get('/spaces/:space_id/review-requests/:request_id/check-runs',{schema:{params:CheckRequestParamsSchema}},async req=>{const {space_id,request_id}=params(req),data=service.getRequiredChecks(auth(req),space_id,request_id);return checked(req,data,isRequiredChecksView(data,space_id,request_id));});
};
