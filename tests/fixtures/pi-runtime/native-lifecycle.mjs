// Fixed isolated test harness; loader.js is an explicitly approved internal SDK file URL.
// It is not a public package export and is never imported by the product.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const mode = process.argv[2];
assert.ok(['identity', 'new', 'switch', 'fork', 'reload', 'shutdown', 'checks'].includes(mode));
const pkg = path.join(repo, 'packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent');
const hash = async name => createHash('sha256').update(await fs.readFile(name)).digest('hex');
const loaderPath = path.join(pkg, 'dist/core/extensions/loader.js');
const metadata = { version: JSON.parse(await fs.readFile(path.join(pkg, 'package.json'), 'utf8')).version, loader_sha256: await hash(loaderPath), loader_public_export: false, internal_loader_test_only: true };
assert.equal(metadata.version, '0.87.1');
assert.equal(metadata.loader_sha256, '81106b07522aaf9197858c4679fecd7fbd23c346376d6e1f2cc3dd5294d543f4');
const sdk = await import(pathToFileURL(path.join(pkg, 'dist/index.js')));
const loader = await import(pathToFileURL(loaderPath));
const require = createRequire(path.join(repo, 'package.json'));
const Database = require('better-sqlite3');
const { bootstrapDatabase, SqliteStorage } = await import(pathToFileURL(path.join(repo, 'packages/storage-sqlite/dist/index.js')));
const { buildApp } = await import(pathToFileURL(path.join(repo, 'packages/server/dist/index.js')));
const { DetunedClient, UserAbortError } = await import(pathToFileURL(path.join(repo, 'packages/client/dist/index.js')));
const { DetunedError } = await import(pathToFileURL(path.join(repo, 'packages/protocol/dist/index.js')));
if (mode === 'checks') {
  await runPiChecks();
} else {
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'detuned-pi-native-'));
let db, app, host;
const deadline = setTimeout(() => { console.error('Private native lifecycle deadline.'); process.exit(1); }, 60000);
const evidence = { mode, metadata, model_calls: 0, events: [] };
try {
  db = new Database(path.join(dir, 'private.sqlite'));
  const adminToken = bootstrapDatabase(db).adminToken;
  app = buildApp({ storage: new SqliteStorage(db), writeRateLimits: { per_minute: 60000, burst: 10000 } });
  const requests = [];
  app.addHook('onRequest', async req => { requests.push({ method: req.method, path: req.url.split('?')[0] }); });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const admin = new DetunedClient({ baseUrl: url, token: adminToken });
  const space = (await admin.createSpace({ slug: 'private-native', objective: 'private verification', rules: [] }, 'space')).data.space.id;
  const deniedSpace = (await admin.createSpace({ slug: 'private-denied', objective: 'private verification', rules: [] }, 'denied')).data.space.id;
  const thread = (await admin.createThread(space, { title: 'private thread', initial_post: { title: 'private seed', kind: 'note', summary: 'private', body: 'private' } }, 'thread')).data.thread.id;
  const actors = [];
  for (const display_name of ['Private A', 'Private B']) {
    const actor = await admin.createActor({ kind: 'agent', display_name });
    await admin.createMembership(space, { actor_id: actor.id, role: 'contributor' });
    const credential = await admin.createCredential({ actor_id: actor.id, allowed_space_ids: ['*'], capabilities: ['read', 'write'] });
    actors.push({ actor, credential });
  }
  const tokenFile = path.join(dir, 'forum-token');
  await fs.writeFile(tokenFile, actors[0].credential.token, { mode: 0o600 });
  process.env.DETUNED_BASE_URL = url;
  process.env.DETUNED_TOKEN_FILE = tokenFile;
  const authPath = path.join(dir, 'auth.json');
  await fs.writeFile(authPath, '{}', { mode: 0o600 });
  const modelRuntime = await sdk.ModelRuntime.create({ authPath, modelsPath: null, allowModelNetwork: false, refreshOnCreate: false });
  const settingsManager = sdk.SettingsManager.inMemory();
  const eventBus = sdk.createEventBus();
  let loaded, generation = 0, veto = false;
  const activate = async () => {
    const gen = ++generation;
    const runtime = sdk.createExtensionRuntime();
    loaded = await loader.loadExtensionsCached([path.join(repo, 'packages/adapter-pi/dist/index.js')], dir, eventBus, runtime);
    assert.equal(loaded.errors.length, 0);
    const observer = await loader.loadExtensionFromFactory(pi => {
      pi.on('session_before_switch', async () => veto ? { cancel: true } : undefined);
      for (const name of ['session_start', 'session_shutdown']) pi.on(name, async event => {
        evidence.events.push({ type: event.type, reason: event.reason, generation: gen, phase: 'enter' });
        await new Promise(resolve => setImmediate(resolve));
        evidence.events.push({ type: event.type, reason: event.reason, generation: gen, phase: 'exit' });
      });
    }, dir, eventBus, runtime, 'private-native-observer-' + gen);
    loaded.extensions.push(observer);
  };
  const beforeActivation = requests.length;
  await activate();
  const resourceLoader = {
    getExtensions: () => loaded, getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }), getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }), getSystemPrompt: () => '', getSystemPromptSource: () => undefined,
    getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [], extendResources: () => {}, reload: activate,
  };
  const factory = async options => {
    const result = await sdk.createAgentSession({ ...options, modelRuntime, resourceLoader, tools: loaded.extensions.flatMap(extension => [...extension.tools.keys()]), settingsManager });
    await result.session.bindExtensions({});
    return { ...result, services: { cwd: dir, agentDir: dir, modelRuntime, settingsManager, resourceLoader, diagnostics: [] }, diagnostics: [] };
  };
  const manager = sdk.SessionManager.create(dir, path.join(dir, 'sessions'));
  const saveStatic = manager => {
    manager.appendMessage({ role: 'user', content: 'Private lifecycle fixture', timestamp: Date.now() });
    manager.appendMessage({ role: 'assistant', content: [{ type: 'text', text: 'Static test fixture; no model call.' }], api: 'openai-completions', provider: 'private', model: 'private', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: 'stop', timestamp: Date.now() });
  };
  host = await sdk.createAgentSessionRuntime(factory, { cwd: dir, agentDir: dir, sessionManager: manager });
  saveStatic(manager);
  assert.equal(requests.length, beforeActivation);
  const names = host.session.extensionRunner.getAllRegisteredTools().map(tool => tool.definition.name).sort();
  assert.deepEqual(names, ['forum_ack', 'forum_context', 'forum_poll', 'forum_publish', 'forum_read', 'forum_relate', 'forum_review', 'forum_search', 'forum_subscribe']);
  assert.equal(host.session.getAllTools().length, 9);
  evidence.tools = names; evidence.activation_and_start_http = 0;
  let serial = 0;
  const call = (name, args, definition = host.session.getToolDefinition(name)) => definition.execute('private-' + (++serial), args, new AbortController().signal);
  const publish = key => ({ space_id: space, op: 'post', thread_id: thread, kind: 'note', title: 'private native', summary: 'private', body: 'private', request_key: key });
  const invalidCount = requests.length;
  const invalid = await call('forum_review', { space_id: space, op: 'create_session', request_id: 'absent', client_name: 'invalid', client_version: '1', actor_id: 'PRIVATE_INVALID_MARKER' }).then(() => undefined, error => error);
  assert.equal(invalid?.code, 'VALIDATION_ERROR');
  assert.equal(String(invalid?.message).includes('PRIVATE_INVALID_MARKER'), false);
  assert.equal(requests.length, invalidCount);
  evidence.invalid_review_before_prepare_http = 0;
  const beforeCall = requests.length;
  const initial = await Promise.all([call('forum_publish', publish('first')), call('forum_publish', publish('parallel'))]);
  assert.ok(initial.every(value => value.details.post.author_id === actors[0].actor.id));
  const firstRequests = requests.slice(beforeCall);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/capabilities')).length, 1);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/me')).length, 1);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/sessions')).length, 1);
  assert.equal(firstRequests.filter(value => value.path.endsWith('/posts')).length, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[0].actor.id).n, 1);
  evidence.concurrent_first_calls = { capability: 1, me: 1, session: 1, posts: 2, author_a: true };
  await fs.writeFile(tokenFile, actors[1].credential.token, { mode: 0o600 });
  assert.equal((await call('forum_publish', publish('same-generation'))).details.post.author_id, actors[0].actor.id);
  evidence.same_generation_retains_a = true;
  if (mode === 'identity') {
    veto = true;
    const count = requests.length;
    const replacement = await host.newSession();
    assert.equal(replacement.cancelled, true);
    assert.equal(requests.length, count);
    assert.equal((await call('forum_publish', publish('veto-keeps-old'))).details.post.author_id, actors[0].actor.id);
    veto = false;
    await host.newSession();
    assert.equal((await call('forum_publish', publish('new-generation-b'))).details.post.author_id, actors[1].actor.id);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[1].actor.id).n, 1);
    const denied = await call('forum_context', { space_id: deniedSpace }).then(() => undefined, error => error);
    assert.ok(denied instanceof DetunedError);
    assert.equal(denied.code, 'NOT_FOUND');
    assert.equal(denied.statusCode, 404);
    assert.equal(JSON.stringify({ message: denied.message, details: denied.details }).includes(actors[1].credential.token), false);
    // Add the ninth-tool path only after all original identity/session counts.
    await admin.patchSpace(space, { expected_revision: 1, review_policy: { enabled: true, required_reviewers: 1, exclude_contributors: true, distinct_actors: true, distinct_independence_groups: false, seal_until_all_submitted: true, invalidate_on_revision: true, required_checks: [], allow_open_objections: false } }, 'review-policy');
    await admin.patchMembership(space, actors[1].actor.id, { reviewer_eligible: true, independence_group: 'private-b' });
    const claim = (await admin.createPost(space, thread, { kind: 'claim', title: 'Private review target', summary: 'Private', body: 'Private fixed material', structured: { statement: 'Private claim', assumptions: [], scope: 'owned', falsification_plan: 'counterexample' } }, 'review-target')).data.post;
    const request = await admin.createReviewRequest(space, { target_ref: { post_id: claim.id, revision: 1 }, dependency_refs: [], artifact_ids: [], code_refs: [], declared_contributors: [], reviewer_actor_ids: [actors[1].actor.id], expected_policy_revision: 2, reproduction_instructions: 'Private bounded recipe' }, 'native-review-request');
    const beforeReview = db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[1].actor.id).n;
    const explicit = (await call('forum_review', { space_id: space, op: 'create_session', request_id: request.id, client_name: 'native-explicit-review', client_version: '1' })).details;
    const assignment = (await call('forum_read', { space_id: space, kind: 'review_assignment', id: request.id })).details;
    assert.equal(explicit.actor_id, actors[1].actor.id); assert.equal(explicit.space_id, space);
    assert.equal(assignment.reviewer_actor_id, actors[1].actor.id);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[1].actor.id).n, beforeReview + 1);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=? AND client_name=?').get(actors[1].actor.id, 'detuned-pi').n, 1);
    assert.equal(requests.filter(value => value.path.endsWith('/ack')).length, 0);
    evidence.ninth_review = { actual_session: true, assignment_actor_b: true, diagnostic_unchanged: true, session_delta: 1, ack_delta: 0 };
    evidence.veto_preserves_runtime = true; evidence.new_generation_b = true; evidence.ordinary_actor_denied_space = denied.code;
  } else {
    // Separate consumers establish both a persistent unconfirmed batch and a genuine long wait.
    const actorClient = new DetunedClient({ baseUrl: url, token: actors[0].credential.token });
    const pending = (await actorClient.subscribe(space, { consumer_key: 'pending', start: 'beginning' })).data.consumer.id;
    const batch = (await call('forum_poll', { space_id: space, consumer_id: pending, limit: 1, wait_ms: 0 })).details;
    assert.ok(batch.batch_id);
    const waiting = (await actorClient.subscribe(space, { consumer_key: 'waiting', start: 'now', event_types: ['post.created'] })).data.consumer.id;
    const state = id => db.prepare('SELECT ack_seq,active_batch_id FROM consumers WHERE id=?').get(id);
    const beforePending = state(pending), beforeWaiting = state(waiting);
    const ackCount = () => requests.filter(value => value.path.endsWith('/ack')).length;
    const beforeAck = ackCount();
    let entered;
    const entry = new Promise(resolve => { entered = resolve; });
    const service = app.eventService;
    const original = service.pollWithWait.bind(service);
    service.pollWithWait = (...args) => { const result = original(...args); if (args[2] === waiting && args[3]?.wait_ms > 0) entered(); return result; };
    let settled = false;
    const oldPoll = host.session.getToolDefinition('forum_poll');
    const inflight = call('forum_poll', { space_id: space, consumer_id: waiting, limit: 1, wait_ms: 25000 }, oldPoll).finally(() => { settled = true; });
    const observed = inflight.then(() => ({ success: true }), error => ({ error }));
    await entry;
    assert.equal(settled, false);
    const startCount = evidence.events.filter(event => event.type === 'session_start').length;
    if (mode === 'new') await host.newSession();
    if (mode === 'switch') {
      const target = sdk.SessionManager.create(dir, path.join(dir, 'switch-sessions')); saveStatic(target);
      await host.switchSession(target.getSessionFile());
    }
    if (mode === 'fork') await host.fork(manager.getLeafId(), { position: 'at' });
    if (mode === 'reload') await host.session.reload();
    if (mode === 'shutdown') { await host.dispose(); host = undefined; }
    assert.equal(settled, true, 'Official lifecycle return must follow tool finally.');
    assert.ok((await observed).error instanceof UserAbortError);
    assert.deepEqual(state(pending), beforePending);
    assert.deepEqual(state(waiting), beforeWaiting);
    assert.equal(ackCount(), beforeAck);
    evidence.cancelled_before_return = true; evidence.tool_finally_before_return = true; evidence.pending_batch_unchanged = true; evidence.ack_request_delta = 0;
    if (mode === 'reload' || mode === 'shutdown') {
      const count = requests.length;
      const oldCall = await call('forum_poll', { space_id: space, consumer_id: waiting, wait_ms: 0 }, oldPoll).then(() => undefined, error => error);
      assert.ok(oldCall instanceof UserAbortError);
      assert.equal(requests.length, count);
      evidence.closed_extension_no_http = true;
    }
    if (mode !== 'shutdown') {
      assert.equal((await call('forum_publish', publish('after-lifecycle'))).details.post.author_id, actors[1].actor.id);
      assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions WHERE actor_id=?').get(actors[1].actor.id).n, 1);
      evidence.replacement_uses_b = true;
      if (mode === 'reload') {
        assert.equal(generation, 2);
        assert.notEqual(host.session.getToolDefinition('forum_poll'), oldPoll);
        assert.equal(evidence.events.filter(event => event.type === 'session_start').length, startCount);
        evidence.reload_reactivated_without_start = true;
      }
    }
  }
  console.log(JSON.stringify({ ...evidence, passed: true }));
} catch (error) {
  // Only assertion/site/type information escapes, never request headers or private credential values.
  console.error(JSON.stringify({ mode, passed: false, error_name: error?.name, error_code: error?.code, location: String(error?.stack).split('\n').slice(1, 3) }));
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  if (host) await host.dispose();
  if (app) await app.close();
  db?.close();
  await fs.rm(dir, { recursive: true, force: true });
}

}

