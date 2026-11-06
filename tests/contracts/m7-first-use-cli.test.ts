import {afterEach,expect,it} from 'vitest';
import {spawn} from 'node:child_process';
import {createServer,type Server} from 'node:http';
import {once} from 'node:events';

let server:Server|undefined;
afterEach(async()=>{if(server){await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));server=undefined;}});
function cli(args:string[]){return new Promise<{code:number|null,out:string,err:string}>((resolve,reject)=>{
 const env={...process.env};delete env.DETUNED_TOKEN;delete env.DETUNED_TOKEN_FILE;
 const child=spawn(process.execPath,['packages/cli/dist/index.js','--json',...args],{env,stdio:['ignore','pipe','pipe']});let out='',err='';
 const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('CLI timeout'));},15000);
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('close',code=>{clearTimeout(timer);resolve({code,out,err});});
});}
const invalid=['2abc','1.5','1e2',' 2','2 ','','0','-1','9007199254740992'];
it('M7.9-A legacy read rejects malformed revisions before HTTP',async()=>{
 let requests=0;server=createServer((_req,res)=>{requests++;res.setHeader('content-type','application/json');res.end(JSON.stringify({api_version:'1',request_id:'read',data:{post:{id:'post'},revision:{revision:2}}}));});server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address() as {port:number};
 for(const revision of invalid){const result=await cli(['--url',`http://127.0.0.1:${address.port}`,'read','--space','space','--kind','post','--id','post','--revision',revision]);expect(result.code,JSON.stringify(revision)).toBe(2);expect(JSON.parse(result.out).error).toMatchObject({code:'VALIDATION_ERROR'});}
 expect(requests).toBe(0);
});
it('M7.9-A legacy read retains explicit valid revision and omitted current read',async()=>{
 const urls:string[]=[];server=createServer((req,res)=>{urls.push(req.url!);res.setHeader('content-type','application/json');res.end(JSON.stringify({api_version:'1',request_id:'read',data:{post:{id:'post'},revision:{revision:2}}}));});server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address() as {port:number};
 for(const suffix of [[],['--revision','2']]){expect((await cli(['--url',`http://127.0.0.1:${address.port}`,'read','--space','space','--kind','post','--id','post',...suffix])).code).toBe(0);}
 expect(urls).toEqual(['/api/v1/spaces/space/posts/post','/api/v1/spaces/space/posts/post?revision=2']);
});
it('M7.9-A serve rejects malformed ports before data access',async()=>{
 for(const port of ['3000abc','1.5','1e2',' 2','2 ','','-1','65536','9007199254740992']){const result=await cli(['serve','--data-dir','/absent/private-M79-marker','--port',port]);expect(result.code,JSON.stringify(port)).toBe(2);expect(JSON.parse(result.out).error).toMatchObject({code:'VALIDATION_ERROR'});expect(result.out+result.err).not.toContain('private-M79-marker');}
});
it('M7.9-A known missing inputs name only registered safe syntax',async()=>{
 for(const [args,expected] of [
  [['space','read','SPACE'],'--revision'],[['post','read','SPACE','POST'],'--revision'],
  [['post','revisions'],'space-id'],[['health'],'live'],
 ] as [string[],string][]){const result=await cli(args);expect(result.code).toBe(2);expect(JSON.parse(result.out).error.message).toContain(expected);}
});
it('M7.9-A parser diagnostics never reflect untrusted values or unknown syntax',async()=>{
 const secret='M79_PRIVATE_ARG_TOKEN_PATH';
 for(const args of [['--token',secret,'space','read','SPACE'],['--unknown-'+secret,secret],['read','--space',secret,'--kind','post','--id','POST','--unknown-'+secret]]){const result=await cli(args);expect(result.code).toBe(2);expect(result.out+result.err).not.toContain(secret);expect(JSON.parse(result.out).error.code).toBe('VALIDATION_ERROR');}
});
it('M7.9-A offline schema discovers actual CLI bodies without credentials or HTTP',async()=>{
 for(const [target,op,required] of [
  ['publish','thread','title'],['publish','post','thread_id'],['publish','revision','post_id'],['publish','withdraw','post_id'],
  ['relate','create','source_ref'],['relate','resolve','relation_id'],['relate','reopen','relation_id'],
 ]){const result=await cli(['--token-file','/absent/M79_PRIVATE_ARG_TOKEN_PATH','--url','http://127.0.0.1:1','schema',target!,'--op',op!]);expect(result.code,op).toBe(0);const schema=JSON.parse(result.out);expect(schema.type).toBe('object');expect(schema.required).toContain(required);expect(schema.properties).not.toHaveProperty('space_id');expect(schema.properties).not.toHaveProperty('op');expect(result.out+result.err).not.toContain('M79_PRIVATE_ARG_TOKEN_PATH');}
 const typed=await cli(['schema','publish','--op','post','--kind','failure']);expect(typed.code).toBe(0);const schema=JSON.parse(typed.out);expect(schema.properties.kind.const).toBe('failure');expect(schema.required).toContain('structured');expect(schema.properties.structured.anyOf).toBeDefined();
});
it('M7.9-A offline schema rejects unknown selectors without exposing their values',async()=>{
 for(const args of [['schema','M79_PRIVATE_ARG_TOKEN_PATH','--op','post'],['schema','publish','--op','M79_PRIVATE_ARG_TOKEN_PATH'],['schema','publish','--op','post','--kind','M79_PRIVATE_ARG_TOKEN_PATH']]){const result=await cli(args);expect(result.code).toBe(2);expect(result.out+result.err).not.toContain('M79_PRIVATE_ARG_TOKEN_PATH');}
});
it('M7.9-A missing known option value names static flag without reflecting earlier values',async()=>{
 const result=await cli(['--token','M79_PRIVATE_ARG_TOKEN_PATH','read','--space','SPACE','--kind','post','--id']);
 expect(result.code).toBe(2);expect(JSON.parse(result.out).error.message).toContain('--id');expect(result.out+result.err).not.toContain('M79_PRIVATE_ARG_TOKEN_PATH');
});
