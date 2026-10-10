import {makeHarness} from './real-harness-factory.mjs';
const cases=[];
for(const bytes of ['complete','']){
 const h=await makeHarness();const trace=[];const started=Date.now();
 try{
  const first=await h.upload(bytes,'close');const response=await fetch(new URL(first.body.data.content_url,h.app.listeningOrigin),{headers:{authorization:`Bearer ${h.token}`}});const content=await response.text();
  trace.push({phase:'client_consumed',status:response.status,expected_bytes:bytes,actual_bytes:content,ms:Date.now()-started,...h.lifecycle});await new Promise(r=>setTimeout(r,50));
  trace.push({phase:'server_settled',ms:Date.now()-started,...h.lifecycle});
  let timer;const closing=h.app.close().then(()=>({closed:true,ms:Date.now()-started}),e=>({error:e.message}));
  const result=await Promise.race([closing,new Promise(r=>{timer=setTimeout(()=>r({closed:false,deadline_ms:3000}),3000);})]);clearTimeout(timer);trace.push({phase:'normal_app_close',...result,...h.lifecycle});
  cases.push({bytes:bytes.length,trace,passes:response.status===200 && content===bytes && result.closed===true});
 }finally{await h.close();}
}
console.log(JSON.stringify({cases,passes:cases.every(c=>c.passes)},null,2));process.exitCode=cases.every(c=>c.passes)?0:1;
