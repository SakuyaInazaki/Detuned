import { it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtemp, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { resolveResourceLimits, DEFAULT_RESOURCE_LIMITS, DetunedError } from '@detuned/protocol';
import { bootstrapDatabase, SqliteStorage, classifyDatabase } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';
it('RS B01: strict resource configuration rejects unknown, unsafe and disabled values without echo', () => {
  expect(resolveResourceLimits()).toEqual(DEFAULT_RESOURCE_LIMITS);
  expect(resolveResourceLimits({artifact_max_objects:1}).database_max_bytes).toBe(1073741824);
  for (const value of [null, [], {unknown:'private-fixture-text'}, {database_max_bytes:1048575}, {database_max_bytes:1099511627777}, {artifact_max_total_bytes:0}, {artifact_max_objects:10001}, {artifact_max_objects:1.5}, {artifact_max_objects:undefined}]) {
    let caught; try {resolveResourceLimits(value as any);} catch(e) {caught=e;}
    expect(caught).toBeInstanceOf(DetunedError); expect((caught as Error).message).not.toContain('private-fixture-text');
  }
});
it('RS B02: invalid configuration and unsupported storage reject before business access', () => {
  let touched=false; const storage=new Proxy({}, {get(){touched=true;throw new Error('unexpected storage access');}});
  expect(()=>buildApp({storage:storage as any,resourceLimits:{artifact_max_objects:0}})).toThrow(DetunedError); expect(touched).toBe(false);
  expect(()=>buildApp({storage:{} as any})).toThrow('Storage does not support runtime resource limits.');
});
it('RS B03: real HTTP maps native FULL safely and shared client does not retry complete 507', async () => {
  const db=new Database(':memory:'); const token=bootstrapDatabase(db).adminToken; const app=buildApp({storage:new SqliteStorage(db)});
  let attempts=0; app.get('/api/v1/fixture-full',()=>{attempts++;throw Object.assign(new Error('PRIVATE SQL BODY TOKEN'),{code:'SQLITE_FULL'});});
  try {
    await app.listen({port:0,host:'127.0.0.1'}); const address=app.server.address(); if (!address||typeof address==='string')throw new Error('Missing loopback address');
    const client=new DetunedClient({baseUrl:`http://127.0.0.1:${address.port}`,token});
    await expect(client.request({method:'GET',path:'/fixture-full'})).rejects.toMatchObject({code:'QUOTA_EXCEEDED',statusCode:507,retryable:false,details:{scope:'storage'}});
    expect(attempts).toBe(1); const response=await app.inject({method:'GET',url:'/api/v1/fixture-full',headers:{authorization:`Bearer ${token}`}});
    expect(response.statusCode).toBe(507);expect(response.payload).not.toContain('PRIVATE'); expect(response.headers['retry-after']).toBeUndefined();
  } finally {await app.close();db.close();}
},15000);
it.skipIf(process.env.DETUNED_SOURCE_ONLY==='1')('RS B04: built CLI invalid resource flags precede mkdir and existing overquota rejects before listen', async () => {
  const root=await mkdtemp(path.join(tmpdir(),'detuned-resource-cli-')); const target=path.join(root,'new');
  const run=(args:string[])=>new Promise<{code:number|null,text:string}>((resolve,reject)=>{const child=spawn(process.execPath,['packages/cli/dist/index.js','--json',...args]);let text='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('CLI exceeded bounded deadline'));},10000);child.stdout.on('data',x=>text+=x);child.stderr.on('data',x=>text+=x);child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);resolve({code,text});});});
  try {
    for(const flags of [['--max-database-bytes','0'],['--max-artifact-bytes','private-fixture-text'],['--max-artifact-objects','10001']]){const result=await run(['serve','--data-dir',target,...flags]);expect(result.code).toBe(2);expect(result.text).not.toContain('private-fixture-text');await expect(lstat(target)).rejects.toMatchObject({code:'ENOENT'});}
    const initialized=await run(['init','--data-dir',target]);expect(initialized.code).toBe(0);
    const db=new Database(path.join(target,'detuned.sqlite'));try{// Private SQL fixture: legitimate current database metadata, not a research HTTP request.
      db.prepare('INSERT INTO instance_metadata(key,value) VALUES(?,?)').run('resource_contract.private_fixture', 'x'.repeat(2*1024*1024));
      expect(classifyDatabase(db).kind).toBe('current_initialized');
      expect(Number(db.pragma('page_count',{simple:true}))*Number(db.pragma('page_size',{simple:true}))).toBeGreaterThan(1048576);}finally{db.close();}
    const rejected=await run(['serve','--data-dir',target,'--port','0','--max-database-bytes','1048576']);expect(rejected.code).toBe(1);expect(rejected.text).toContain('QUOTA_EXCEEDED');expect(rejected.text).not.toContain('resource_fixture');
  } finally {await rm(root,{recursive:true,force:true});}
},45000);
