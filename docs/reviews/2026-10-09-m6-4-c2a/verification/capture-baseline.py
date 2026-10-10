from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,os,shutil
root=Path.cwd();out=root/'docs/reviews/2026-10-09-m6-4-c2a/verification';prior=root/'docs/reviews/2026-10-09-m6-4-c1';old=json.loads((prior/'verification/baseline.json').read_text());integrity=json.loads((prior/'verification/integrity.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def hashes(paths):return {str(p.relative_to(root)):sha(p) for p in sorted(set(paths)) if p.is_file()}
task=prior/'planning/m6-4-c2a-task.md';ownerpath=prior/'planning/m6-4-c2a-owner-candidates.json';assert sha(task)=='f5f6f5d56248112fb7870b02dcdda471cb209a8b01167412c8ddebb32ef53ee2';assert sha(ownerpath)=='5c165eddb4d3890a3a17ab5302dfd43f11c8d7f76a0f70338c5db9091eaeed46';owner=json.loads(ownerpath.read_text());owner['source_ownership_path']=str(ownerpath.relative_to(root));owner['source_ownership_sha256']=sha(ownerpath);owner['root_supplement']={'D_existing':'tests/integration/m2-knowledge-views.test.ts','scope':'Only V01 default enabled/no round: formal flags not_enabled -> not_requested and formal_review:null. Preserve claim count/author_report/fixed relation provenance/all other assertions. Apply only after formal dispatch.','source_planning_unchanged':True};owner['D']['existing'].append('tests/integration/m2-knowledge-views.test.ts')
(out/'ownership.json').write_text(json.dumps(owner,indent=2)+'\n')
existing=[p for who in ['A','B','D'] for p in owner[who].get('existing',[])];new=[p for who in ['A','B','D'] for p in owner[who].get('new',[])];assert len(existing)==len(set(existing))==16 and len(new)==len(set(new))==6
assert all((root/p).is_file() for p in existing);assert all(not (root/p).exists() for p in new)
mutable={'AGENTS.md','README.md','docs/progress.md','docs/reviews/README.md','examples/README.md'}
product=[]
for folder in ['packages','modules','tests','scripts','.github']:
 for b,dirs,files in os.walk(root/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']];product.extend(Path(b)/n for n in files)
product.extend(p for p in root.iterdir() if p.is_file() and p.name!='.DS_Store' and p.name not in mutable)
source=hashes(product);expected_source=dict(old['product_source_config_test_hashes'])
for row in integrity['source_inventory']['changed_existing']:expected_source[row['path']]=row['current_sha256']
for row in integrity['source_inventory']['new']:expected_source[row['path']]=row['sha256']
assert source==expected_source and len(source)==381
currentdocs=[]
for folder in ['docs','integrations','templates','examples']:
 currentdocs.extend(p for p in (root/folder).rglob('*') if p.is_file() and 'reviews' not in p.parts and str(p.relative_to(root)) not in mutable)
sealed=json.loads((prior/'verification/finalization-manifest.json').read_text());assert sealed['entries_count']==326 and sealed['whole_regular_file_count_including_self']==327
assert sha(prior/'verification/finalization-manifest.json')=='77471ebeeb4c554a8ed463d2569ac42fabd3b323c24f0883511dddbfe20e89d6'
protected=dict(old['protected_review_probe_log_evidence_hashes']);protected.update({str((prior/e['path']).relative_to(root)):e['sha256'] for e in sealed['files']});protected[str((prior/'verification/finalization-manifest.json').relative_to(root))]=sha(prior/'verification/finalization-manifest.json');assert len(protected)==10623
actual_review_paths={str(p.relative_to(root)) for p in (root/'docs/reviews').rglob('*') if p.is_file() and '2026-10-09-m6-4-c2a' not in p.parts and str(p.relative_to(root)) not in mutable};assert actual_review_paths==set(protected)
# Protected old SHA inventories come from the accepted C1 full audit and freshly verified sealed manifest, not another historical content scan.
dist=[p for folder in ['packages','modules'] for p in root.glob(folder+'/*/dist/**/*') if p.is_file()];dhash=hashes(dist);di=json.loads((prior/'verification/final-dist-inventory.json').read_text());assert dhash=={**di['tracked'],**di['untracked']} and len(dhash)==523
tracked=set(subprocess.check_output(['git','ls-files','-z'],text=True).split('\0'));head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert head==old['head'] and source['pnpm-lock.yaml']==old['product_source_config_test_hashes']['pnpm-lock.yaml']
sql=hashes(list(root.glob('packages/**/*.sql'))+list(root.glob('tests/**/*.sql'))+list((root/'archive').rglob('*')));profiles=hashes(p for p in product if 'storage-sqlite/src' in str(p) and 'schema' in p.name);assert sql==old['sql_archive_before_hashes'] and profiles==old['schema_profile_before_hashes']
baseline={'captured_at':datetime.now(timezone.utc).isoformat(),'head':head,'git_status':subprocess.check_output(['git','status','--short','--untracked-files=all'],text=True),'product_source_config_test_hashes':source,'current_document_hashes':hashes(currentdocs),'mutable_status_document_hashes':hashes(root/p for p in mutable),'protected_review_probe_log_evidence_hashes':protected,'sql_archive_before_hashes':sql,'schema_profile_before_hashes':profiles,'tracked_build_artifact_hashes':{p:h for p,h in dhash.items() if p in tracked},'untracked_build_artifact_hashes':{p:h for p,h in dhash.items() if p not in tracked},'dist_inventory_scope':'Both packages and modules, exact C1 accepted final523 inventory, no runtime rebuild','runtime':old['runtime'],'environment':old['environment'],'protected_inventory_basis':{'old10296':'C1 accepted full metadata-audit.json protected SHA inventory; frozen writers and final seal; reused hashes, only bounded path membership reconciliation, not repeated old content scan','C1whole327':'C1 finalization-manifest326 entries plus its own SHA; full entries verified at seal','source381_dist523':'Live read-only SHA capture exactly matches accepted C1 integrity/final inventory'},'task_path':str(task.relative_to(root)),'task_sha256':sha(task),'source_ownership_path':str(ownerpath.relative_to(root)),'source_ownership_sha256':sha(ownerpath),'local_ownership':'verification/ownership.json','history_compatibility_basis':'C1 accepted826/131 and browser28/current29 referenced as prior evidence, not rerun. C2A frozen knowledge formal status/findings scope, no SQL/schema/deps/lock/FTS/M7/hosts. Extra D V01 adapter authorized but not implemented.'}
(out/'baseline.json').open('x').write(json.dumps(baseline,ensure_ascii=False,indent=2)+'\n')
files=[]
for path in existing:
 src=root/path;dest=out/'before-files'/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);assert sha(dest)==source[path];files.append({'path':path,'state':'existing','sha256':sha(src),'bytes':src.stat().st_size,'before_path':str(dest.relative_to(root)),'matches_fresh':True})
for path in new:files.append({'path':path,'state':'missing','before_path':None,'sha256':None})
manifest={'captured_at':datetime.now(timezone.utc).isoformat(),'baseline_sha256':sha(out/'baseline.json'),'task_path':str(task.relative_to(root)),'task_sha256':sha(task),'source_ownership_path':str(ownerpath.relative_to(root)),'source_ownership_sha256':sha(ownerpath),'local_supplemented_ownership_path':str((out/'ownership.json').relative_to(root)),'local_supplemented_ownership_sha256':sha(out/'ownership.json'),'timing':'New C2A fresh before any C2A product/source edits. Existing16 only copied; new6 missing no placeholders.','files':files,'existing_count':16,'missing_count':6,'no_global_metadata_copies':'Global docs inventoried by SHA only; future metadata capture must be explicit when needed.'}
(out/'before-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'source':len(source),'docs':len(baseline['current_document_hashes']),'mutable':len(mutable),'old_review':len(protected),'sql_archive':len(sql),'profiles':len(profiles),'dist':len(dhash),'existing':16,'missing':6,'baseline_sha256':sha(out/'baseline.json'),'before_manifest_sha256':sha(out/'before-manifest.json'),'ownership_sha256':sha(out/'ownership.json')}))
