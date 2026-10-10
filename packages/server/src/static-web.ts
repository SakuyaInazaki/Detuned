import fs from 'node:fs';
import path from 'node:path';
import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify';
import fastifyStatic from '@fastify/static';
import {DetunedError,ErrorCode} from '@detuned/protocol';

const invalid=()=>new DetunedError(ErrorCode.VALIDATION_ERROR,'Web assets configuration is invalid.',400);
const notFound=()=>new DetunedError(ErrorCode.NOT_FOUND,'Web asset not found.',404);
const csp="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
function regular(p:string):boolean {const st=fs.lstatSync(p);return !st.isSymbolicLink()&&st.isFile();}
/** Explicit build directory only; never infer it from the instance data directory. */
export function resolveWebAssetsDir(value:string|undefined,webOrigin:string|undefined,dataDir?:string):string|undefined {
  if(value===undefined)return undefined;
  if(typeof value!=='string'||!value||!webOrigin)throw invalid();
  try {
    const absolute=path.resolve(value),st=fs.lstatSync(absolute);
    if(st.isSymbolicLink()||!st.isDirectory())throw invalid();
    const root=fs.realpathSync(absolute);
    if(!regular(path.join(root,'index.html')))throw invalid();
    const assets=path.join(root,'assets');
    if(fs.existsSync(assets)){const a=fs.lstatSync(assets);if(a.isSymbolicLink()||!a.isDirectory())throw invalid();}
    if(dataDir){const data=fs.existsSync(dataDir)?fs.realpathSync(dataDir):path.resolve(dataDir);const relative=path.relative(data,root);if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw invalid();}
    return root;
  }catch{throw invalid();}
}
export function isWebStaticRequest(req:FastifyRequest):boolean {
  return ['GET','HEAD'].includes(req.method)&&['/','/assets/*'].includes(req.routeOptions.url??'');
}
export async function staticWebRoutes(app:FastifyInstance,options:{root:string}):Promise<void> {
  await app.register(fastifyStatic,{root:options.root,serve:false,dotfiles:'deny',index:false,cacheControl:false,etag:false,lastModified:false,acceptRanges:false});
  const send=async(req:FastifyRequest,reply:FastifyReply)=>{
    let name='index.html';
    if(req.routeOptions.url==='/assets/*'){
      const rest=(req.params as {'*':string})['*'];
      if(!rest||rest.includes('\\')||rest.split('/').some(v=>!v||v==='.'||v==='..'||v.startsWith('.'))||! /\.(js|css)$/.test(rest))throw notFound();
      name='assets/'+rest;
    }
    try {const segments=name.split('/');let current=options.root;for(let i=0;i<segments.length;i++){current=path.join(current,segments[i]!);const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||(i===segments.length-1?!stat.isFile():!stat.isDirectory()))throw notFound();}}
    catch{throw notFound();}
    reply.header('cache-control','no-store').header('content-security-policy',csp).header('x-content-type-options','nosniff');
    return reply.sendFile(name);
  };
  app.route({method:['GET','HEAD'],url:'/',handler:send});
  app.route({method:['GET','HEAD'],url:'/assets/*',handler:send});
}
