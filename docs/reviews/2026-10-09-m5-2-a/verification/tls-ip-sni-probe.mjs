import {writeFile,rm,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import https from 'node:https';
import Database from 'better-sqlite3';
import {buildApp} from '../../../../packages/server/dist/index.js';
import {bootstrapDatabase,SqliteStorage} from '../../../../packages/storage-sqlite/dist/index.js';
import {privateTlsMaterial} from './tls-private-material.mjs';
const receipt={scope:'One negative for default Node hostname verification with IP URL and explicit empty SNI; DNS-only private leaf, no global trust'};
let material,db,app;
try{
 material=await privateTlsMaterial();await writeFile(path.join(material.owned,'DNS-only.ext'),'subjectAltName=DNS:localhost\nextendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n',{mode:0o600});
 const file=path.join(material.owned,'DNS-only.crt');await promisify(execFile)('/opt/homebrew/bin/openssl',['x509','-req','-sha256','-days','2','-in',path.join(material.owned,'leaf.csr'),'-CA',material.files.ca,'-CAkey',path.join(material.owned,'ca.key'),'-CAcreateserial','-extfile',path.join(material.owned,'DNS-only.ext'),'-out',file],{env:{PATH:process.env.PATH??'/usr/bin:/bin'},timeout:15000});
 const cert=await (await import('node:fs/promises')).readFile(file);db=new Database(path.join(material.owned,'forum.sqlite'));bootstrapDatabase(db);app=buildApp({storage:new SqliteStorage(db),tls:{cert,key:material.key}});await app.listen({host:'127.0.0.1',port:0});
 let code;await new Promise((resolve,reject)=>{const request=https.request(`https://127.0.0.1:${app.server.address().port}/api/v1/health/live`,{ca:material.ca,servername:'',rejectUnauthorized:true},response=>{response.resume();reject(new Error('IP URL unexpectedly accepted DNS-only certificate'));});request.once('error',error=>{code=error.code;resolve();});request.setTimeout(3000,()=>request.destroy());request.end();});
 if(code!=='ERR_TLS_CERT_ALTNAME_INVALID')throw new Error('IP SAN negative did not produce actual hostname error');receipt.passed=true;receipt.actual_error_code=code;receipt.default_checkServerIdentity=true;receipt.empty_SNI=true;receipt.IP_URL_requires_IP_SAN=true;
}catch(error){receipt.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{await app?.close();if(db?.open)db.close();if(material)await material.close();receipt.cleanup={app_closed:!app?.server.listening,db_closed:!db?.open,temp_absent:material?await stat(material.owned).then(()=>false,()=>true):true};await writeFile(new URL('tls-ip-sni-first.receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));}
