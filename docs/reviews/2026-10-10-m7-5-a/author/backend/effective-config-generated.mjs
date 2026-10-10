const {spawnSync}=require('node:child_process');
const [entry,optionsJSON,keysJSON]=process.argv.slice(1);const options=JSON.parse(optionsJSON),keys=JSON.parse(keysJSON);
const end=Date.now()+9000,rows=[];
for(const key of keys){const remaining=end-Date.now();if(remaining<=0)throw Error('CONFIG_PROBE_DEADLINE');
const r=spawnSync(process.execPath,[entry,...options,'config','--location=project','get','--json',key],{env:process.env,cwd:process.cwd(),encoding:'utf8',timeout:remaining,maxBuffer:65536,detached:false});
if(r.error||r.status!==0||r.signal!==null)throw Error('CONFIG_PROBE_CHILD_FAILURE');
let value,type;if((key==='pnpmfile'||key==='global-pnpmfile')&&r.stdout.trim()===''){value=null;type='undefined'}
else{try{value=JSON.parse(r.stdout)}catch{throw Error('CONFIG_PROBE_JSON_FAILURE')}type=typeof value}
rows.push({key,type,value,pid:r.pid,closeCode:r.status,closeSignal:r.signal,actualClose:true});}
process.stdout.write(JSON.stringify({rows})+'\n');