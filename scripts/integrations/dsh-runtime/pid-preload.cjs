const fs=require('node:fs');
const file=process.env.DETUNED_EXPERIMENT_PID_LOG;
if(file){fs.appendFileSync(file,JSON.stringify({event:'start',pid:process.pid})+'\n',{mode:0o600});process.on('exit',code=>fs.appendFileSync(file,JSON.stringify({event:'exit',pid:process.pid,code})+'\n'));}
