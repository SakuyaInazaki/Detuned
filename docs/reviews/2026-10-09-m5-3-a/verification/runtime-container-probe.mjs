// Host orchestrator. Requires an explicit parent-approved immutable image binding.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { privateTlsMaterial } from '../../2026-10-09-m5-2-a/verification/tls-private-material.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const value = n => { const i = process.argv.indexOf(n); return i < 0 ? undefined : process.argv[i + 1]; };
const bindingPath = value('--binding'), receiptPath = value('--receipt');
assert.ok(bindingPath && receiptPath, 'Explicit binding and fresh receipt required.');
const binding = JSON.parse(await readFile(bindingPath, 'utf8'));
assert.equal(binding.parent_execution_approved, true);
assert.match(binding.runtime_image_id, /^sha256:[a-f0-9]{64}$/);
assert.equal(binding.cold_build_window_released, true);
assert.equal(binding.docker_host, 'unix:///private/tmp/detuned-colima-owned-608g1enf/colima/detuned-owned/docker.sock');
assert.ok(binding.docker_config.startsWith('/private/tmp/detuned-'));
const docker = binding.docker_cli ?? '/opt/homebrew/bin/docker';
const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', DOCKER_HOST: binding.docker_host, DOCKER_CONFIG: binding.docker_config };
const prefix = `detuned-m53-d-${randomBytes(5).toString('hex')}`, resources = [], children = new Set();
const receipt = { scope: 'Independent final Linux runtime image/container restart/HTTPS/offline restore, no browser/capacity certification', image_id: binding.runtime_image_id, source_binding: binding.source_binding, stages: [], resource_ledger: resources, status: 'running' };
writeFileSync(receiptPath+'.ledger.json', JSON.stringify(resources), {mode:0o600,flag:'wx'});
let certs, currentStage = 'setup', privateState, sourceDataVolume;
const stage = n => { currentStage = n; receipt.stages.push(n); };
function register(kind, name) { assert.ok(name.startsWith(prefix)); resources.push({ kind, name, created: false, removed: false }); writeFileSync(receiptPath+'.ledger.json',JSON.stringify(resources,null,2)+'\n',{mode:0o600}); return name; }
async function command(args, { input, timeout = 20000, allowFailure = false } = {}) {
  const start = Date.now();
  return await new Promise((resolve, reject) => {
    const c = spawn(docker, args, { env, stdio: ['pipe', 'pipe', 'pipe'] }); children.add(c);
    let stdout = '', stderr = '', timedOut = false;
    c.stdout.on('data', b => { stdout += b; }); c.stderr.on('data', b => { stderr += b; });
    const timer = setTimeout(() => { timedOut = true; c.kill('SIGKILL'); }, timeout);
    c.once('error', () => { clearTimeout(timer); children.delete(c); reject(new Error('Owned Docker launch failed.')); });
    c.once('close', (code, signal) => {
      clearTimeout(timer); children.delete(c);
      if ((code !== 0 || timedOut) && !allowFailure) {
        receipt.failure = { stage: currentStage, exit_code: code, signal, timeout: timedOut, stderr_sha256: createHash('sha256').update(stderr).digest('hex') };
        if (args.includes('/tmp/runtime-worker.mjs')) { try { receipt.failure.worker_safe_diagnostic = JSON.parse(stderr); } catch {} }
        reject(new Error('Owned Docker operation failed.'));
      } else resolve({ stdout, code, signal, milliseconds: Date.now() - start });
    }); c.stdin.on('error', () => {}); c.stdin.end(input);
  });
}
async function volume(label) {
  const name = register('volume', `${prefix}-${label}`); await command(['volume', 'create', name]); resources.at(-1).created = true; return name;
}
async function oneShot(label, args, mounts, { input, user = '1000:1000', entrypoint = 'node' } = {}) {
  const name = register('container', `${prefix}-${label}`);
  // Image declares VOLUME /data: bind a registered volume even for restore-only commands.
  if (!mounts.some(([,p]) => p === '/data')) mounts = [...mounts, [sourceDataVolume, '/data', true]];
  const out = await command(['run', ...(input === undefined ? [] : ['-i']), '--name', name, '--user', user, '--network', 'none', ...mounts.flatMap(([v,p,ro]) => ['-v', `${v}:${p}${ro ? ':ro' : ''}`]), '--entrypoint', entrypoint, binding.runtime_image_id, ...args], { input, timeout: 30000 });
  resources.at(-1).created = true; return out;
}
async function runCLI(label, args, mounts) {
  const out = await oneShot(label, ['/app/packages/cli/dist/index.js', '--json', ...args], mounts);
  return JSON.parse(out.stdout); // Private administrator output stays in memory only.
}
async function ready(container, port = 3443, origin = 'https://127.0.0.1:3443') {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    const r = await command(['exec', container, 'node', '/app/scripts/integrations/deployment/container-health.mjs', '--url', `https://127.0.0.1:${port}`, '--web-origin', origin, '--ca', '/tls/ca.pem'], { allowFailure: true, timeout: 5000 });
    if (r.code === 0) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Owned runtime readiness deadline.');
}
async function startRuntime(label, dataVolume, tlsVolume, port = 3443, origin = 'https://127.0.0.1:3443') {
  const name = register('container', `${prefix}-${label}`);
  await command(['create', '--name', name, '-v', `${dataVolume}:/data`, '-v', `${tlsVolume}:/tls:ro`, binding.runtime_image_id, 'serve', '--host', '0.0.0.0', '--port', String(port), '--data-dir', '/data/instance', '--web-origin', origin, '--web-assets-dir', '/app/packages/web/dist', '--tls-cert-file', '/tls/leaf.pem', '--tls-key-file', '/tls/key.pem', '--no-request-logs']); resources.at(-1).created = true;
  await command(['cp', path.join(here, 'runtime-worker.mjs'), `${name}:/tmp/runtime-worker.mjs`]);
  await command(['start', name]); await ready(name,port,origin); return name;
}
async function worker(container, message) {
  const r = await command(['exec', '-i', '-e', 'NODE_EXTRA_CA_CERTS=/tls/ca.pem', container, 'node', '/tmp/runtime-worker.mjs'], { input: JSON.stringify(message), timeout: 60000 });
  return JSON.parse(r.stdout); // Private state, tokens, cookies, signed cursors are never evidence.
}
async function inspect(container) {
  const data = JSON.parse((await command(['inspect', container])).stdout)[0];
  return { id: data.Id, running: data.State.Running, started_at: data.State.StartedAt, finished_at: data.State.FinishedAt, exit_code: data.State.ExitCode, oom_killed: data.State.OOMKilled, user: data.Config.User, entrypoint: data.Config.Entrypoint, path: data.Path, args: data.Args, mounts: data.Mounts.map(m => ({ type: m.Type, destination: m.Destination, RW: m.RW })) };
}
async function stop(container) {
  const r = await command(['stop', '--time', '15', container], { timeout: 20000 });
  const s = await inspect(container); assert.equal(s.running, false); assert.equal(s.exit_code, 0); assert.equal(s.oom_killed, false); return { ...s, docker_stop_ms: r.milliseconds };
}
try {
  stage('owned-volumes-certificate-material');
  const data = await volume('source'), backup = await volume('backup'), restored = await volume('restored'), tls = await volume('tls');
  sourceDataVolume = data;
  certs = await privateTlsMaterial();
  const setup = "import fs from 'node:fs';let s='';for await(const c of process.stdin)s+=c;const x=JSON.parse(s);for(const d of ['/data','/backup','/restore','/tls']){fs.mkdirSync(d,{recursive:true});fs.chownSync(d,1000,1000);}for(const [n,b]of Object.entries(x)){const p='/tls/'+n;fs.writeFileSync(p,Buffer.from(b,'base64'),{mode:0o600});fs.chownSync(p,1000,1000);}";
  await oneShot('fixture-material', ['--input-type=module', '-e', setup], [[data,'/data'],[backup,'/backup'],[restored,'/restore'],[tls,'/tls']], { user: '0:0', input: JSON.stringify({ 'ca.pem':certs.ca.toString('base64'), 'leaf.pem':certs.cert.toString('base64'), 'key.pem':certs.key.toString('base64'), 'wrong-ca.pem':certs.wrongCa.toString('base64') }) });
  stage('explicit-init-final-runtime');
  const initialized = await runCLI('init', ['init', '--data-dir', '/data/instance'], [[data,'/data']]);
  const runtime = await startRuntime('runtime', data, tls), before = await inspect(runtime);
  assert.equal(before.user, '1000:1000'); assert.deepEqual(before.entrypoint, ['node','/app/packages/cli/dist/index.js']); assert.equal(before.path, 'node'); assert.ok(before.mounts.every(m => m.type === 'volume')); assert.equal(before.mounts.find(m => m.destination === '/tls').RW, false);
  const seeded = await worker(runtime, { phase:'seed', adminToken: initialized.admin_token }); privateState = seeded.state; receipt.runtime_seed = seeded.receipt;
  if (!process.argv.includes('--remaining-only')) {
    const transported = await worker(runtime, { phase:'transport', token: privateState.people[0].token, state:privateState }); privateState = transported.state; receipt.transport = transported.receipt; assert.equal(receipt.transport.actual_uid,1000);
  } else receipt.transport = {reused_prior_success:'runtime-third.receipt.json',not_rerun:true};
  stage('actual-docker-stop-start-persistence');
  const stopped = await stop(runtime); await command(['start', runtime]); await ready(runtime); const after = await inspect(runtime); assert.notEqual(after.started_at,before.started_at);
  receipt.container_restart = { same_container_id: before.id === after.id, old_started_at:before.started_at, new_started_at:after.started_at, natural_stop_exit:stopped.exit_code, stop_ms:stopped.docker_stop_ms, direct_exec_nonroot:true, read_only_TLS_volume:true, no_host_mounts:true };
  receipt.persisted = (await worker(runtime,{phase:'persisted',state:privateState})).receipt;
  stage('compose-default-authority-actual-health'); await stop(runtime);
  const authorityRuntime=await startRuntime('authority-runtime',data,tls,3000,'https://localhost:8443');
  const authorityResult=await worker(authorityRuntime,{phase:'authority'});receipt.default_compose_authority=authorityResult.receipt;receipt.authority_statuses=authorityResult.status_observations; await stop(authorityRuntime);
  stage('offline-backup-new-volume-restore');
  const historicalSeed = await oneShot('disabled-fixture', ['--input-type=module','-e',await readFile(path.join(here,'runtime-worker.mjs'),'utf8')], [[data,'/data'],[tls,'/tls',true]], {input:JSON.stringify({phase:'disable-offline-fixture',actorId:privateState.disabledActorId})});
  receipt.disabled_history_seed = JSON.parse(historicalSeed.stdout).receipt;
  await runCLI('backup', ['backup','--offline','--data-dir','/data/instance','--output','/backup/snapshot'], [[data,'/data'],[backup,'/backup']]);
  const recovery = await runCLI('restore', ['restore','--backup','/backup/snapshot','--data-dir','/restore/instance'], [[backup,'/backup',true],[restored,'/restore']]);
  const restoredRuntime = await startRuntime('restored-runtime', restored, tls);
  const restoredResult=await worker(restoredRuntime,{phase:'restored',state:privateState,adminToken:recovery.admin_token});receipt.restored=restoredResult.receipt;receipt.restore_statuses=restoredResult.status_observations;
  await stop(restoredRuntime); receipt.status='passed';
} catch (e) {
  receipt.status='failed'; receipt.failure ??= { stage:currentStage, classification:'Independent runtime assertion or environment failure' }; process.exitCode=1;
} finally {
  for (const c of children) c.kill('SIGKILL');
  for (const r of [...resources].reverse()) {
    const out = await command(r.kind==='container'?['rm','-f',r.name]:['volume','rm',r.name],{allowFailure:true,timeout:10000}).catch(()=>({code:null}));
    r.removed = out.code===0; r.cleanup_exit=out.code;
  }
  const certCleanup = certs ? await certs.close() : {temp_absent:true};
  receipt.cleanup={registered_resources:resources.length,all_registered_removed:resources.every(x=>x.removed),certificate_temp_absent:certCleanup.temp_absent,owned_VM_retained:true};
  writeFileSync(receiptPath+'.ledger.json',JSON.stringify(resources,null,2)+'\n',{mode:0o600});
  privateState=undefined;
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{mode:0o600,flag:'wx'});
  process.stdout.write(JSON.stringify({status:receipt.status,stages:receipt.stages,cleanup:receipt.cleanup})+'\n');
}
