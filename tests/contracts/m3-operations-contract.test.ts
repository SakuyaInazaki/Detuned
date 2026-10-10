import {it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {Writable} from 'node:stream';
import {Value} from '@sinclair/typebox/value';
import {OperationsDiagnosticsSchema,generateOpenApiSpec} from '@detuned/protocol';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp} from '@detuned/server';
import {DetunedClient} from '@detuned/client';
import {createRequestLogWriter} from '../../packages/cli/src/request-log-writer.js';
it('OP B01: anonymous strict health and authenticated administrator diagnostics have single source shapes',async()=>{
 const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken;const entries:any[]=[];const app=buildApp({storage:new SqliteStorage(db),requestLogSink:e=>entries.push(e)});
 try{const live=await app.inject({method:'GET',url:'/api/v1/health/live',headers:{'request-id':'PRIVATE HEADER'}});expect(live.statusCode).toBe(200);expect(live.json().data).toEqual({status:'alive'});expect(live.json().request_id).not.toBe('PRIVATE HEADER');expect((await app.inject({method:'GET',url:'/api/v1/health/ready'})).statusCode).toBe(200);expect((await app.inject({method:'GET',url:'/api/v1/health/live?secret=PRIVATE QUERY'})).statusCode).toBe(400);expect((await app.inject({method:'GET',url:'/api/v1/admin/diagnostics'})).statusCode).toBe(401);
 const diag=await app.inject({method:'GET',url:'/api/v1/admin/diagnostics',headers:{authorization:`Bearer ${token}`}});expect(diag.statusCode).toBe(200);expect(Value.Check(OperationsDiagnosticsSchema,diag.json().data)).toBe(true);expect(diag.json().data.data_directory).toEqual({configured:false,available:null});
 (app as any).operationsService.beginDraining();const notready=await app.inject({method:'GET',url:'/api/v1/health/ready'});expect(notready.statusCode).toBe(503);expect(notready.json().error).toMatchObject({code:'SERVICE_NOT_READY',retryable:true,details:{ready:false}});expect((await app.inject({method:'GET',url:'/api/v1/health/live'})).statusCode).toBe(200);
 const text=JSON.stringify(entries);expect(text).not.toContain('PRIVATE');expect(text).not.toContain(token);expect(entries).toHaveLength(7);for(const e of entries){expect(e.event).toBe('request_completed');expect(e.duration_ms).toBeGreaterThanOrEqual(0);expect(e).not.toHaveProperty('space_id');}
 const spec=generateOpenApiSpec() as any;expect(spec.paths['/health/live'].get.security).toEqual([]);expect(spec.paths['/health/ready'].get.security).toEqual([]);expect(spec.paths['/admin/diagnostics'].get.responses['200'].content['application/json'].schema).toBeDefined();
 }finally{await app.close();db.close();}
});
it('OP B02: throwing sink and legacy actor identity do not change response or copy untrusted inputs',async()=>{const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken;const app=buildApp({storage:new SqliteStorage(db),requestLogSink:()=>{throw new Error('private sink failure');}});try{const r=await app.inject({method:'GET',url:'/api/v1/me',headers:{authorization:`Bearer ${token}`}});expect(r.statusCode).toBe(200);const unknown=await app.inject({method:'GET',url:'/private-query?secret=PRIVATE',headers:{authorization:`Bearer ${token}`}});expect(unknown.statusCode).toBe(404);}finally{await app.close();db.close();}});
it('OP B03: real slow writable is bounded, drops summarize after drain and listeners clean without destruction',async()=>{
 const lines:string[]=[];let release:(()=>void)|undefined;const stream=new Writable({highWaterMark:1,write(chunk,_encoding,cb){lines.push(chunk.toString());release=cb;}});const baseline=stream.listenerCount('drain');const writer=createRequestLogWriter(stream);writer.write({event:'first'});for(let i=0;i<1000;i++)writer.write({event:'sample',text:'x'.repeat(500)});expect(writer.pendingBytes).toBeLessThanOrEqual(65536);expect(writer.pendingEntries).toBeLessThanOrEqual(256);
 for(let i=0;i<300&&(release||writer.pendingEntries);i++){const cb=release;release=undefined;cb?.();await new Promise<void>(resolve=>setImmediate(resolve));}
 expect(lines.some(line=>JSON.parse(line).event==='request_log_dropped')).toBe(true);writer.close();expect(writer.pendingBytes).toBe(0);expect(stream.listenerCount('drain')).toBe(baseline);expect(stream.destroyed).toBe(false);stream.destroy();
 const thrown=new Writable({write(){throw new Error('sink failed');}});const safe=createRequestLogWriter(thrown);expect(()=>safe.write({event:'request_completed'})).not.toThrow();safe.close();thrown.destroy();
});
it('OP B04: real HTTP shared client gets administrator diagnostics without adding write admission',async()=>{const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken;const app=buildApp({storage:new SqliteStorage(db)});try{await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();if(!address||typeof address==='string')throw new Error('missing bound address');const client=new DetunedClient({baseUrl:`http://127.0.0.1:${address.port}`,token});const result=await client.getDiagnostics();expect(Value.Check(OperationsDiagnosticsSchema,result.data)).toBe(true);expect(result.data.lifecycle).toBe('running');}finally{await app.close();db.close();}},15000);
