import {expect,it} from 'vitest';
import {connect,type Socket} from 'node:net';
import Database from 'better-sqlite3';
import {bootstrapDatabase,SqliteStorage} from '@detuned/storage-sqlite';
import {buildApp,type ServerApp} from '@detuned/server';
const peers=new WeakMap<Socket,Socket>();

function deferred() {
 let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};
}
async function bounded<T>(promise:Promise<T>):Promise<T> {
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned HTTP drain did not settle')),1500);})]);}
 finally{clearTimeout(timer);}
}
async function accepted(app:ServerApp):Promise<Socket> {
 const address=app.server.address();if(!address||typeof address==='string')throw Error('Owned loopback listener required');
 const serverAccepted=new Promise<Socket>(resolve=>app.server.once('connection',resolve));
 const socket=connect(address.port,'127.0.0.1');socket.on('error',()=>{});
 const [peer]=await Promise.all([serverAccepted,new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);})]);
 peers.set(socket,peer);
 return socket;
}
function fixture() {
 const db=new Database(':memory:');const token=bootstrapDatabase(db).adminToken!;const app=buildApp({storage:new SqliteStorage(db)});return {db,app,token};
}
async function cleanup(app:ServerApp,db:Database.Database,sockets:Array<Socket|undefined>,primary:unknown) {
 for(const socket of sockets)socket?.destroy();
 try{await bounded(app.close());}
 catch(error){
  // This test owns the whole listener; never leave it referenced after a failed drain.
  try{app.server.closeAllConnections();app.server.close();}catch{}
  if(primary===undefined)throw error;
 }finally{if(db.open)db.close();}
}

it.each(['empty','headers','body'])('plain HTTP drains an accepted %s parser-only connection with no resource lease',async kind=>{
 const {db,app,token}=fixture();let socket:Socket|undefined,primary:unknown;
 try{
  await app.listen({host:'127.0.0.1',port:0});socket=await accepted(app);
  if(kind!=='empty'){
   const parsed=new Promise<void>(resolve=>peers.get(socket!)!.once('data',()=>resolve()));
   socket.write(kind==='headers'?'GET /api/v1/health/live HTTP/1.1\r\nHost: localhost':`POST /api/v1/spaces HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${token}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{`);
   await bounded(parsed);
  }
  const closed=new Promise<void>(resolve=>socket!.once('close',()=>resolve()));
  expect(app.runtimeResources.activeCount).toBe(0);
  await bounded(Promise.all([app.close(),closed]));expect(socket.destroyed).toBe(true);expect(app.runtimeResources.activeCount).toBe(0);
  expect(db.prepare('SELECT count(*) n FROM spaces').get()).toEqual({n:0});
 }catch(error){primary=error;throw error;}
 finally{await cleanup(app,db,[socket],primary);}
});

it('flushes a complete delayed large response before closing its incomplete pipeline and another empty TCP connection',async()=>{
 const {db,app,token}=fixture(),entered=deferred(),release=deferred();const body=Buffer.alloc(2*1024*1024,120);
 let responseSocket:Socket|undefined,empty:Socket|undefined,late:Socket|undefined,primary:unknown,complete=false,settled=false,lateEntered=false;
 app.get('/owned-delayed',async request=>{complete=request.raw.complete;entered.resolve();await release.promise;return body;});
 app.get('/owned-late',async()=>{lateEntered=true;return 'new business must not start';});
 try{
  await app.listen({host:'127.0.0.1',port:0});responseSocket=await accepted(app);const chunks:Buffer[]=[];
  responseSocket.on('data',chunk=>chunks.push(Buffer.from(chunk)));
  const responseClosed=new Promise<void>(resolve=>responseSocket!.once('close',()=>resolve()));
  responseSocket.write(`GET /owned-delayed HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${token}\r\n\r\nGET /api/v1/health/live HTTP/1.1\r\nHost:`);
  await bounded(entered.promise);expect(complete).toBe(true);empty=await accepted(app);
  const emptyClosed=new Promise<void>(resolve=>empty!.once('close',()=>resolve()));
  const closing=app.close().then(()=>{settled=true;});await bounded(emptyClosed);
  expect(settled).toBe(false);expect(responseSocket.destroyed).toBe(false);expect(app.runtimeResources.activeCount).toBe(0);
  const address=app.server.address();if(!address||typeof address==='string')throw Error('Delayed response keeps owned listener open');
  late=connect(address.port,'127.0.0.1');const errors:string[]=[];late.on('error',(error:NodeJS.ErrnoException)=>{errors.push(error.code??'UNKNOWN');});
  late.once('connect',()=>late!.write(`GET /owned-late HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${token}\r\n\r\n`));
  await bounded(new Promise<void>(resolve=>late!.once('close',()=>resolve())));
  expect(errors.every(code=>['ECONNREFUSED','ECONNRESET','EPIPE'].includes(code))).toBe(true);expect(lateEntered).toBe(false);
  expect(settled).toBe(false);expect(responseSocket.destroyed).toBe(false);
  release.resolve();await bounded(Promise.all([closing,responseClosed]));
  const raw=Buffer.concat(chunks),separator=raw.indexOf('\r\n\r\n');expect(separator).toBeGreaterThan(0);
  const headers=raw.subarray(0,separator).toString();expect(headers).toContain('200 OK');expect(headers.toLowerCase()).toContain('content-length: '+body.length);
  expect(raw.subarray(separator+4).length).toBe(body.length);expect(raw.subarray(separator+4).equals(body)).toBe(true);expect(app.runtimeResources.activeCount).toBe(0);
 }catch(error){primary=error;throw error;}
 finally{release.resolve();await cleanup(app,db,[responseSocket,empty,late],primary);}
});
