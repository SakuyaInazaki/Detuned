import { performance } from 'node:perf_hooks';
import type { FastifyInstance } from 'fastify';
import { ErrorCode } from '@detuned/protocol';
export interface RequestLogEntry {event:'request_completed';timestamp:string;method:string;route:string;request_id:string;status_code:number|null;outcome:'completed'|'aborted';duration_ms:number;error_code?:string;actor_id?:string}
export type RequestLogSink = (entry:RequestLogEntry)=>void;
const methods = new Set(['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS','CONNECT','TRACE']);
const codes = new Set<string>(Object.values(ErrorCode));
export function installRequestLogging(app:FastifyInstance,sink?:RequestLogSink):void {
 if(!sink)return;
 const states=new WeakMap<object,{start:number;done:boolean;errorCode?:string;id:string}>();
 app.addHook('onRequest',(req,reply,done)=>{
  const state:{start:number;done:boolean;id:string;errorCode?:string}={start:performance.now(),done:false,id:typeof req.id==='string'&&req.id.length<=64?req.id:'unknown'};states.set(req,state);
  const finish=(outcome:'completed'|'aborted')=>{
   if(state.done)return;state.done=true;
   reply.raw.removeListener('close',closed);req.raw.removeListener('aborted',aborted);
   const duration=performance.now()-state.start;const template=req.routeOptions.url;
   const status=reply.raw.headersSent&&Number.isInteger(reply.statusCode)&&reply.statusCode>=100&&reply.statusCode<=599?reply.statusCode:null;
   const actor=(req as any).auth?.actor?.id;
   const entry:RequestLogEntry={event:'request_completed',timestamp:new Date().toISOString(),method:methods.has(req.method)?req.method:'OTHER',route:!req.is404&&typeof template==='string'&&template.length<=256?template:'unknown',request_id:state.id,status_code:status,outcome,duration_ms:Number.isFinite(duration)?Math.max(0,duration):0};
   if(state.errorCode)entry.error_code=state.errorCode;
   if(typeof actor==='string'&&/^act_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(actor))entry.actor_id=actor;
   try{sink(entry);}catch{/* Observability cannot change business results. */}
  };
  const closed=()=>finish(reply.raw.writableFinished?'completed':'aborted');const aborted=()=>finish('aborted');
  reply.raw.once('close',closed);req.raw.once('aborted',aborted);(req as any).finishRequestLog=finish;done();
 });
 app.addHook('onError',(req,_reply,error,done)=>{const state=states.get(req);const code=(error as any).code;if(state&&codes.has(code))state.errorCode=code;done();});
 app.addHook('onResponse',(req,_reply,done)=>{(req as any).finishRequestLog?.('completed');done();});
}
