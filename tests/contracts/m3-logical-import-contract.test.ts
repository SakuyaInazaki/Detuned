import { describe, it, expect, vi } from 'vitest';
import { decodeSpaceExport, ExportDecodeError, SPACE_EXPORT_HASH_VECTOR } from '@detuned/protocol';
import { DetunedClient, ClientProtocolError, TimeoutError } from '@detuned/client';
import { mkdtemp, writeFile, readFile, rm, realpath, symlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
const encoder = new TextEncoder();
const vector = () => [...SPACE_EXPORT_HASH_VECTOR.lines, JSON.stringify({ type:'end',complete:true,record_count:1,bytes_before_end:SPACE_EXPORT_HASH_VECTOR.bytes_before_end,chain_sha256:SPACE_EXPORT_HASH_VECTOR.chain_sha256 })+'\n'].join('');
async function* chunks(bytes:Uint8Array, size=bytes.length) { for(let i=0;i<bytes.length;i+=size) yield bytes.subarray(i,i+size); }
describe('M3.3-B.2 shared decoder and local import contract', () => {
  it('IMP B01: one-byte UTF8 input preserves typed exact lines and terminal proof', async () => {
    const lines: Uint8Array[] = [];
    const complete=await decodeSpaceExport(chunks(encoder.encode(vector()),1),{expectedSpaceId:'space-vector',onLine:(line,raw)=>{expect(['header','record','end']).toContain(line.type);lines.push(raw);}});
    expect(Buffer.concat(lines).toString()).toBe(vector());expect(complete.end.chain_sha256).toBe(SPACE_EXPORT_HASH_VECTOR.chain_sha256);expect(complete.bytes).toBe(Buffer.byteLength(vector()));
  });
  it('IMP B02: malformed boundaries, proof and requested-space binding reject', async () => {
    for(const text of [vector().slice(0,-1),vector()+' ',vector().replace(/\n/g,'\r\n'), '\n'+vector(),vector().replace('"seq":1','"seq":2'),vector().replace(SPACE_EXPORT_HASH_VECTOR.chain_sha256,'0'.repeat(64)),vector().replace('"record_count":1','"record_count":2')]) await expect(decodeSpaceExport(chunks(encoder.encode(text),7))).rejects.toBeInstanceOf(ExportDecodeError);
    const invalid=encoder.encode(vector());invalid[10]=255;await expect(decodeSpaceExport(chunks(invalid))).rejects.toBeInstanceOf(ExportDecodeError);
    await expect(decodeSpaceExport(chunks(encoder.encode(vector())),{expectedSpaceId:'other-space'})).rejects.toBeInstanceOf(ExportDecodeError);
  });
  it('IMP B03: reduced limits enforce bytes/line/count without enlarging defaults', async () => {
    for(const limits of [{max_line_bytes:10},{max_total_bytes:20},{max_records:0},{max_line_bytes:1048577}]) await expect(decodeSpaceExport(chunks(encoder.encode(vector())),{limits})).rejects.toBeInstanceOf(ExportDecodeError);
  });
  it('IMP B04: callback backpressure and cancel promptly settle hung sinks/iterators, observing late rejection', async () => {
    for(const hung of ['sink','iterator']) {
      const abort=new AbortController();let rejectLate:(e:Error)=>void=()=>{};let started:()=>void=()=>{};
      const ready=new Promise<void>(resolve=>{started=resolve;});const pending=new Promise<never>((_r,reject)=>{rejectLate=reject;});
      const source=hung==='iterator'?{[Symbol.asyncIterator](){return {next:()=>{started();return pending;},return:()=>new Promise<IteratorResult<Uint8Array>>(()=>{})};}}:chunks(encoder.encode(vector()));
      let calls=0;const result=decodeSpaceExport(source,{signal:abort.signal,onLine:()=>{calls++;started();return pending;}});const assertion=expect(result).rejects.toMatchObject({name:'AbortError'});
      await ready;abort.abort();await assertion;expect(calls).toBe(hung==='sink'?1:0);rejectLate(new Error('late fixture rejection'));await new Promise(resolve=>setImmediate(resolve));
    }
  },10000);
  it('IMP B05: HTTP adapter retains space binding, protocol errors, pending sink timeout and no retry', async () => {
    const fetch=vi.fn(async()=>new Response(vector(),{headers:{'content-type':'application/x-ndjson; charset=utf-8'}}));vi.stubGlobal('fetch',fetch);
    try {
      const client=new DetunedClient({baseUrl:'http://fixture.invalid',token:'fixture-not-a-credential'});
      await expect(client.exportSpace('other-space',{sink:()=>{throw new Error('must not deliver wrong space');}})).rejects.toBeInstanceOf(ClientProtocolError);
      await expect(client.exportSpace('space-vector',{timeoutMs:20,sink:()=>new Promise(()=>{})})).rejects.toBeInstanceOf(TimeoutError);
      const complete=await client.exportSpace('space-vector',{sink:()=>{}});expect(complete.end.record_count).toBe(1);expect(fetch).toHaveBeenCalledTimes(3);
    } finally {vi.unstubAllGlobals();}
  },10000);
  it('IMP B06: built local CLI imports complete source without tokenfile/network, preserves input and rejects invalid/existing/symlink', async () => {
    const root=await mkdtemp(path.join(tmpdir(),'detuned-import-cli-'));const db=new Database(path.join(root,'source.sqlite'));const token=bootstrapDatabase(db).adminToken!;const app=buildApp({storage:new SqliteStorage(db)});
    const run=(args:string[])=>new Promise<{code:number|null,out:string,err:string}>((resolve,reject)=>{
      const child=spawn(process.execPath,['packages/cli/dist/index.js','--json','import',...args],{env:{...process.env,DETUNED_TOKEN_FILE:path.join(root,'deliberately-nonexistent-token'),DETUNED_BASE_URL:'http://127.0.0.1:1'}});let out='',err='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
      const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Local CLI fixture deadline exceeded'));},15000);
      child.stdout.on('data',x=>{out+=x;});child.stderr.on('data',x=>{err+=x;});child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);resolve({code,out,err});});
    });
    try {
      const headers={authorization:`Bearer ${token}`,'idempotency-key':'space-import-contract'};
      const space=await app.inject({method:'POST',url:'/api/v1/spaces',headers,payload:{slug:'import-contract',objective:'中文🙂',rules:[]}});expect(space.statusCode).toBe(201);const sid=space.json().data.space.id;
      const exported=await app.inject({method:'GET',url:`/api/v1/spaces/${sid}/export`,headers:{authorization:`Bearer ${token}`}});expect(exported.statusCode).toBe(200);
      const input=path.join(root,'source.ndjson'),target=path.join(root,'new-instance');await writeFile(input,exported.rawPayload,{mode:0o600});
      const args=['--input',input,'--data-dir',target,'--admin-name','  本地管理员🙂  '];const first=await run(args);expect(first.code,first.err+first.out).toBe(0);const summary=JSON.parse(first.out);expect(Object.keys(summary).sort()).toEqual(['data_dir','space_id','admin_actor_id','admin_token','import_id','record_count'].sort());expect(summary.space_id).toBe(sid);expect(summary.data_dir).toBe(path.join(await realpath(root),'new-instance'));expect(summary.admin_token).toBeTruthy();expect(first.err).not.toContain(summary.admin_token);expect(await readFile(input)).toEqual(exported.rawPayload);expect((await stat(target)).mode&0o777).toBe(0o700);
      const retained=await readFile(path.join(target,'detuned.sqlite'));expect((await run(args)).code).toBe(1);expect(await readFile(path.join(target,'detuned.sqlite'))).toEqual(retained);
      expect((await run([...args,'--timeout-ms','0'])).code).toBe(2);expect((await run(['--input',input,'--data-dir',path.join(root,'bad-name'),'--admin-name','   '])).code).toBe(2);
      const alias=path.join(root,'alias.ndjson');await symlink(input,alias);expect((await run(['--input',alias,'--data-dir',path.join(root,'symlink-target'),'--admin-name','Admin'])).code).toBe(1);
    } finally {await app.close();db.close();await rm(root,{recursive:true,force:true});}
  },60000);
});
