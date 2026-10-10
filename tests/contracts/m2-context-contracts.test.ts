import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { FormatRegistry } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { ContextPage, ContextEnvelopeSchema, ContextPageSchema, ContextQuerySchema, ToolContextParamsSchema, buildContextEnvelope, serializeContextEnvelope, contextEnvelopeBytes, generateOpenApiSpec } from '@detuned/protocol';
const req = createRequire(new URL('../../packages/server/package.json', import.meta.url));
const compilerReq = createRequire(createRequire(req.resolve('fastify')).resolve('@fastify/ajv-compiler'));
const Ajv = compilerReq('ajv');
const ajv = new Ajv({ strict:false, formats:{'date-time':true} });
const trickyId = '真实ID"\\\n\t😀';

import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';

describe('M2.4-A actual context body and tool contracts', () => {
  let db: Database.Database; let app: ReturnType<typeof buildApp>; let client: DetunedClient;
  let token: string; let baseUrl: string;
  beforeEach(async () => {
    db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!;
    app = buildApp({ storage: new SqliteStorage(db) });
    app.addHook('onRequest', async request => { request.id = trickyId; });
    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
    client = new DetunedClient({ baseUrl, token, maxRetries: 0 });
  });
  afterEach(async () => { await app?.close(); db?.close(); });

  it('C01: oversized UTF8 rules downgrade to a fixed revision reference with real reconstruction', async () => {
    const sid = (await client.createSpace({ slug: 'large-context', objective: '图'.repeat(1500), rules: [] }, 'large-space')).data.space.id;
    const response = await fetch(`${baseUrl}/api/v1/spaces/${sid}/context?max_bytes=4096`, { headers: { authorization: `Bearer ${token}` } });
    const raw = await response.text();
    expect(response.status).toBe(200); expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(4096);
    const omitted=JSON.parse(raw);expect(omitted.data).toMatchObject({space_revision_ref:{space_id:sid,revision:1},space_content_status:'omitted_for_budget',objective:null,rules:null});expect(omitted.meta.truncated).toBe(true);
    const fixed=await fetch(`${baseUrl}/api/v1/spaces/${sid}/revisions/1?max_bytes=65536`,{headers:{authorization:`Bearer ${token}`}});
    expect(fixed.status).toBe(200);expect(JSON.parse((await fixed.json() as any).data.chunk)).toEqual({objective:'图'.repeat(1500),rules:[]});
    const larger = await fetch(`${baseUrl}/api/v1/spaces/${sid}/context?max_bytes=65536`, { headers: { authorization: `Bearer ${token}` } });
    const largeRaw = await larger.text(); expect(larger.status).toBe(200); expect(Buffer.byteLength(largeRaw)).toBeLessThanOrEqual(65536);
    expect(JSON.parse(largeRaw).data.objective).toBe('图'.repeat(1500));
  });

  it('C02: shared forum_context retains real truncation meta after optional source material exceeds budget', async () => {
    const sid = (await client.createSpace({ slug: 'tool-context', objective: 'o', rules: [] }, 'tool-space')).data.space.id;
    const tid = (await client.createThread(sid, { title: 't' }, 'thread')).data.thread.id;
    const note = (await client.createPost(sid, tid, { kind: 'note', title: 'evidence', summary: 's', body: 'b' }, 'note')).data.post;
    const refs = Array.from({ length: 40 }, () => ({ post_id: note.id, revision: 1 }));
    const summary = (await client.createPost(sid, tid, { kind: 'summary', title: 'summary', summary: 's', body: 'b', structured: { source_refs: refs } }, 'summary')).data.post;
    await client.patchSpace(sid, { expected_revision: 1, pinned_refs: [{ post_id: summary.id, revision: 1 }] }, 'pin');
    const page = await client.callTool('forum_context', { space_id: sid, max_bytes: 4096 });
    expect(page).toHaveProperty('meta.truncated', true);
    expect(page.meta.next_cursor).toBeNull(); expect(page.data.space_id).toBe(sid);
    const truncatedHttp = await fetch(`${baseUrl}/api/v1/spaces/${sid}/context?max_bytes=4096`, {headers:{authorization:`Bearer ${token}`}});
    const truncatedRaw=await truncatedHttp.text();expect(truncatedHttp.status).toBe(200);expect(Buffer.byteLength(truncatedRaw)).toBeLessThanOrEqual(4096);
    expect(JSON.parse(truncatedRaw).meta).toEqual({truncated:true,next_cursor:null});
    const full = await client.callTool('forum_context', { space_id: sid, max_bytes: 65536 });
    expect(full.meta.truncated).toBe(false); expect(full.data.pinned_summaries[0].source_refs).toHaveLength(40);
  });

  it('C03: actual compact success body covers true req.id, escaping, and all approved byte budgets', async () => {
    const sid=(await client.createSpace({slug:'escaped-context',objective:'目标"\\\n\t😀',rules:['rule"\\\n']},'escaped')).data.space.id;
    for(const budget of [4096,65536,undefined]) {
      const response=await fetch(`${baseUrl}/api/v1/spaces/${sid}/context${budget===undefined?'':`?max_bytes=${budget}`}`,{headers:{authorization:`Bearer ${token}`}});
      const raw=await response.text(); const envelope=JSON.parse(raw);
      expect(response.status).toBe(200); expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(budget??12288);
      expect(envelope.request_id).toBe(trickyId); expect(envelope.meta).toEqual({truncated:false,next_cursor:null});
      const page={data:envelope.data,meta:envelope.meta};
      expect(raw).toBe(serializeContextEnvelope(trickyId,page)); expect(contextEnvelopeBytes(trickyId,page)).toBe(Buffer.byteLength(raw));
      const previous=FormatRegistry.Get('date-time');FormatRegistry.Set('date-time',()=>true);
      try { expect(Value.Check(ContextEnvelopeSchema,envelope)).toBe(true); expect(ajv.compile(ContextEnvelopeSchema)(envelope)).toBe(true); }
      finally {if(previous)FormatRegistry.Set('date-time',previous);else FormatRegistry.Delete('date-time');}
    }
    for(const query of ['max_bytes=4095','max_bytes=65537','max_bytes=1.5','max_bytes=','max_bytes=4096&max_bytes=4096','focus_thread_id=','unknown=x']) {
      const r=await fetch(`${baseUrl}/api/v1/spaces/${sid}/context?${query}`,{headers:{authorization:`Bearer ${token}`}});
      expect(r.status,query).toBe(400);expect(((await r.json()) as {error:unknown}).error).toMatchObject({code:'VALIDATION_ERROR',retryable:false});
    }
    const missing = await fetch(`${baseUrl}/api/v1/spaces/${sid}/context?focus_thread_id=thread`,{headers:{authorization:`Bearer ${token}`}});
    expect(missing.status).toBe(404);
    await expect(client.callTool('forum_context',{space_id:sid,focus_thread_id:'thread'})).rejects.toMatchObject({statusCode:404,code:'NOT_FOUND'});
    const own = (await client.createThread(sid,{title:'own focus'},'own-focus')).data.thread.id;
    const focused = await client.callTool('forum_context',{space_id:sid,focus_thread_id:own});
    expect(focused.data.focus_thread.id).toBe(own);
    expect((await fetch(`${baseUrl}/api/v1/spaces/${sid}/context?focus_thread_id=${own}`,{headers:{authorization:`Bearer ${token}`}})).status).toBe(200);
  });

  it('C04: shared envelope schema requires truthful meta and exactly measures true/false encoding', async () => {
    const sid=(await client.createSpace({slug:'schema-context',objective:'o',rules:[]},'schema')).data.space.id;
    const page=await client.getContext(sid); expectTypeOf(page).toEqualTypeOf<ContextPage>();
    if(page.data.space_content_status!=='included') throw new Error('small fixture must be included');
    const omitted={...page,data:{...page.data,space_content_status:'omitted_for_budget',objective:null,rules:null},meta:{truncated:true,next_cursor:null}};
    expect(ajv.compile(ContextPageSchema)(omitted)).toBe(true);
    expect(ajv.compile(ContextPageSchema)({...omitted,meta:{truncated:false,next_cursor:null}})).toBe(false);
    expect(ajv.compile(ContextPageSchema)({...omitted,data:{...omitted.data,rules:[]}})).toBe(false);
    expect(Value.Check(ContextPageSchema,{data:page.data})).toBe(false);
    expect(Value.Check(ContextPageSchema,{...page,meta:{truncated:false,next_cursor:'invented'}})).toBe(false);
    expect(Value.Check(ContextQuerySchema,{max_bytes:4096})).toBe(true);expect(Value.Check(ContextQuerySchema,{max_bytes:4095})).toBe(false);
    expect(ToolContextParamsSchema.properties.max_bytes).toEqual(ContextQuerySchema.properties.max_bytes);
    const falsePage={data:page.data,meta:{truncated:false,next_cursor:null}};
    const truePage={data:page.data,meta:{truncated:true,next_cursor:null}};
    expect(contextEnvelopeBytes(trickyId,falsePage)-contextEnvelopeBytes(trickyId,truePage)).toBe(1);
    expect(buildContextEnvelope(trickyId,page)).toEqual({api_version:'1',request_id:trickyId,data:page.data,meta:page.meta});
    const spec=generateOpenApiSpec() as any;expect(spec.paths['/spaces/{space_id}/context'].get.responses['200'].content['application/json'].schema).toEqual(ContextEnvelopeSchema);
  });

});
