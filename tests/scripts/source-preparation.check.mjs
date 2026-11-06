import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
const exporter = fileURLToPath(new URL('../../scripts/export-source.mjs', import.meta.url));
const installer = fileURLToPath(new URL('../../scripts/prepare-tools.sh', import.meta.url));
async function fixture(fn) {
  const root = await mkdtemp(path.join(tmpdir(), 'detuned-source-test-'));
  try { await mkdir(path.join(root, 'repo')); const repo = path.join(root, 'repo'); execFileSync('git', ['init', '-q'], { cwd: repo }); await fn(root, repo); }
  finally { await rm(root, { recursive: true, force: true }); }
}
async function put(repo, name, value='content') { await mkdir(path.dirname(path.join(repo,name)),{recursive:true}); await writeFile(path.join(repo,name),value); }
function track(repo) { execFileSync('git',['add','-f','.'],{cwd:repo}); }
function run(repo,out,...extra) { return spawnSync(process.execPath,[exporter,'--output',out,...extra],{cwd:repo,encoding:'utf8'}); }
test('copies current tracked bytes, skips deleted, excludes bulk and keeps legacy fixture',()=>fixture(async(root,repo)=>{
  const legacy='docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/legacy-thread-service.ts';
  for(const name of ['package.json','deleted','node_modules/a','packages/p/dist/a','.pnpm-store/a','docs/reviews/huge.jsonl',legacy,'tests/fixtures/archive.db','Dockerfile']) await put(repo,name);
  track(repo); await put(repo,'package.json','dirty'); await rm(path.join(repo,'deleted')); await put(repo,'extra','untracked');
  const out=path.join(root,'out'), result=run(repo,out); assert.equal(result.status,0,result.stderr); assert.equal(await readFile(path.join(out,'package.json'),'utf8'),'dirty'); assert.equal(await readFile(path.join(out,legacy),'utf8'),'content');
  for(const name of ['deleted','extra','node_modules/a','packages/p/dist/a','.pnpm-store/a','docs/reviews/huge.jsonl']) await assert.rejects(readFile(path.join(out,name)),{code:'ENOENT'});
  assert.equal(run(repo,path.join(root,'with-extra'),'--include','extra').status,0);
  assert.notEqual(run(repo,out).status,0);
}));
test('rejects traversal, excluded include, output inside repo and symlink ancestors',()=>fixture(async(root,repo)=>{
  await put(repo,'file');track(repo);
  for(const name of ['../file','/etc/passwd','.git/config','a/../file']) assert.notEqual(run(repo,path.join(root,'out'),'--include',name).status,0);
  assert.notEqual(run(repo,path.join(repo,'out')).status,0);
  await mkdir(path.join(root,'outside')); await writeFile(path.join(root,'outside','secret'),'private'); await symlink(path.join(root,'outside'),path.join(repo,'link'));
  assert.notEqual(run(repo,path.join(root,'linkout'),'--include','link/secret').status,0);
  assert.notEqual(run(repo,path.join(root,'dirlinkout'),'--include','link').status,0);
  await symlink(repo,path.join(root,'repo-alias')); assert.notEqual(run(repo,path.join(root,'repo-alias','new-output')).status,0);
  await put(repo,'included/file'); await symlink('../../outside/secret',path.join(repo,'included','link'));
  assert.notEqual(run(repo,path.join(root,'include-dir-out'),'--include','included').status,0);
  await symlink('file',path.join(repo,'tracked-link'));track(repo);assert.notEqual(run(repo,path.join(root,'trackedout')).status,0);
}));
test('installer refuses existing and relative prefixes before any network operation',()=>fixture(async(root)=>{
  for(const prefix of [root,'relative']) { const r=spawnSync('sh',[installer,prefix],{encoding:'utf8'});assert.notEqual(r.status,0); }
}));
test('rejects a deterministic source mutation during the read and retains partial output',()=>fixture(async(root,repo)=>{
  await put(repo,'file','original'); track(repo);
  const loader=path.join(root,'mutation-loader.mjs'), out=path.join(root,'out');
  // Test-only module loading injects one mutation immediately after the real read.
  // No timing race, large fixture, or production hook is involved.
  await writeFile(loader, `import { appendFile } from 'node:fs/promises';
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (url === ${JSON.stringify(new URL('../../scripts/export-source.mjs', import.meta.url).href)}) {
    const source = String(result.source), needle = 'bytes = await handle.readFile();';
    if (!source.includes(needle)) throw Error('Mutation injection point not found');
    result.source = source.replace(needle, needle + ${JSON.stringify(` await (await import('node:fs/promises')).appendFile(${JSON.stringify(path.join(repo,'file'))}, 'changed');`)});
  }
  return result;
}`);
  const result=spawnSync(process.execPath,['--loader',loader,exporter,'--output',out],{cwd:repo,encoding:'utf8'});
  assert.notEqual(result.status,0); assert.match(result.stderr,/Source changed during export: file/); assert.match(result.stderr,/Partial output retained/);
  assert.equal(await readFile(path.join(repo,'file'),'utf8'),'originalchanged');
  await assert.rejects(readFile(path.join(out,'file')),{code:'ENOENT'});
}));
