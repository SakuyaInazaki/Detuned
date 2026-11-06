import {parseIntegerQuery,parseStringQuery,validateAllowedQueryParams} from '../utils/query.js';
import {type DiscoveryReadService, type EventService} from '@detuned/core';
import {type PostRelationsQuery} from '@detuned/protocol';
import { FastifyPluginAsync } from 'fastify';
import {
  CreateRelationRequest,
  CreateRelationRequestSchema,
  ResolveRelationRequest,
  ResolveRelationRequestSchema,
  ReopenRelationRequest,
  ReopenRelationRequestSchema,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { RelationService, AuthenticatedContext } from '@detuned/core';

export const relationRoutes: FastifyPluginAsync = async (app) => {
  const relationService = (app as any).relationService as RelationService;
  const reads=(app as any).discoveryReadService as DiscoveryReadService;
  app.get('/spaces/:space_id/relations/:id/history',async(req)=>{
    const p=req.params as {space_id:string;id:string},q=req.query as Record<string,unknown>;validateAllowedQueryParams(q,['limit','max_bytes','cursor']);
    const query={limit:parseIntegerQuery(q.limit,'limit',{min:1,max:100}),max_bytes:parseIntegerQuery(q.max_bytes,'max_bytes',{min:4096,max:65536}),cursor:parseStringQuery(q.cursor,'cursor')};
    return {api_version:'1',request_id:req.id,...reads.getRelationHistory((req as any).auth,p.space_id,p.id,query,{request_id:req.id})};
  });
  app.get('/spaces/:space_id/relations/:id',async(req)=>{validateAllowedQueryParams(req.query as Record<string,unknown>,[]);const p=req.params as {space_id:string;id:string};return {api_version:'1',request_id:req.id,data:reads.getRelation((req as any).auth,p.space_id,p.id)};});
  app.get('/spaces/:space_id/posts/:id/revisions/:revision/relations',async(req)=>{
    const p=req.params as {space_id:string;id:string;revision:string},q=req.query as Record<string,unknown>;validateAllowedQueryParams(q,['direction','limit','max_bytes','cursor']);
    if(!/^[1-9][0-9]*$/.test(p.revision)||!Number.isSafeInteger(Number(p.revision)))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid fixed revision.',400);
    const query:PostRelationsQuery={direction:parseStringQuery(q.direction,'direction',{allowedValues:new Set(['in','out','both'])}) as PostRelationsQuery['direction'],limit:parseIntegerQuery(q.limit,'limit',{min:1,max:100}),max_bytes:parseIntegerQuery(q.max_bytes,'max_bytes',{min:4096,max:65536}),cursor:parseStringQuery(q.cursor,'cursor')};
    return {api_version:'1',request_id:req.id,...reads.getPostRelations((req as any).auth,p.space_id,p.id,Number(p.revision),query,{request_id:req.id})};
  });
  app.get('/spaces/:space_id/consumers/lookup',async(req)=>{
    const p=req.params as {space_id:string},q=req.query as Record<string,unknown>;validateAllowedQueryParams(q,['consumer_key','thread_ids_json','event_types_json']);
    const array=(value:unknown):unknown=>{if(value===undefined)return undefined;if(typeof value!=='string')throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid consumer filters.',400);try{return JSON.parse(value);}catch{throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid consumer filters.',400);}};
    const query={consumer_key:parseStringQuery(q.consumer_key,'consumer_key'),thread_ids:array(q.thread_ids_json),event_types:array(q.event_types_json)};
    const service=(app as any).eventService as EventService;
    return {api_version:'1',request_id:req.id,data:service.lookupConsumer((req as any).auth,p.space_id,query as Parameters<EventService['lookupConsumer']>[2])};
  });


  app.post(
    '/spaces/:space_id/relations',
    { schema: { body: CreateRelationRequestSchema } },
    async (req, reply) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id } = req.params as { space_id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.headers['Idempotency-Key'] as string);
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as CreateRelationRequest;

      const relation = relationService.createRelation(auth, space_id, body, key);
      reply.status(201);
      return {
        api_version: '1',
        request_id: req.id,
        data: relation,
      };
    }
  );

  app.post(
    '/spaces/:space_id/relations/:id/resolve',
    { schema: { body: ResolveRelationRequestSchema } },
    async (req) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.headers['Idempotency-Key'] as string);
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as ResolveRelationRequest;

      const result = relationService.resolveChallenge(auth, space_id, id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );

  app.post(
    '/spaces/:space_id/relations/:id/reopen',
    { schema: { body: ReopenRelationRequestSchema } },
    async (req) => {
      const auth = (req as any).auth as AuthenticatedContext;
      const { space_id, id } = req.params as { space_id: string; id: string };
      const key = (req.headers['idempotency-key'] as string) ?? (req.headers['Idempotency-Key'] as string);
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          '缺少必需的 Idempotency-Key 请求头。',
          400
        );
      }
      const body = req.body as ReopenRelationRequest;

      const result = relationService.reopenChallenge(auth, space_id, id, body, key);
      return {
        api_version: '1',
        request_id: req.id,
        data: result,
      };
    }
  );
};
