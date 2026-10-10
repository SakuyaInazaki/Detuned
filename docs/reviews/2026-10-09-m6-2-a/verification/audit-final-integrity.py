"""Read-only scoped final audit; invoke only after the serial runtime window ends."""
from pathlib import Path
import json,hashlib,subprocess,os,difflib
v=Path(__file__).resolve().parent;root=v.parents[3];b=json.loads((v/'baseline.json').read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
allowed=set()
for name in ['author/submission/freeze-manifest-v5.json','author/storage/freeze-manifest-v5.json']:
 m=json.loads((v.parent/name).read_text());allowed.update(f['path'] for f in m['files']);assert all(sha(root/f['path'])==f['sha256'] for f in m['files'])
allowed.update(['tests/integration/m6-review-submissions-independent.test.ts','tests/integration/m6-schema4-maintenance-independent.test.ts','tests/integration/m6-review-requests-independent.test.ts','tests/fixtures/historical-v3-review-history.json','tests/fixtures/historical-v3-review-history.README.md'])
current={}
for folder in ['packages','modules','tests','scripts','.github']:
 for base,dirs,files in os.walk(root/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']]
  for name in files:
   p=Path(base)/name;current[str(p.relative_to(root))]=sha(p)
for p in root.iterdir():
 if p.is_file() and p.name not in ['.DS_Store','AGENTS.md','README.md']:current[str(p.relative_to(root))]=sha(p)
old=b['product_source_config_test_hashes'];changed=[{'path':p,'before':old[p],'after':current.get(p),'authorized':p in allowed} for p in old if current.get(p)!=old[p]]
new=[{'path':p,'sha256':h,'authorized':p in allowed} for p,h in current.items() if p not in old]
old_reviews=b['protected_review_probe_log_evidence_hashes'];review_drift=[p for p,h in old_reviews.items() if not (root/p).is_file() or sha(root/p)!=h]
sql_drift=[p for p,h in b['sql_archive_before_hashes'].items() if sha(root/p)!=h]
document_drift=[p for key in ['current_document_hashes','mutable_status_document_hashes'] for p,h in b[key].items() if sha(root/p)!=h]
dist={str(p.relative_to(root)):sha(p) for folder in ['packages','modules'] for p in root.glob(folder+'/*/dist/**/*') if p.is_file()}
old_dist={**b['tracked_build_artifact_hashes'],**b['untracked_build_artifact_hashes']}
result={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'head_unchanged':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==b['head'],'old_review_files':len(old_reviews),'old_review_drift':review_drift,'changed_existing_source':changed,'new_source':new,'source_unauthorized':[x['path'] for x in changed+new if not x['authorized']],'sql_archive_drift':sql_drift,'sql_drift_permitted_current_schema_only':sql_drift==['packages/storage-sqlite/src/schema.sql'],'historical3_sql_equals_exact_original3':sha(root/'tests/fixtures/historical-v3-schema.sql')==b['sql_archive_before_hashes']['packages/storage-sqlite/src/schema.sql'],'lock_unchanged':sha(root/'pnpm-lock.yaml')==old['pnpm-lock.yaml'],'current_documents_changed_after_accepted_metadata':document_drift,'dist_scope':'packages and modules; actual full build changes, not protected unchanged artifacts','dist_changed':sum(1 for p,h in old_dist.items() if dist.get(p)!=h),'dist_added':len(set(dist)-set(old_dist)),'dist_removed':sorted(set(old_dist)-set(dist))}
(v/'integrity-final.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['head_unchanged','old_review_files','old_review_drift','source_unauthorized','sql_archive_drift','historical3_sql_equals_exact_original3','lock_unchanged','dist_changed','dist_added','dist_removed']}))
