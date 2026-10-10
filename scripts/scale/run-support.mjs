import { createHash } from 'node:crypto';
import { open, stat, statfs } from 'node:fs/promises';
export const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const decode = token => JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
export const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
export const percentile = (values, p) => values.length ? [...values].sort((a,b)=>a-b)[Math.max(0, Math.ceil(values.length*p)-1)] : null;
export function rng(seed) {
  let state = Number.parseInt(sha(seed).slice(0,8),16) || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0)/4294967296; };
}
export function block(random) {
  const a = ['context','read','search','poll'].flatMap(x=>Array(20).fill(x)).concat(Array(10).fill('create'),Array(10).fill('revision'));
  for(let i=a.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
export async function journal(path) {
  const file = await open(path,'wx',0o600); let chain=Promise.resolve();
  return {write(value){ const line=JSON.stringify(value)+'\n'; chain=chain.then(()=>file.write(line)); return chain; },async close(){await chain;await file.close();}};
}
export async function size(path) { try{return (await stat(path)).size;}catch(e){if(e.code==='ENOENT')return 0;throw e;} }
export async function disk(path) { const s=await statfs(path);return Number(s.bavail)*Number(s.bsize); }
export function postBody(id, bytes, failure) {
  const body={kind:failure?'failure':'note',title:`C2 ${id}`,summary:'隔离负载：中文测试、双重转义与幂等',body:'',tags:['c2-load']};
  if(failure) body.structured={attempt:'隔离确定性测试',category:'test_failure',assumptions:['仅适用固定输入'],tested_scope:'本机负载fixture',expected:'预定条件',observed:'预定反例',evidence_refs:[],evidence_state:'unverified',evidence_missing_reason:'负载fixture不伪造真实证据',ruled_out:'本固定变体',not_ruled_out:['其它输入'],retry_when:['适用条件改变']};
  const piece='中🙂\\"\n';
  while(Buffer.byteLength(JSON.stringify(body))<bytes)body.body+=piece;
  return body;
}

export async function within(promise, ms) { let timer;try{return await Promise.race([promise,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),ms);})]);}finally{clearTimeout(timer);} }
