import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { Value } from '@sinclair/typebox/value';
import { SpaceRevisionPage, SpaceRevisionPageSchema, SpaceRevisionEnvelopeSchema, ContextPageSchema, ToolReadParamsSchema, encodeSpaceRulesDocument, spaceRevisionEnvelopeBytes } from '@detuned/protocol';
const req=createRequire(new URL('../../packages/server/package.json',import.meta.url));const compilerReq=createRequire(createRequire(req.resolve('fastify')).resolve('@fastify/ajv-compiler'));const Ajv=compilerReq('ajv');const ajv=new Ajv({strict:false,formats:{'date-time':true}});

import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';

describe('M2.4-B.1 actual fixed space rules transport', () => {
  let db:Database.Database;let app:ReturnType<typeof buildApp>;let token:string;let sid:string;
  beforeEach(async()=>{
    db=new Database(':memory:');token=bootstrapDatabase(db).adminToken!;
    app=buildApp({storage:new SqliteStorage(db)});await app.ready();
    const client=await app.inject({method:'POST',url:'/api/v1/spaces',headers:{authorization:`Bearer ${token}`,'idempotency-key':'space'},payload:{slug:'space-read',objective:'图'.repeat(1500),rules:[]}});
    expect(client.statusCode).toBe(201);sid=client.json().data.space.id;
  });
  afterEach(async()=>{await app?.close();db?.close();});
  it('R01: large context is budget-omitted with a usable fixed space revision reference',async()=>{
    const r=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/context?max_bytes=4096`,headers:{authorization:`Bearer ${token}`}});
    expect(r.statusCode,`actual status=${r.statusCode}; body=${r.payload}`).toBe(200);
    expect(Buffer.byteLength(r.payload)).toBeLessThanOrEqual(4096);
    expect(r.json().data).toMatchObject({space_revision_ref:{space_id:sid,revision:1},space_content_status:'omitted_for_budget',objective:null,rules:null});
    expect(r.json().meta.truncated).toBe(true);
  });
  it('R02: explicit fixed-revision rules route exists and retains the requested revision',async()=>{
    const r=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/revisions/1?max_bytes=65536`,headers:{authorization:`Bearer ${token}`}});
    expect(r.statusCode,`actual status=${r.statusCode}; body=${r.payload}`).toBe(200);
    expect(r.json().data.ref).toEqual({space_id:sid,revision:1});
    expect(r.json().data.complete).toBe(true);
    expect(JSON.parse(r.json().data.chunk)).toEqual({objective:'图'.repeat(1500),rules:[]});
  });
  it('R03: real client/tool pages stay fixed through updates and reassemble exact UTF8 document',async()=>{
    const url=await app.listen({host:'127.0.0.1',port:0});const client=new DetunedClient({baseUrl:url,token,maxRetries:0});
    let cursor:string|undefined;let offset=0;let whole='';let pages=0;
    do {
      const page=await client.callTool('forum_read',{kind:'space',space_id:sid,revision:1,max_bytes:4096,...(cursor?{cursor}:{})});
      expect(page.data.ref).toEqual({space_id:sid,revision:1});expect(page.data.start_byte).toBe(offset);
      expect(page.data.end_byte-page.data.start_byte).toBe(Buffer.byteLength(page.data.chunk));
      expect(page.data.end_byte).toBeGreaterThan(offset);expect(Value.Check(SpaceRevisionPageSchema,page)).toBe(true);expect(ajv.compile(SpaceRevisionPageSchema)(page)).toBe(true);
      whole+=page.data.chunk;offset=page.data.end_byte;cursor=page.meta.next_cursor??undefined;pages++;
      if(pages===1) await client.patchSpace(sid,{expected_revision:1,objective:'new objective',rules:['new rule']},'update');
      expect(pages).toBeLessThan(10);
    } while(cursor);
    expect(pages).toBeGreaterThan(1);expect(whole).toBe(encodeSpaceRulesDocument({objective:'图'.repeat(1500),rules:[]}));
    expect(JSON.parse(whole)).toEqual({objective:'图'.repeat(1500),rules:[]});
    for(const max_bytes of [4096,65536,undefined]) {
      const response=await fetch(`${url}/api/v1/spaces/${sid}/revisions/1${max_bytes===undefined?'':`?max_bytes=${max_bytes}`}`,{headers:{authorization:`Bearer ${token}`}});const raw=await response.text();const envelope=JSON.parse(raw);
      expect(response.status).toBe(200);expect(Buffer.byteLength(raw)).toBeLessThanOrEqual(max_bytes??12288);expect(ajv.compile(SpaceRevisionEnvelopeSchema)(envelope)).toBe(true);
      expect(spaceRevisionEnvelopeBytes(envelope.request_id,{data:envelope.data,meta:envelope.meta})).toBe(Buffer.byteLength(raw));
    }
  });
  it('R04: strict route inputs and direct tool calls reject unapplied legacy parameters',async()=>{
    for(const suffix of ['0','1bad','9007199254740992','1?max_bytes=4095','1?max_bytes=65537','1?max_bytes=1.5','1?cursor=','1?cursor=legacy','1?unknown=x','1?max_bytes=4096&max_bytes=4096']) {
      const r=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/revisions/${suffix}`,headers:{authorization:`Bearer ${token}`}});expect(r.statusCode,suffix).toBe(400);expect(r.json().error).toMatchObject({code:'VALIDATION_ERROR',retryable:false});
    }
    const client=new DetunedClient({baseUrl:'http://127.0.0.1:1',token,maxRetries:0});
    const artifactMetadata={kind:'artifact',space_id:sid,id:'a'};
    expect(Value.Check(ToolReadParamsSchema,artifactMetadata)).toBe(true);expect(ajv.compile(ToolReadParamsSchema)(artifactMetadata)).toBe(true);
    for(const input of [{kind:'space',space_id:sid},{kind:'space',space_id:sid,id:sid,revision:1},{kind:'post',space_id:sid,id:'p',cursor:'ignored'},{kind:'post',space_id:sid,id:'p',max_bytes:4096},{kind:'thread',space_id:sid,id:'t',revision:1},{kind:'artifact',space_id:sid,id:'a',revision:1},{kind:'review',space_id:sid,id:'r'}]) {
      expect(Value.Check(ToolReadParamsSchema,input)).toBe(false);expect(ajv.compile(ToolReadParamsSchema)(input)).toBe(false);
      await expect(client.callTool('forum_read',input)).rejects.toMatchObject({code:'VALIDATION_ERROR',statusCode:400});
    }
    expectTypeOf<ReturnType<DetunedClient['getSpaceRevision']>>().toEqualTypeOf<Promise<SpaceRevisionPage>>();
  });
  it('R05: page/envelope schemas enforce completion/meta correspondence',()=>{
    const data={ref:{space_id:sid,revision:1},encoding:'json',chunk:'x',start_byte:0,end_byte:1,complete:false};
    const page={data,meta:{truncated:true,next_cursor:'signed'}};
    expect(Value.Check(SpaceRevisionPageSchema,page)).toBe(true);
    for(const invalid of [{...page,meta:{truncated:false,next_cursor:'signed'}},{...page,meta:{truncated:true,next_cursor:null}},{...page,data:{...data,complete:true}}]) {
      expect(Value.Check(SpaceRevisionPageSchema,invalid)).toBe(false);expect(ajv.compile(SpaceRevisionPageSchema)(invalid)).toBe(false);
    }
    const r={...data,complete:true};expect(Value.Check(SpaceRevisionPageSchema,{data:r,meta:{truncated:false,next_cursor:null}})).toBe(true);
  });

});
