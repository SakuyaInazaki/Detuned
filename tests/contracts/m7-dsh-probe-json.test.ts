import {expect,it} from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

it('dsh JSON handshake exposes only absent or previous complete JSON until atomic commit',async()=>{
 const {publishProbeJson}=await import(pathToFileURL(path.join(process.cwd(),'scripts/integrations/dsh-runtime/probe-json.mjs')).href);
 const root=await fs.mkdtemp(path.join(tmpdir(),'detuned-dsh-json-'));
 await fs.chmod(root,0o700);
 try{
  for(const existing of [false,true]){
   const file=path.join(root,existing?'receipt':'invalid');
   const previous={failed:true},next={code:'VALIDATION_ERROR',shape:{is_error:true}};
   if(existing)await fs.writeFile(file,JSON.stringify(previous),{mode:0o600});
   let release!:()=>void,arrived!:()=>void;
   const gate=new Promise<void>(resolve=>{release=resolve;});
   const staged=new Promise<void>(resolve=>{arrived=resolve;});
   const publication=publishProbeJson(file,next,{
    writeFile:fs.writeFile,rm:fs.rm,
    async rename(source:string,target:string){
     arrived();await gate;await fs.rename(source,target);
    },
   });
   try{
    await staged;
    const names=await fs.readdir(root);
    const staging=names.find(name=>name.startsWith(path.basename(file)+'.tmp-'))!;
    expect(JSON.parse(await fs.readFile(path.join(root,staging),'utf8'))).toEqual(next);
    expect((await fs.stat(path.join(root,staging))).mode&0o777).toBe(0o600);
    if(existing)expect(JSON.parse(await fs.readFile(file,'utf8'))).toEqual(previous);
    else await expect(fs.readFile(file,'utf8')).rejects.toMatchObject({code:'ENOENT'});
   }finally{release();await publication;}
   expect(JSON.parse(await fs.readFile(file,'utf8'))).toEqual(next);
   expect((await fs.readdir(root)).some(name=>name.includes('.tmp-'))).toBe(false);
  }
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
