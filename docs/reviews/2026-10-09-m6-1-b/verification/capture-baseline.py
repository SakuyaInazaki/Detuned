from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,sys,os
ROOT=Path(__file__).resolve().parents[4];OUT=Path(__file__).resolve().parent
mutable={'AGENTS.md','README.md','docs/progress.md','docs/reviews/README.md','examples/README.md'}
tracked=set(subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0'))
def h(paths):return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths)) if p.is_file()}
product=[]
for folder in ['packages','modules','tests','scripts','.github']:
 for base,dirs,files in os.walk(ROOT/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']];product.extend(Path(base)/name for name in files)
product.extend(p for p in ROOT.iterdir() if p.is_file() and p.name!='.DS_Store' and p.name not in mutable)
docs=[]
for folder in ['docs','integrations','templates','examples']:
 docs.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and 'reviews' not in p.parts and str(p.relative_to(ROOT)) not in mutable)
reviews=[p for p in (ROOT/'docs/reviews').rglob('*') if p.is_file() and '2026-10-09-m6-1-b' not in p.parts and str(p.relative_to(ROOT)) not in mutable]
dist=[p for folder in ['packages','modules'] for p in ROOT.glob(folder+'/*/dist/**/*') if p.is_file()]
env={**os.environ,'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null'}
data={'captured_at':datetime.now(timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'git_status':subprocess.check_output(['git','status','--short','--untracked-files=all'],cwd=ROOT,text=True),'product_source_config_test_hashes':h(product),'current_document_hashes':h(docs),'mutable_status_document_hashes':h(ROOT/p for p in mutable),'protected_review_probe_log_evidence_hashes':h(reviews),'sql_archive_before_hashes':h(list(ROOT.glob('packages/**/*.sql'))+list(ROOT.glob('tests/**/*.sql'))+list((ROOT/'archive').rglob('*'))),'schema_profile_before_hashes':h(p for p in product if 'storage-sqlite/src' in str(p) and 'schema' in p.name),'tracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) in tracked),'untracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) not in tracked),'dist_inventory_scope':'Both packages/*/dist and modules/*/dist, including canonical-json outputs; no package-only omission','runtime':{'node':subprocess.check_output(['node','--version'],cwd=ROOT,text=True,env=env).strip(),'pnpm':subprocess.check_output(['/opt/homebrew/bin/pnpm','--version'],cwd=ROOT,text=True,env=env).strip()},'environment':{'platform':sys.platform,'uname':list(os.uname())},'history_compatibility_basis':'M6.1-A accepted and sealed whole126 added to old8272 -> old8398. M6A717/108 is first716 plus one original backup timeout-case targeted pass, new18 first final core pass; current25 reused, not run. This baseline-only capture does not run gates, schema generation, migration, install, browser, models, VM or cleanup. Existing accepted JCS/oldHasher/v1 runtime/v1 SQL protected. M6B schema3 ordinary serve/init rejects legacy1/2 is new planned compatibility change, not a current or previously accepted behavior; explicit migrate modifies owned stage only. Current SQL/schema before inventory includes root-authorized future change candidates, not a claim that schema.sql cannot change in this package.'}
(OUT/'baseline.json').open('x').write(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(data['head'],{k:len(v) for k,v in data.items() if isinstance(v,dict)})
