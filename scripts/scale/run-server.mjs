import Database from 'better-sqlite3';
import { SqliteStorage } from '../../packages/storage-sqlite/dist/index.js';
import { buildApp } from '../../packages/server/dist/index.js';
const [dbPath,spaceId]=process.argv.slice(2);
if(!process.send || !dbPath || !spaceId)throw new Error('Only the scale runner may start this child');
const db=new Database(dbPath,{fileMustExist:true});
// Fixed high-load benchmark override; production defaults remain 60/minute with burst 20.
const app=buildApp({storage:new SqliteStorage(db),writeRateLimits:{per_minute:60000,burst:10000}});
const url=await app.listen({host:'127.0.0.1',port:0});
process.send({type:'ready',url,pid:process.pid,environment:{sqlite:db.prepare('SELECT sqlite_version() v').get().v,journal_mode:db.pragma('journal_mode',{simple:true}),synchronous:db.pragma('synchronous',{simple:true}),busy_timeout:db.pragma('busy_timeout',{simple:true})}});
const timer=setInterval(()=>process.send?.({type:'resource',pid:process.pid,rss:process.memoryUsage().rss,cpu:process.cpuUsage()}),1000);
let closing=false;
async function close(){if(closing)return;closing=true;clearInterval(timer);await app.close();db.close();process.exit(0);}
process.on('message',message=>{if(message.type==='highwater')process.send({type:'highwater',seq:db.prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM events WHERE space_id=?').get(spaceId).seq});if(message.type==='close')void close();});
process.on('SIGTERM',()=>void close());
process.on('SIGINT',()=>void close());
