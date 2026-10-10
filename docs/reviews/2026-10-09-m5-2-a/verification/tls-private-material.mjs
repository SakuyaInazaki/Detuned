import {mkdtemp,readFile,writeFile,chmod,rm,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const run=promisify(execFile),openssl='/opt/homebrew/bin/openssl';
export async function privateTlsMaterial(){
 const owned=await mkdtemp('/private/tmp/detuned-tls-independent-');
 try {
  const ca=path.join(owned,'ca.crt'),caKey=path.join(owned,'ca.key'),cert=path.join(owned,'leaf.crt'),key=path.join(owned,'leaf.key'),wrongCa=path.join(owned,'wrong-ca.crt'),wrongKey=path.join(owned,'wrong-ca.key');
  const env={PATH:process.env.PATH??'/usr/bin:/bin'};
  await run(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=Detuned Independent CA','-keyout',caKey,'-out',ca],{env,timeout:15000});
  await run(openssl,['req','-newkey','rsa:2048','-nodes','-sha256','-subj','/CN=localhost','-keyout',key,'-out',path.join(owned,'leaf.csr')],{env,timeout:15000});
  await writeFile(path.join(owned,'extensions.txt'),'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n',{mode:0o600});
  await run(openssl,['x509','-req','-sha256','-days','2','-in',path.join(owned,'leaf.csr'),'-CA',ca,'-CAkey',caKey,'-CAcreateserial','-extfile',path.join(owned,'extensions.txt'),'-out',cert],{env,timeout:15000});
  await run(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-sha256','-days','2','-subj','/CN=Detuned Wrong Private CA','-keyout',wrongKey,'-out',wrongCa],{env,timeout:15000});
  for(const file of [caKey,key,wrongKey])await chmod(file,0o600);
  return {owned,files:{ca,cert,key,wrongCa,wrongKey},ca:await readFile(ca),cert:await readFile(cert),key:await readFile(key),wrongCa:await readFile(wrongCa),async close(){await rm(owned,{recursive:true,force:true});return {temp_absent:await stat(owned).then(()=>false,()=>true)};}};
 }catch{await rm(owned,{recursive:true,force:true});throw new Error('Private independent certificate generation failed.');}
}
