from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,shutil,re,os
v=Path(__file__).resolve().parent;root=v.parents[3];baseline=json.loads((v/'baseline.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source={**baseline['product_source_config_test_hashes'],**baseline['current_document_hashes'],**baseline['mutable_status_document_hashes'],**baseline['tracked_build_artifact_hashes'],**baseline['untracked_build_artifact_hashes']}
files=[];c=json.loads((v/'before-candidates.json').read_text())
for name in c['existing']:
 p=root/name;assert p.is_file(),name;assert sha(p)==source[name],name
 dst=v/'before-files'/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dst)
 files.append({'original_path':name,'snapshot_path':str(dst.relative_to(v)),'sha256':sha(dst),'bytes':dst.stat().st_size,'matches_fresh_hash':True})
missing=[]
for name in c['new_missing']:
 assert not (root/name).exists(),name;missing.append({'path':name,'state':'missing; no placeholder created'})
(v/'before-manifest.json').write_text(json.dumps({'captured_at':datetime.now(timezone.utc).isoformat(),'scope':'M6.3 candidate exact before; capture does not grant edit permission','files':files,'missing':missing},indent=2)+'\n')
package_paths={'@detuned/core':'packages/core','@detuned/protocol':'packages/protocol','@detuned/storage-sqlite':'packages/storage-sqlite','@detuned/module-review':'modules/review'}
entries=['modules/review/dist/index.js','packages/storage-sqlite/dist/index.js'];queue=list(entries);seen=set();deps={};external=set();unresolved=[]
# Exact literal import/from/require specs in installed built repository files only.
pattern=re.compile(r'''(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]''')
while queue:
 name=queue.pop()
 if name in seen:continue
 seen.add(name);p=root/name;assert p.is_file(),name;assert sha(p)==source[name],name
 specs=pattern.findall(p.read_text());deps[name]=specs
 for spec in specs:
  if spec.startswith('.'):
   target=(p.parent/spec).resolve();rel=str(target.relative_to(root));queue.append(rel)
  elif spec in package_paths:queue.append(package_paths[spec]+'/dist/index.js')
  elif spec.startswith('@detuned/'):unresolved.append({'source':name,'import':spec})
  elif not spec.startswith('node:'):external.add(spec)
assert not unresolved,unresolved
frozen=v/'old-schema4-review-runtime';closure=[]
for name in sorted(seen|{x+'/package.json' for x in package_paths.values()}):
 p=root/name;assert sha(p)==source[name],name
 dst=frozen/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dst)
 closure.append({'original_path':name,'snapshot_path':str(dst.relative_to(v)),'sha256':sha(dst),'bytes':dst.stat().st_size,'matches_fresh_hash':True})
links=[]
for name,location in package_paths.items():
 dst=frozen/'node_modules'/name;dst.parent.mkdir(parents=True,exist_ok=True);target=Path(os.path.relpath(frozen/location,dst.parent));dst.symlink_to(target,target_is_directory=True)
 links.append({'path':str(dst.relative_to(v)),'target':str(target),'owned_frozen_code':True})
for spec in sorted(external):
 base='/'.join(spec.split('/')[:2]) if spec.startswith('@') else spec.split('/')[0]
 dst=frozen/'node_modules'/base
 if dst.exists():continue
 candidates=[root/loc/'node_modules'/base for loc in package_paths.values()]+[root/'node_modules'/base]
 target=next((p.resolve() for p in candidates if p.exists()),None);assert target and '/node_modules/.pnpm/' in str(target),(base,target)
 dst.parent.mkdir(parents=True,exist_ok=True);dst.symlink_to(target,target_is_directory=True)
 links.append({'path':str(dst.relative_to(v)),'target':str(target),'existing_locked_third_party_only':True})
result={'captured_at':datetime.now(timezone.utc).isoformat(),'scope':'M6.2-A genuine schema4 built review and maintenance closure, before M6.3 editing; not whole deployed historical runtime certification','entrypoints':entries,'files':closure,'dependencies':deps,'unresolved_repo_imports':unresolved,'existing_locked_external_packages':sorted(external),'owned_resolution_links':links,'third_party_not_copied_or_installed':True,'executed':False,'original_schema4_fixture_and_response_oracle':'pending one owned local extraction from this immutable closure','root_lock_sha256':source['pnpm-lock.yaml']}
manifest=v/'old-schema4-review-runtime-manifest.json';manifest.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'existing_before':len(files),'missing':len(missing),'before_manifest_sha256':sha(v/'before-manifest.json'),'old4_js_files':len(seen),'old4_total_files':len(closure),'old4_bytes':sum(x['bytes'] for x in closure),'old4_manifest_sha256':sha(manifest),'baseline_sha256':sha(v/'baseline.json')},indent=2))
