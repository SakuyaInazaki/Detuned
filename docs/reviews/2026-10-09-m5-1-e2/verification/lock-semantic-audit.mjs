import assert from 'node:assert/strict';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),v=new URL('.',import.meta.url);
const yamlName=(await readdir(path.join(root,'node_modules/.pnpm'))).find(s=>s.startsWith('yaml@2.9.0'));
assert.ok(yamlName,'Already installed YAML parser');
const {parse}=await import(pathToFileURL(path.join(root,'node_modules/.pnpm',yamlName,'node_modules/yaml/dist/index.js')).href);
const beforeBytes=await readFile(new URL('before-files/pnpm-lock.yaml',v)),afterBytes=await readFile('pnpm-lock.yaml');
const before=parse(String(beforeBytes)),after=parse(String(afterBytes));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),changes={};
for(const section of Object.keys(after)) {
 if(['importers','packages','snapshots'].includes(section))continue;
 assert.ok(equal(before[section],after[section]),'Only authorized lock graph sections change');
}
for(const section of ['importers','packages','snapshots']){
 const a=before[section],b=after[section];changes[section]={added:Object.keys(b).filter(k=>!(k in a)),removed:Object.keys(a).filter(k=>!(k in b)),changed:Object.keys(a).filter(k=>k in b&&!equal(a[k],b[k]))};
}
assert.deepEqual(changes.importers.changed.toSorted(),['.','packages/web']);assert.deepEqual(changes.importers.added,[]);assert.deepEqual(changes.importers.removed,[]);
const oldRoot=structuredClone(before.importers['.']),newRoot=structuredClone(after.importers['.']);newRoot.devDependencies.vitest.version=newRoot.devDependencies.vitest.version.replace('(@types/debug@4.1.13)','');assert.ok(equal(oldRoot,newRoot),'Root only existing Vitest optional peer key');
const web=structuredClone(after.importers['packages/web']);const md=web.dependencies['react-markdown'];delete web.dependencies['react-markdown'];assert.ok(equal(web,before.importers['packages/web']),'Web other direct pins unchanged');assert.equal(md.specifier,'10.1.0');
assert.deepEqual(changes.packages.removed,[]);assert.deepEqual(changes.packages.changed,[]);
const oldVitest=changes.snapshots.removed[0],newVitest=changes.snapshots.added.find(k=>k.startsWith('vitest@'));
assert.equal(changes.snapshots.removed.length,1);assert.equal(newVitest.replace('(@types/debug@4.1.13)',''),oldVitest);
const newSnapshot=structuredClone(after.snapshots[newVitest]);delete newSnapshot.optionalDependencies['@types/debug'];assert.ok(equal(newSnapshot,before.snapshots[oldVitest]),'Vitest runtime old snapshot plus optional type peer only');
assert.deepEqual(changes.snapshots.changed,[]);
const start=changes.snapshots.added.find(k=>k.startsWith('react-markdown@10.1.0(')),reachable=new Set();
function visit(key){if(reachable.has(key))return;reachable.add(key);const row=after.snapshots[key];if(!row)return;for(const kind of ['dependencies','optionalDependencies'])for(const [name,version]of Object.entries(row[kind]??{}))visit(`${name}@${version}`);}
visit(start);
const notReached=changes.snapshots.added.filter(k=>k!==newVitest&&!reachable.has(k));assert.deepEqual(notReached,[],'Every added non-Vitest snapshot belongs to Markdown graph');
const packageGraph=new Set([...reachable].map(k=>k.replace(/\(.*/u,'')));assert.deepEqual(changes.packages.added.filter(k=>!packageGraph.has(k)),[],'Every newly resolved package belongs to Markdown graph');
const output={scope:'Independent entire exact-before YAML semantic comparison; no install or runtime execution',before_sha256:createHash('sha256').update(beforeBytes).digest('hex'),after_sha256:createHash('sha256').update(afterBytes).digest('hex'),changes,direct_pin:md,all_added_packages_reachable_from_markdown:true,existing_packages_resolution_unchanged:true,existing_vitest_version:'3.2.7',only_vitest_optional_type_peer_added:'@types/debug@4.1.13',existing_web_pins_unchanged:true};
await writeFile(new URL('lock-semantic-audit.json',v),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({added_packages:changes.packages.added.length,added_snapshots:changes.snapshots.added.length,changed_importers:changes.importers.changed,after_sha256:output.after_sha256}));