// Dedicated scenario: the six historical modes above remain unchanged.
async function runPiChecks() {
  const {prepareOrdinaryCheckFixture,exerciseOrdinaryCheckBranches,nativeCheckNames}=await import('../../../scripts/integrations/claude-check-probe.mjs');
  const {ArtifactFileStore}=await import('../../../packages/server/dist/index.js');
  const dir=process.argv[3];assert.equal(typeof dir,'string');assert.equal(process.argv.length,4);assert.equal(await fs.realpath(dir),dir);const rootStat=await fs.lstat(dir);assert.ok(rootStat.isDirectory()&&!rootStat.isSymbolicLink());assert.equal(rootStat.mode&0o777,0o700);assert.deepEqual(await fs.readdir(dir),[]);let db,app,host,originalFailure,body;const ownedSockets=new Map();let acceptedSockets=0,closedSockets=0;
  const stage=(label,error,counts={})=>{if(budgetAbort.signal.aborted&&!label.includes('cleanup')&&label!=='catch'){const failure=new Error('Checks cancelled');failure.code='CHECKS_DEADLINE';throw failure;}const value={stage:label};for(const key of ['active_count','connections'])if(Number.isSafeInteger(counts[key])&&counts[key]>=0)value[key]=counts[key];if(error){value.error_name=/^[A-Za-z0-9_]{1,64}$/.test(error.name??'')?error.name:'Error';if(/^[A-Z0-9_]{1,64}$/.test(error.code??''))value.error_code=error.code;}if(process.connected)process.send(value,()=>{});};
  const bounded=async(promise,signal,ms)=>{let timer,listener;try{return await Promise.race([promise,new Promise((_,reject)=>{const fail=()=>{const error=new Error('Bounded checks wait');error.code='CHECKS_DEADLINE';reject(error);};if(signal?.aborted)fail();else if(signal){listener=fail;signal.addEventListener('abort',listener,{once:true});}if(ms!==undefined)timer=setTimeout(fail,ms);})]);}finally{clearTimeout(timer);if(listener)signal.removeEventListener('abort',listener);}};
  const budgetAbort=new AbortController();const deadline=setTimeout(()=>budgetAbort.abort(),60000);
  const evidence={mode:'checks',metadata,model_calls:0,tools:[],checks:{},cleanup:{host_disposed:false,app_closed:false,db_closed:false,private_directory_removed:false}};
  stage('setup-begin');
  try {
    body=(async()=>{
    db=new Database(path.join(dir,'private.sqlite'));const boot=bootstrapDatabase(db);const blobs=await ArtifactFileStore.create(dir);
    app=buildApp({storage:new SqliteStorage(db,{dataDir:dir}),artifactBlobs:blobs,writeRateLimits:{per_minute:60000,burst:10000}});
    app.server.on('connection',socket=>{acceptedSockets++;const closed=new Promise(resolve=>socket.once('close',()=>{closedSockets++;ownedSockets.delete(socket);resolve();}));ownedSockets.set(socket,closed);});
    const requests=[];let waitingEntered;app.addHook('onRequest',async req=>{requests.push({method:req.method,path:req.url.split('?')[0]});if(waitingEntered&&req.url.includes('/consumers/'+waitingEntered.id+'/poll'))waitingEntered.resolve();});
    await app.listen({host:'127.0.0.1',port:0});const url='http://127.0.0.1:'+app.server.address().port;
    const admin=new DetunedClient({baseUrl:url,token:boot.adminToken,maxRetries:0,timeoutMs:2000});const fixture=await prepareOrdinaryCheckFixture(admin,url);
    const tokenFile=path.join(dir,'forum-token');await fs.writeFile(tokenFile,fixture.token,{mode:0o600});
    process.env.DETUNED_BASE_URL=url;process.env.DETUNED_TOKEN_FILE=tokenFile;
    const authPath=path.join(dir,'auth.json');await fs.writeFile(authPath,'{}',{mode:0o600});
    stage('setup-done');stage('SDK-begin');
    const modelRuntime=await sdk.ModelRuntime.create({authPath,modelsPath:null,allowModelNetwork:false,refreshOnCreate:false}),settingsManager=sdk.SettingsManager.inMemory(),eventBus=sdk.createEventBus(),runtime=sdk.createExtensionRuntime();
    const loaded=await loader.loadExtensionsCached([path.join(repo,'packages/adapter-pi/dist/index.js')],dir,eventBus,runtime);assert.equal(loaded.errors.length,0);
    const resourceLoader={getExtensions:()=>loaded,getSkills:()=>({skills:[],diagnostics:[]}),getPrompts:()=>({prompts:[],diagnostics:[]}),getThemes:()=>({themes:[],diagnostics:[]}),getAgentsFiles:()=>({agentsFiles:[]}),getSystemPrompt:()=>'',getSystemPromptSource:()=>undefined,getAppendSystemPrompt:()=>[],getAppendSystemPromptSources:()=>[],extendResources:()=>{},reload:async()=>{}};
    const factory=async options=>{const result=await sdk.createAgentSession({...options,modelRuntime,resourceLoader,tools:loaded.extensions.flatMap(extension=>[...extension.tools.keys()]),settingsManager});await result.session.bindExtensions({});return{...result,services:{cwd:dir,agentDir:dir,modelRuntime,settingsManager,resourceLoader,diagnostics:[]},diagnostics:[]};};
    const beforeActivation=requests.length;host=await sdk.createAgentSessionRuntime(factory,{cwd:dir,agentDir:dir,sessionManager:sdk.SessionManager.create(dir,path.join(dir,'sessions'))});assert.equal(requests.length,beforeActivation);
    stage('SDK-done');
    evidence.tools=host.session.extensionRunner.getAllRegisteredTools().map(tool=>tool.definition.name).sort();assert.deepEqual(evidence.tools,nativeCheckNames);assert.equal(host.session.getAllTools().length,9);
    let serial=0;const call=async(name,args,signal=budgetAbort.signal)=>{try{if(budgetAbort.signal.aborted)throw new UserAbortError();const value=await host.session.getToolDefinition(name).execute('native-check-'+(++serial),args,AbortSignal.any([signal,budgetAbort.signal]));return{ok:true,value:value.details};}catch(error){return{ok:false,code:error?.code,error};}};
    evidence.checks=await exerciseOrdinaryCheckBranches(call,fixture,()=>requests.length,label=>stage(label));
    stage('matrix-done');stage('subscribe-begin');
    const pending=(await fixture.ordinary.subscribe(fixture.space,{consumer_key:'checks-pending',start:'beginning'},'checks-pending')).data.consumer,batch=(await fixture.ordinary.poll(fixture.space,pending.id,{limit:1})).data;assert.ok(batch.batch_id);
    const waiting=(await fixture.ordinary.subscribe(fixture.space,{consumer_key:'checks-waiting',start:'now'},'checks-waiting')).data.consumer;
    stage('subscribe-done');
    const beforeAck=requests.filter(req=>req.path.endsWith('/ack')).length;let entered;const entry=new Promise(resolve=>{entered=resolve;});waitingEntered={id:waiting.id,resolve:()=>{stage('wait-entry');entered();}};stage('wait-begin');
    const controller=new AbortController(),flight=call('forum_poll',{space_id:fixture.space,consumer_id:waiting.id,limit:1,wait_ms:25000},controller.signal);await Promise.race([entry,new Promise((_,reject)=>{const fail=()=>reject(new UserAbortError());if(budgetAbort.signal.aborted)fail();else budgetAbort.signal.addEventListener('abort',fail,{once:true});})]);stage('abort');controller.abort();const cancelled=await flight;stage('flight-settled');assert.equal(cancelled.ok,false);assert.ok(cancelled.error instanceof UserAbortError);
    stage('host-cleanup-begin');await bounded(host.dispose(),budgetAbort.signal);host=null;stage('host-cleanup-done');evidence.cleanup.host_disposed=true;const resumed=(await fixture.ordinary.poll(fixture.space,pending.id,{limit:1})).data;assert.deepEqual(resumed,batch);assert.equal(requests.filter(req=>req.path.endsWith('/ack')).length,beforeAck);
    evidence.checks={...evidence.checks,ack_delta:0,pending_unchanged:true,cancelled:true};
    })();await bounded(body,budgetAbort.signal);
  } catch(error) {originalFailure=error;stage('catch',error);budgetAbort.abort();if(body)await bounded(body,undefined,2000).catch(()=>{});}
  finally {
    let cleanupFailure;const attempt=async(label,action,done)=>{stage(label+'-begin');try{await bounded(Promise.resolve().then(action),undefined,2000);done();stage(label+'-done');}catch(error){cleanupFailure??=error;stage(label+'-fail',error);}};
    if(host)await attempt('host-cleanup',()=>host.dispose(),()=>{evidence.cleanup.host_disposed=true;});
    if(app)await attempt('app-cleanup',async()=>{
      stage('business-cleanup-drain-begin',undefined,{active_count:app.runtimeResources.activeCount});app.detunedBeginDraining();
      evidence.cleanup.transport={active_before_drain:app.runtimeResources.activeCount};
      await app.runtimeResources.waitForIdle();assert.equal(app.runtimeResources.activeCount,0);
      evidence.cleanup.transport.active_after_drain=app.runtimeResources.activeCount;stage('business-cleanup-drain-done',undefined,{active_count:app.runtimeResources.activeCount});
      const sockets=[...ownedSockets.entries()];evidence.cleanup.transport.connections_before_close=sockets.length;stage('socket-cleanup-close-begin',undefined,{connections:sockets.length});
      for(const[socket]of sockets)socket.destroy();await Promise.all(sockets.map(([,closed])=>closed));assert.equal(ownedSockets.size,0);
      evidence.cleanup.transport.connections_after_close=ownedSockets.size;evidence.cleanup.transport.accepted_connections=acceptedSockets;evidence.cleanup.transport.closed_connections=closedSockets;stage('socket-cleanup-close-done',undefined,{connections:ownedSockets.size});
      await app.close();stage('app-cleanup-actual-close');
    },()=>{evidence.cleanup.app_closed=true;});
    if(db)await attempt('db-cleanup',()=>{db.close();},()=>{evidence.cleanup.db_closed=true;});
    await attempt('directory-cleanup',()=>fs.rm(dir,{recursive:true,force:true}),()=>{evidence.cleanup.private_directory_removed=true;});
    clearTimeout(deadline);if(process.connected)process.disconnect();
    if(originalFailure||cleanupFailure){console.error(JSON.stringify({mode:'checks',passed:false,code:'CHECKS_FAILED'}));process.exitCode=1;}
  }
  if(!originalFailure&&process.exitCode!==1)console.log(JSON.stringify({...evidence,passed:true}));
}
