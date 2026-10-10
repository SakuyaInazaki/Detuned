import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:https';
import { connect } from 'node:net';
import Database from 'better-sqlite3';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp, loadServerTlsOptions, type ServerApp } from '@detuned/server';

let dir: string, cert: Buffer, key: Buffer, ca: Buffer;
const apps: ServerApp[] = [], databases: Database.Database[] = [];
const openssl = (args: string[]) => execFileSync('openssl', args, { cwd: dir, stdio: 'ignore' });
function app(tls = true, extra: { webOrigin?: string; allowInsecureLoopback?: boolean } = {}) {
  const db = new Database(':memory:'); databases.push(db); const token = bootstrapDatabase(db).adminToken!;
  const value = buildApp({ storage: new SqliteStorage(db), ...(tls ? { tls: { cert, key } } : {}), ...extra }); apps.push(value); return { value, token };
}
function get(port: number, options: { servername?: string; ca?: Buffer; headers?: Record<string,string>; maxVersion?: 'TLSv1.1' } = {}) {
  return new Promise<{ status: number; body: string }>((resolve,reject) => {
    const req = request({ hostname:'127.0.0.1',port,path:'/api/v1/health/live',ca:options.ca ?? ca,servername:options.servername ?? 'localhost',headers:options.headers,minVersion:options.maxVersion,maxVersion:options.maxVersion }, res => {
      let body='';res.on('data',v=>{body+=v;});res.on('end',()=>resolve({status:res.statusCode!,body}));
    }); req.on('error',reject);req.end();
  });
}
beforeAll(() => {
  dir=mkdtempSync(join(tmpdir(),'detuned-tls-author-'));
  openssl(['req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.pem','-days','1','-subj','/CN=Detuned private author CA']);
  openssl(['req','-new','-newkey','rsa:2048','-nodes','-keyout','leaf.key','-out','leaf.csr','-subj','/CN=localhost']);
  writeFileSync(join(dir,'leaf.ext'),'subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=CA:FALSE\n');
  openssl(['x509','-req','-in','leaf.csr','-CA','ca.pem','-CAkey','ca.key','-CAcreateserial','-out','leaf.pem','-days','1','-extfile','leaf.ext']);
  cert=readFileSync(join(dir,'leaf.pem'));key=readFileSync(join(dir,'leaf.key'));ca=readFileSync(join(dir,'ca.pem'));
});
afterEach(async()=>{ for(const value of apps.splice(0))await value.close();for(const db of databases.splice(0))if(db.open)db.close(); });
afterAll(()=>rmSync(dir,{recursive:true,force:true}));

describe('server native TLS',()=>{
  it('TLS01 same-FD PEM loader accepts pair and safely rejects special/oversize/invalid/mismatch files',async()=>{
    expect(await loadServerTlsOptions(join(dir,'leaf.pem'),join(dir,'leaf.key'))).toEqual({cert,key});
    symlinkSync(join(dir,'leaf.pem'),join(dir,'cert-link'));writeFileSync(join(dir,'big.pem'),Buffer.alloc(1048577));writeFileSync(join(dir,'invalid.pem'),'PRIVATE INVALID PEM');
    execFileSync('mkfifo',[join(dir,'cert.fifo')]);
    for(const path of [join(dir,'cert-link'),dir,join(dir,'big.pem'),join(dir,'invalid.pem'),join(dir,'absent'),join(dir,'cert.fifo')]) {
      await expect(loadServerTlsOptions(path,join(dir,'leaf.key'))).rejects.toMatchObject({code:'VALIDATION_ERROR',statusCode:400,message:'TLS certificate and key must be a valid, bounded unencrypted PEM pair.'});
    }
    await expect(loadServerTlsOptions(join(dir,'leaf.pem'),join(dir,'ca.key'))).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
  it('TLS02 real HTTPS trusts only private CA/hostname, limits TLS and headers, snapshots caller bytes',async()=>{
    const certificate=Buffer.from(cert), privateKey=Buffer.from(key);const db=new Database(':memory:');databases.push(db);bootstrapDatabase(db);
    const value=buildApp({storage:new SqliteStorage(db),tls:{cert:certificate,key:privateKey}});apps.push(value);certificate.fill(0);privateKey.fill(0);
    await value.listen({host:'127.0.0.1',port:0});const address=value.server.address();if(!address||typeof address==='string')throw new Error('No private listener');
    expect((await get(address.port)).status).toBe(200);
    await expect(get(address.port,{servername:'wrong.invalid'})).rejects.toBeDefined();
    await expect(get(address.port,{ca:cert})).rejects.toBeDefined();
    await expect(get(address.port,{maxVersion:'TLSv1.1'})).rejects.toBeDefined();
    expect((await get(address.port,{headers:{'x-bounded':'x'.repeat(20000)}})).status).toBe(200);
    expect((await get(address.port,{headers:{'x-too-big':'x'.repeat(66000)}})).status).toBe(431);
  });
  it('TLS03 unhandshaken raw TCP drains naturally after business finalization on app.close',async()=>{
    const {value}=app();await value.listen({host:'127.0.0.1',port:0});const address=value.server.address();if(!address||typeof address==='string')throw new Error('No listener');
    const socket=connect(address.port,'127.0.0.1');await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});
    const closed=new Promise<void>(resolve=>socket.once('close',()=>resolve()));let timer:ReturnType<typeof setTimeout>|undefined;
    let cancelled!: () => void; const cancelBarrier = new Promise<void>(resolve => { cancelled = resolve; });
    const finish = value.runtimeResources.acquire(() => cancelled());
    const closing = value.close(); await cancelBarrier; expect(socket.destroyed).toBe(false); finish();
    try {await Promise.race([Promise.all([closing,closed]),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('TLS drain did not finish')),1500);})]);expect(socket.destroyed).toBe(true);}
    finally {if(timer)clearTimeout(timer);socket.destroy();}
  });
  it('TLS04 TLS+Web requires https, redundant loopback flag preserves Secure and HTTP compatibility',async()=>{
    expect(()=>app(true,{webOrigin:'http://127.0.0.1:12345',allowInsecureLoopback:true})).toThrow('TLS Web requires an HTTPS origin');
    const {value,token}=app(true,{webOrigin:'https://localhost:12345',allowInsecureLoopback:true});
    const login=await value.inject({method:'POST',url:'/auth/session',headers:{host:'localhost:12345',origin:'https://localhost:12345',authorization:`Bearer ${token}`}});
    expect(login.statusCode).toBe(201);expect(login.headers['set-cookie']).toContain('; Secure');
    const plain=app(false,{webOrigin:'https://localhost:12345'});expect((await plain.value.inject({url:'/api/v1/health/live',headers:{host:'localhost:12345'}})).statusCode).toBe(200);
    const loopback=app(false,{webOrigin:'http://127.0.0.1:12345',allowInsecureLoopback:true});expect((await loopback.value.inject({url:'/api/v1/health/live',headers:{host:'127.0.0.1:12345'}})).statusCode).toBe(200);
  });
});
