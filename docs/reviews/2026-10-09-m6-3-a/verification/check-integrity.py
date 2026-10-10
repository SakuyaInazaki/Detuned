from pathlib import Path
import json,hashlib,subprocess,os,re,datetime
root=Path.cwd();v=root/'docs/reviews/2026-10-09-m6-3-a/verification';base=json.loads((v/'baseline.json').read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
allowed=set();frozen=[]
for name in ['author/finalization/freeze-manifest-v2.json','author/storage/freeze-manifest-v2.json']:
 p=v.parent/name;m=json.loads(p.read_text());bad=[]
 for row in m['files']:
  allowed.add(row['path'])
  if sha(root/row['path'])!=row['sha256']:bad.append(row['path'])
 frozen.append({'path':name,'sha256':sha(p),'files':len(m['files']),'mismatches':bad})
allowed.update(['tests/integration/m6-review-finalization-independent.test.ts','tests/integration/m6-schema5-maintenance-independent.test.ts','tests/fixtures/historical-v4-review-history.json','tests/fixtures/historical-v4-review-history.README.md','tests/integration/m6-schema4-maintenance-independent.test.ts'])
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
for key in ['protected_review_probe_log_evidence_hashes','current_document_hashes','mutable_status_document_hashes']:
 bad=[p for p,h in base[key].items() if not (root/p).is_file() or sha(root/p)!=h]
 protected[key]={'checked':len(base[key]),'mismatches':bad}
sql_bad=[p for p,h in base['sql_archive_before_hashes'].items() if p!='packages/storage-sqlite/src/schema.sql' and (not (root/p).is_file() or sha(root/p)!=h)]
protected['old_sql_archive']={'checked':len(base['sql_archive_before_hashes'])-1,'mismatches':sql_bad}
old=(v/'before-files/packages/storage-sqlite/src/schema.ts').read_text();new=(root/'packages/storage-sqlite/src/schema.ts').read_text();profiles={}
for n in [1,2,3,4]:
 pattern=rf'export const V{n}_SCHEMA_TABLES: Record<string, TableRequirement> = (\{{[\s\S]*?\n\}});'
 before=re.search(pattern,old).group(1);after=re.search(pattern,new).group(1)
 profiles[str(n)]={'byte_exact':before==after,'before_sha256':hashlib.sha256(before.encode()).hexdigest(),'after_sha256':hashlib.sha256(after.encode()).hexdigest()}
tracked=set(subprocess.check_output(['git','ls-files','-z'],text=True).split('\0'));dist={str(p.relative_to(root)):sha(p) for folder in ['packages','modules'] for p in root.glob(folder+'/*/dist/**/*') if p.is_file()}
prior={**base['tracked_build_artifact_hashes'],**base['untracked_build_artifact_hashes']};dist_changed=sorted(p for p in set(prior)|set(dist) if prior.get(p)!=dist.get(p))
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();lock=sha(root/'pnpm-lock.yaml')
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':head,'head_unchanged':head==base['head'],'lock_sha256':lock,'lock_unchanged':lock==base['product_source_config_test_hashes']['pnpm-lock.yaml'],'freezes':frozen,'product_changed':sorted(changed),'product_added':added,'unauthorized_source_changes':unauthorized,'protected':protected,'historical_profiles':profiles,'current5_sql_generated_profile_authorized':True,'dist_inventory_scope':'packages and modules; expected build changes explicitly inventoried','dist_changed':dist_changed,'dist_current_count':len(dist),'execution':'No tests, environment management or installation; bounded file hashes and git read only'}
(v/'integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'changed':len(changed),'added':len(added),'unauthorized':unauthorized,'protected_bad':{k:len(x['mismatches']) for k,x in protected.items()},'freezes_bad':[x['mismatches'] for x in frozen],'profiles_exact':all(x['byte_exact'] for x in profiles.values()),'head':result['head_unchanged'],'lock':result['lock_unchanged'],'dist_changed':len(dist_changed)}))
