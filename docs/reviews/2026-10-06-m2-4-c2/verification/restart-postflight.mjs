import {fork} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const livePath='/private/tmp/detuned-c2-load-full-private-v3-a1/live.json';
const live=JSON.parse(await readFile(livePath,'utf8'));
const child=fork('scripts/scale/run-server.mjs',[live.db_path,'spc_c2_main'],{stdio:['ignore','ignore','ignore','ipc']});
child.on('message',async m=>{if(m.type==='ready'){live.base_url=m.url;live.server_pid=m.pid;await writeFile('/private/tmp/detuned-c2-load-full-private-v3-a1/restarted-live.json',JSON.stringify(live),{mode:0o600});console.log(JSON.stringify({ready:true,pid:m.pid,environment:m.environment}));}});
process.on('SIGTERM',()=>child.send({type:'close'}));
