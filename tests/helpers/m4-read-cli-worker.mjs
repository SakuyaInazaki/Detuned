// Fixed private HTTP fixture. No arbitrary command, SQL or function IPC.
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {rename,access} from 'node:fs/promises';
import {buildApp} from '../../packages/server/dist/index.js';
import {DetunedClient} from '../../packages/client/dist/index.js';
import {SqliteStorage,bootstrapDatabase,DirectoryLock} from '../../packages/storage-sqlite/dist/index.js';
const require=createRequire(new URL('../../packages/storage-sqlite/package.json',import.meta.url));
const Database=require('better-sqlite3');
const [directory]=process.argv.slice(2);
if(!process.send||!directory)throw Error('Private read CLI worker requires IPC/directory');
let db,app,lock,url,count=0;const healthAuth=[];
const close=async()=>{
 if(!app)return;
 try{await access(directory);}catch{await rename(directory+'.unavailable',directory);}
 await app.close();db.close();lock.releaseStrict();app=undefined;
};
process.on('message',m=>{if(m.type==='close'){void close().then(()=>process.exit(0));return;}if(m.type!=='run')return;void(async()=>{try{
 if(m.operation==='initialize'){
  lock=new DirectoryLock(directory);lock.acquire();db=new Database(join(directory,'detuned.sqlite'));const boot=bootstrapDatabase(db);
  app=buildApp({storage:new SqliteStorage(db,{dataDir:directory}),writeRateLimits:{per_minute:60000,burst:10000}});
  app.addHook('onRequest',async request=>{count++;if(request.routeOptions.url?.startsWith('/api/v1/health/'))healthAuth.push(Boolean(request.headers.authorization));});
  url=await app.listen({host:'127.0.0.1',port:0});process.send({type:'result',id:m.id,url,result:{adminToken:boot.adminToken}});return;
 }
 if(m.operation==='stats'){process.send({type:'result',id:m.id,result:{count,healthAuth}});return;}
 if(m.operation==='directory-hide'){await rename(directory,directory+'.unavailable');process.send({type:'result',id:m.id,result:{changed:true}});return;}
 if(m.operation==='directory-restore'){await rename(directory+'.unavailable',directory);process.send({type:'result',id:m.id,result:{changed:true}});return;}
 if(m.operation==='schema-bad'){db.prepare('UPDATE schema_migrations SET version=999 WHERE version=2').run();process.send({type:'result',id:m.id,result:{changed:true}});return;}
 if(m.operation==='schema-restore'){db.prepare('UPDATE schema_migrations SET version=2 WHERE version=999').run();process.send({type:'result',id:m.id,result:{changed:true}});return;}
 if(m.operation==='abort-health'){
  const signal=AbortSignal.abort();const client=new DetunedClient({baseUrl:url});const results=[];
  for(const method of ['getLiveness','getReadiness']){try{await client[method]({signal});results.push({resolved:true});}catch(e){results.push({resolved:false,name:e.name});}}
  process.send({type:'result',id:m.id,result:results});return;
 }
 if(m.operation==='shutdown-http'){await close();process.send({type:'result',id:m.id,result:{closed:true}});return;}
 throw Error('Unknown fixed read CLI operation');
 }catch(e){process.send({type:'result',id:m.id,error:e.name,code:e.code});}})();});
process.send({type:'ready'});
