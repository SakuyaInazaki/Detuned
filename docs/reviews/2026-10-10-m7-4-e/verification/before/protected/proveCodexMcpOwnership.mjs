export async function proveCodexMcpOwnership({candidatePID,nativePID,workerPGID},phase=()=>{}) {
 phase('query-pid');for(const value of [candidatePID,nativePID,workerPGID])assert.ok(Number.isSafeInteger(value)&&value>1);
 phase('query-exec');const text=await new Promise((resolve,reject)=>execFile('/bin/ps',['-p',String(candidatePID),'-o','uid=,ppid=,pgid='],{timeout:1000,maxBuffer:128},(error,stdout)=>error?reject(error):resolve(stdout)));
 phase('query-format');const match=/^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(text);assert.ok(match);
 const uid=Number(match[1]),ppid=Number(match[2]),pgid=Number(match[3]);phase('query-uid');assert.equal(uid,process.getuid());
 phase('query-parent');assert.ok(Number.isSafeInteger(ppid)&&ppid>1);assert.equal(ppid,nativePID);
 phase('query-pgid');assert.ok(Number.isSafeInteger(pgid)&&pgid>1);phase('group-match');assert.ok(pgid===workerPGID||pgid===candidatePID);
 return Object.freeze({pid:candidatePID,uid,ppid,pgid,placement:pgid===workerPGID?'worker':'independent'});
}
