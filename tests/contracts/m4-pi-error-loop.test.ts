import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPiNativeEnvironment} from '../helpers/pi-native-environment.js';
it('fixed Pi agent loop exposes safe business codes in the actual next-step tool-result channel without a provider',async()=>{
 const isolated=await createPiNativeEnvironment();
 try{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../fixtures/pi-runtime/error-loop.mjs',import.meta.url))],{env:isolated.env,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',value=>stdout+=value);child.stderr.on('data',value=>stderr+=value);
  const timer=setTimeout(()=>child.kill('SIGKILL'),10000);
  const exit=await new Promise(resolve=>{child.once('error',()=>{});child.once('close',(code,signal)=>resolve({code,signal}));}).finally(()=>clearTimeout(timer));
  expect({exit,stderr}).toEqual({exit:{code:0,signal:null},stderr:''});
  const result=JSON.parse(stdout);expect(result).toMatchObject({passed:true,sdk_version:'0.87.1',provider_calls:0,synthetic_stream_fixture:true});expect(result.cases).toHaveLength(3);
  expect(result.cases[0].visible_text).toBe('[REVISION_CONFLICT] Public revision changed.');
  expect(result.cases.slice(1).map((item:{visible_text:string})=>item.visible_text)).toEqual(['[VALIDATION_ERROR] HTTP 409 请求失败','[VALIDATION_ERROR] HTTP 409 请求失败']);
 }finally{await isolated.remove();}
},15000);
