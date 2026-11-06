import {spawn} from 'node:child_process';
import {access,stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';

const actions = new Set(['build','typecheck','lint']);
const packages = ['protocol','core','client','storage-sqlite','module-review','server','cli','mcp','adapter-pi'];
const fail = () => { console.error('Backend checks require a pnpm invocation, a readable Node entry in npm_execpath, and a build, typecheck, or lint action.'); process.exitCode = 1; };
const action = process.argv[2];
const entry = process.env.npm_execpath;
// pnpm supplies these invocation fields, including when launched through Corepack.
// Do not restrict the filename: a valid shim need not end in .cjs or .mjs.
let valid = actions.has(action) && process.argv.length === 3 && /^pnpm\/[0-9]/.test(process.env.npm_config_user_agent ?? '') && typeof entry === 'string' && path.isAbsolute(entry);
if (valid) {
  try { valid = (await stat(entry)).isFile(); await access(entry,constants.R_OK); }
  catch { valid = false; }
}
if (!valid) fail();
else {
  const child = spawn(process.execPath,[entry,'--workspace-concurrency=1',...packages.flatMap(name=>['--filter',`@detuned/${name}`]),'-r','run',action],{stdio:'inherit'});
  let requestedSignal;
  const forward = signal => { requestedSignal = signal; child.kill(signal); };
  const interrupt = () => forward('SIGINT');
  const terminate = () => forward('SIGTERM');
  process.on('SIGINT',interrupt); process.on('SIGTERM',terminate);
  child.once('error',fail);
  child.once('close',(code,signal)=>{
    process.off('SIGINT',interrupt); process.off('SIGTERM',terminate);
    const exitSignal = requestedSignal ?? signal;
    if (exitSignal) process.kill(process.pid,exitSignal);
    else process.exitCode = Number.isInteger(code) && code >= 0 ? code : 1;
  });
}
