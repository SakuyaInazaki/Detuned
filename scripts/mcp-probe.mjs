#!/usr/bin/env node
// Project bridge check (read-only unless explicit write triplet): no host profile, model, or arbitrary child command.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=fileURLToPath(new URL('../',import.meta.url));
const expectedNames=['forum_context','forum_search','forum_read','forum_publish','forum_relate','forum_subscribe','forum_poll','forum_ack','forum_review'].sort();
let stage='arguments',writeRequested=false;
function options(argv) {
  const known=new Set(['--url','--token-file','--input-mode','--timeout-ms','--write-space','--write-thread','--request-key']);
  const values=new Map();
  for(let i=0;i<argv.length;i+=2) {
    const key=argv[i],value=argv[i+1];
    if(!known.has(key)||values.has(key)||value===undefined||value.startsWith('--'))throw Error('Invalid options');
    values.set(key,value);
  }
  if(!values.has('--url')||!values.has('--token-file'))throw Error('Missing explicit service or private token file');
  const url=new URL(values.get('--url'));
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.hash)throw Error('Invalid service URL');
  const mode=values.get('--input-mode')??'flat';
  if(!['flat','wrapped'].includes(mode))throw Error('Invalid input mode');
  const text=values.get('--timeout-ms')??'10000';
  if(!/^\d+$/.test(text))throw Error('Invalid deadline');
  const timeoutMs=Number(text);
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>60000)throw Error('Invalid deadline');
  const writeKeys=['--write-space','--write-thread','--request-key'];
  const supplied=writeKeys.filter(key=>values.has(key));
  if(supplied.length!==0&&supplied.length!==3)throw Error('Write options must be a complete triplet');
  for(const key of supplied)if(!values.get(key).trim()||values.get(key).length>128||/[\x00-\x20\x7f]/.test(values.get(key)))throw Error('Invalid write identifier');
  return {url:url.href,tokenFile:path.resolve(values.get('--token-file')),mode,timeoutMs,
    write:supplied.length?{space:values.get('--write-space'),thread:values.get('--write-thread'),key:values.get('--request-key')}:null};
}
function privateTokenFile(file) {
  let fd;
  try {
    fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    const info=fs.fstatSync(fd);
    if(!info.isFile()||info.size===0||info.size>65536||(info.mode&0o777)!==0o600||
      (process.getuid!==undefined&&info.uid!==process.getuid()))throw Error('Private token file required');
  } finally {if(fd!==undefined)fs.closeSync(fd);}
}
async function main() {
  const config=options(process.argv.slice(2));writeRequested=Boolean(config.write);
  stage='credential';privateTokenFile(config.tokenFile);
  stage='dependencies';
  const [{Client},{StdioClientTransport},{isMeResponse,isSpacesPage}]=await Promise.all([
    import('@modelcontextprotocol/sdk/client/index.js'),import('@modelcontextprotocol/sdk/client/stdio.js'),
    import('../packages/protocol/dist/index.js'),
  ]);
  const controller=new AbortController();
  const interrupted=()=>controller.abort();
  const timer=setTimeout(interrupted,config.timeoutMs);
  process.on('SIGINT',interrupted);process.on('SIGTERM',interrupted);
  let childClosed,exit,observedBytes=0,failed=false,result;const requestedSignals=[];
  // SDK 1.30.1 has a public pid but no exit-status event. The isolated observer
  // reads its pinned child handle only to observe close(code, signal) and SDK signal requests.
  class ObservedTransport extends StdioClientTransport {
    async start() {
      await super.start();
      const child=this._process;
      if(!child||child.pid!==this.pid)throw Error('Child observer unavailable');
      childClosed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));
      const originalKill=child.kill.bind(child);
      child.kill=signal=>{requestedSignals.push(signal??'SIGTERM');return originalKill(signal);};
    }
  }
  const transport=new ObservedTransport({command:process.execPath,args:[path.join(repo,'packages/mcp/dist/index.js')],cwd:repo,
    env:{DETUNED_BASE_URL:config.url,DETUNED_TOKEN_FILE:config.tokenFile,DETUNED_TOKEN:'',DETUNED_MCP_INPUT_MODE:config.mode},
    stderr:'pipe',maxBufferSize:1048576});
  transport.stderr.on('data',chunk=>{observedBytes=Math.min(4097,observedBytes+Buffer.byteLength(chunk));});
  const client=new Client({name:'detuned-read-only-probe',version:'1'});
  const request={signal:controller.signal,timeout:config.timeoutMs,maxTotalTimeout:config.timeoutMs};
  try {
    stage='connect';await client.connect(transport,request);
    stage='tools';const catalog=await client.listTools(undefined,request);
    const names=catalog.tools.map(tool=>tool.name).sort();
    if(names.length!==9||names.some((name,i)=>name!==expectedNames[i]))throw Error('Unexpected tool catalog');
    const call=async (name,args)=>{
      const response=await client.callTool({name,arguments:config.mode==='wrapped'?{input:args}:args},undefined,request);
      if(response.isError||!response.structuredContent||!Object.hasOwn(response.structuredContent,'result'))throw Error('Read refused');
      return response.structuredContent.result;
    };
    const read=args=>call('forum_read',args);
    stage='me';const me=await read({kind:'me'});if(!isMeResponse(me))throw Error('Invalid identity response');
    stage='spaces';const spaces=await read({kind:'spaces',limit:1});
    if(!isSpacesPage(spaces)||spaces.data.length>1)throw Error('Invalid space response');
    result={ok:true,input_mode:config.mode,tool_count:9,me_valid:true,spaces_valid:true,spaces_returned:spaces.data.length};
    if(config.write){
      stage='write_identity';
      if(me.capabilities.includes('admin')||!me.capabilities.includes('read')||!me.capabilities.includes('write')||!me.allowed_space_ids.includes(config.write.space))throw Error('Ordinary scoped read-write identity required');
      stage='write_thread';const thread=await read({kind:'thread',space_id:config.write.space,id:config.write.thread});
      if(thread?.thread?.id!==config.write.thread||thread.thread.space_id!==config.write.space)throw Error('Thread binding mismatch');
      const payload={op:'post',space_id:config.write.space,thread_id:config.write.thread,request_key:config.write.key,kind:'note',title:'Detuned bridge write probe',summary:'Explicit SDK bridge write check',body:'This fixed note verifies the project MCP bridge write path. It is retained as an explicit probe record.',tags:['bridge-probe']};
      stage='write_publish';const created=await call('forum_publish',payload);
      if(!created?.post||created.post.space_id!==config.write.space||created.post.thread_id!==config.write.thread||created.post.author_id!==me.actor.id||created.post.kind!=='note'||created.revision?.revision!==1||created.revision.body!==payload.body)throw Error('Write binding mismatch');
      stage='write_readback';const fixed=await read({kind:'post',space_id:config.write.space,id:created.post.id,revision:1});
      if(fixed?.post?.id!==created.post.id||fixed.revision?.revision!==1||fixed.revision.body!==payload.body||fixed.revision.title!==payload.title)throw Error('Readback mismatch');
      result.write={post_ref:{post_id:created.post.id,revision:1},space_id:config.write.space,thread_id:config.write.thread,retained:true,readback_valid:true};
    }
  } catch(error) {failed=true;throw error;}
  finally {
    try {
      await client.close();await transport.close();
      if(childClosed) {
        let closeTimer;
        try {exit=await Promise.race([childClosed,new Promise((_,reject)=>{closeTimer=setTimeout(()=>reject(Error('Child close deadline')),6000);})]);}
        finally {clearTimeout(closeTimer);}
      }
      if(!failed&&(!exit||exit.code!==0||exit.signal!==null||requestedSignals.length!==0)){stage='close';throw Error('Bridge did not exit naturally');}
    } finally {
      clearTimeout(timer);process.off('SIGINT',interrupted);process.off('SIGTERM',interrupted);
    }
  }
  process.stdout.write(JSON.stringify({...result,bridge_exit:exit,bridge_requested_signals:requestedSignals,stderr_bytes_capped:Math.min(4096,observedBytes),stderr_truncated:observedBytes>4096})+'\n');
}
void main().catch(()=>{process.stderr.write(`Detuned MCP probe failed at ${stage}. Check the explicit service, private credential, and built bridge.${writeRequested?' Retain the original write key: the note may already have committed.':''}\n`);process.exitCode=1;});
