from pathlib import Path
import json,hashlib,subprocess,os,datetime
root=Path.cwd();v=Path(__file__).resolve().parent;base=json.loads((v/'baseline.json').read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
allowed=set();frozen=[]
for name in ['author/server/freeze-manifest-v4.json','author/client/freeze-manifest-v2.json']:
 p=v.parent/name;m=json.loads(p.read_text());bad=[]
 for row in m['files']:
  allowed.add(row['path'])
  if sha(root/row['path'])!=row['sha256']:bad.append(row['path'])
 frozen.append({'path':name,'sha256':sha(p),'files':len(m['files']),'mismatches':bad})
allowed.add('tests/contracts/m6-review-http-independent.test.ts')
current=set()
for folder in ['packages','modules','tests','scripts','.github']:
 for path,dirs,files in os.walk(root/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']]
  current.update(str((Path(path)/name).relative_to(root)) for name in files)
mutable={'AGENTS.md','README.md','docs/progress.md','docs/reviews/README.md','examples/README.md'}
current.update(p.name for p in root.iterdir() if p.is_file() and p.name!='.DS_Store' and p.name not in mutable)
changed=[p for p,h in base['product_source_config_test_hashes'].items() if not (root/p).is_file() or sha(root/p)!=h]
added=sorted(current-set(base['product_source_config_test_hashes']))
unauthorized=sorted((set(changed)|set(added))-allowed)
protected={}
for key in ['protected_review_probe_log_evidence_hashes','current_document_hashes','mutable_status_document_hashes','sql_archive_before_hashes','schema_profile_before_hashes']:
 bad=[p for p,h in base[key].items() if not (root/p).is_file() or sha(root/p)!=h]
 protected[key]={'checked':len(base[key]),'mismatches':bad}
prior={**base['tracked_build_artifact_hashes'],**base['untracked_build_artifact_hashes']};dist={str(p.relative_to(root)):sha(p) for folder in ['packages','modules'] for p in root.glob(folder+'/*/dist/**/*') if p.is_file()}
dist_changed=sorted(p for p in set(prior)|set(dist) if prior.get(p)!=dist.get(p))
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();lock=sha(root/'pnpm-lock.yaml');before=(v/'before-files/pnpm-lock.yaml').read_text();after=(root/'pnpm-lock.yaml').read_text()
addition='      \'@detuned/module-review\':\n        specifier: workspace:*\n        version: link:../../modules/review\n'
lock_exact=after.count(addition)==1 and after.replace(addition,'',1)==before
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':head,'head_unchanged':head==base['head'],'lock_sha256':lock,'lock_unchanged':lock==base['product_source_config_test_hashes']['pnpm-lock.yaml'],'lock_only_authorized_workspace_link':lock_exact,'freezes':frozen,'product_changed':sorted(changed),'product_added':added,'unauthorized_source_changes':unauthorized,'protected':protected,'JCS_Hasher_preserved':all(p not in changed for p in ['modules/review/src/canonical-json.ts','packages/core/src/ports/hasher.ts']),'dist_inventory_scope':'packages and modules; actual build changes inventoried','dist_changed':dist_changed,'dist_current_count':len(dist),'independent_source_sha256':sha(root/'tests/contracts/m6-review-http-independent.test.ts'),'execution':'Bounded file hashes and git read only; no tests/install/environment management'}
(v/'integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'changed':len(changed),'added':len(added),'unauthorized':unauthorized,'protected_bad':{k:len(x['mismatches']) for k,x in protected.items()},'freezes_bad':[x['mismatches'] for x in frozen],'head':result['head_unchanged'],'lock_only_authorized':lock_exact,'dist_changed':len(dist_changed)}))
