import {CONTEXT_BYTES,POST_ASSEMBLE_LIMITS,isPostContentPage,isAssembledPostDocument,type PostAssembleQuery,type PostRevisionContentPage,type AssembledPostRevisionContent} from '@detuned/protocol';
import {ClientProtocolError,TimeoutError,UserAbortError} from './client.js';
import {waitForArtifact} from './artifact-transfer.js';
const invalid=()=>new ClientProtocolError('Invalid or oversized fixed post content assembly.');
/** Fixed-reference JSON assembly; no scientific or cryptographic certification. */
export async function assembleFixedPostContent(spaceId:string,postId:string,revision:number,query:PostAssembleQuery,timeoutMs:number,external:AbortSignal|undefined,read:(query:{max_bytes?:number;cursor?:string},signal:AbortSignal)=>Promise<unknown>):Promise<AssembledPostRevisionContent> {
 const controller=new AbortController();let timedOut=false;
 const failure=()=>external?.aborted?new UserAbortError():timedOut?new TimeoutError():new UserAbortError();
 const abort=()=>controller.abort();external?.addEventListener('abort',abort,{once:true});if(external?.aborted)abort();
 const timer=timeoutMs>0?setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs):undefined;
 const chunks:string[]=[],seen=new Set<string>();let offset=0,cursor:string|undefined,initial:PostRevisionContentPage['data']|undefined;
 try{
  for(let count=1;count<=POST_ASSEMBLE_LIMITS.pages;count++){
   if(controller.signal.aborted)throw failure();
   const value=await waitForArtifact(read({max_bytes:query.max_bytes,cursor},controller.signal),controller.signal,failure);
   if(!isPostContentPage(value))throw invalid();const {data,meta}=value;
   if(data.ref.space_id!==spaceId||data.ref.post_id!==postId||data.ref.revision!==revision||data.start_byte!==offset||data.end_byte<=offset||data.end_byte>POST_ASSEMBLE_LIMITS.bytes)throw invalid();
   const bytes=new TextEncoder().encode(data.chunk);
   if(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)!==data.chunk||data.end_byte-offset!==bytes.length||new TextEncoder().encode(JSON.stringify(value)).length>(query.max_bytes??CONTEXT_BYTES.default))throw invalid();
   if(initial&&(data.post_kind!==initial.post_kind||data.lifecycle!==initial.lifecycle||data.has_newer_revision!==initial.has_newer_revision))throw invalid();initial??=data;
   chunks.push(data.chunk);offset=data.end_byte;
   if(data.complete){let content:unknown;try{content=JSON.parse(chunks.join(''));}catch{throw invalid();}if(!isAssembledPostDocument(content))throw invalid();if(controller.signal.aborted)throw failure();return {ref:data.ref,post_kind:data.post_kind,lifecycle:data.lifecycle,has_newer_revision:data.has_newer_revision,encoding:'json',content,bytes:offset,pages:count};}
   if(meta.next_cursor===null||meta.next_cursor.length>4096||seen.has(meta.next_cursor))throw invalid();seen.add(meta.next_cursor);cursor=meta.next_cursor;
  }
  throw invalid();
 }catch(error){if(controller.signal.aborted)throw failure();throw error;}
 finally{if(timer!==undefined)clearTimeout(timer);external?.removeEventListener('abort',abort);controller.abort();}
}
