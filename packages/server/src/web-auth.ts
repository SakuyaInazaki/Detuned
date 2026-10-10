import type {FastifyRequest} from 'fastify';
import {DetunedError,ErrorCode,WEB_SESSION_COOKIE,WEB_CSRF_HEADER} from '@detuned/protocol';
export interface WebAuthConfig {origin:string;authority:string;secure:boolean}
function invalid():never {throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid web authentication configuration.',400);}
export function resolveWebAuthConfig(options:{webOrigin?:string;allowInsecureLoopback?:boolean}):WebAuthConfig|undefined {
 if(options.allowInsecureLoopback!==undefined&&typeof options.allowInsecureLoopback!=='boolean')invalid();
 if(options.webOrigin===undefined){if(options.allowInsecureLoopback)invalid();return undefined;}
 if(typeof options.webOrigin!=='string'||typeof options.allowInsecureLoopback!=='undefined'&&typeof options.allowInsecureLoopback!=='boolean')invalid();
 let u:URL;try{u=new URL(options.webOrigin);}catch{invalid();}
 if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||!['https:','http:'].includes(u.protocol)||!/^https?:\/\/[^/?#]+\/?$/.test(options.webOrigin))invalid();
 if(u.protocol==='http:'&&(!options.allowInsecureLoopback||!/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?\/?$/i.test(options.webOrigin)))invalid();
 return {origin:u.origin,authority:u.host,secure:u.protocol==='https:'};
}
function reject(status=400):never {throw new DetunedError(status===403?ErrorCode.FORBIDDEN:ErrorCode.VALIDATION_ERROR,'Invalid web request.',status);}
export function uniqueHeader(req:FastifyRequest,name:string,max=8192):string|undefined {
 let count=0;for(let i=0;i<req.raw.rawHeaders.length;i+=2)if(req.raw.rawHeaders[i]?.toLowerCase()===name)count++;
 const value=req.headers[name];if(count>1||Array.isArray(value)||value!==undefined&&(typeof value!=='string'||value.length>max||/[\x00-\x1f\x7f]/.test(value)))reject();return value as string|undefined;
}
export function checkWebRequest(req:FastifyRequest,config:WebAuthConfig,requireOrigin=false):void {
 if(uniqueHeader(req,'host',256)!==config.authority)reject(403);
 const origin=uniqueHeader(req,'origin',2048);if(origin!==undefined&&origin!==config.origin||requireOrigin&&origin===undefined)reject(403);
}
export function readWebCookie(req:FastifyRequest):string|undefined {
 const header=uniqueHeader(req,'cookie');if(header===undefined)return;
 let found:string|undefined;for(const item of header.split(';')){const pair=item.trim();if(!pair||!pair.includes('='))reject();const equal=pair.indexOf('='),name=pair.slice(0,equal),value=pair.slice(equal+1);if(!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)||/[\x00-\x20\x7f;,]/.test(value))reject();if(name===WEB_SESSION_COOKIE){if(found!==undefined||!/^[A-Za-z0-9_-]{43}$/.test(value))reject();found=value;}}
 return found;
}
export function readCsrf(req:FastifyRequest):string {const csrf=uniqueHeader(req,WEB_CSRF_HEADER,128);if(csrf===undefined||!/^[A-Za-z0-9_-]{43}$/.test(csrf))reject(403);return csrf;}
export function bearerToken(req:FastifyRequest):string {const header=uniqueHeader(req,'authorization');if(!header?.startsWith('Bearer ')||header.length===7)throw new DetunedError(ErrorCode.UNAUTHENTICATED,'Missing or invalid Bearer credential.',401);return header.slice(7);}
export function sessionCookie(secret:string|undefined,config:WebAuthConfig):string {return `${WEB_SESSION_COOKIE}=${secret??''}; Path=/; HttpOnly; SameSite=Strict${config.secure?'; Secure':''}${secret===undefined?'; Max-Age=0':''}`;}
