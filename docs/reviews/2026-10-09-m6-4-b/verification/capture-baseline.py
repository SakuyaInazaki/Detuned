from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,sys,os
ROOT=Path(__file__).resolve().parents[4];OUT=Path(__file__).resolve().parent
mutable={'AGENTS.md','README.md','docs/progress.md','docs/reviews/README.md','examples/README.md'}
tracked=set(subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0'))
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def h(paths):return {str(p.relative_to(ROOT)):digest(p) for p in sorted(set(paths)) if p.is_file()}
product=[]
for folder in ['packages','modules','tests','scripts','.github']:
 for base,dirs,files in os.walk(ROOT/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']];product.extend(Path(base)/name for name in files)
product.extend(p for p in ROOT.iterdir() if p.is_file() and p.name!='.DS_Store' and p.name not in mutable)
docs=[]
for folder in ['docs','integrations','templates','examples']:
 docs.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and 'reviews' not in p.parts and str(p.relative_to(ROOT)) not in mutable)
reviews=[p for p in (ROOT/'docs/reviews').rglob('*') if p.is_file() and '2026-10-09-m6-4-b' not in p.parts and str(p.relative_to(ROOT)) not in mutable]
dist=[p for folder in ['packages','modules'] for p in ROOT.glob(folder+'/*/dist/**/*') if p.is_file()]
env={**os.environ,'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null'}
data={'captured_at':datetime.now(timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'git_status':subprocess.check_output(['git','status','--short','--untracked-files=all'],cwd=ROOT,text=True),'product_source_config_test_hashes':h(product),'current_document_hashes':h(docs),'mutable_status_document_hashes':h(ROOT/p for p in mutable),'protected_review_probe_log_evidence_hashes':h(reviews),'sql_archive_before_hashes':h(list(ROOT.glob('packages/**/*.sql'))+list(ROOT.glob('tests/**/*.sql'))+list((ROOT/'archive').rglob('*'))),'schema_profile_before_hashes':h(p for p in product if 'storage-sqlite/src' in str(p) and 'schema' in p.name),'tracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) in tracked),'untracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) not in tracked),'dist_inventory_scope':'Both packages/*/dist and modules/*/dist, including canonical-json outputs; no package-only omission','runtime':{'node':subprocess.check_output(['node','--version'],cwd=ROOT,text=True,env=env).strip(),'pnpm':subprocess.check_output(['/opt/homebrew/bin/pnpm','--version'],cwd=ROOT,text=True,env=env).strip()},'environment':{'platform':sys.platform,'uname':list(os.uname())},'history_compatibility_basis':'M6.4-A whole sealed 288 regular files plus old9715 -> old10003. Accepted schema5 HTTP/shared-client twelve operations, 803/125 finite combination and current29 selection are referenced, not rerun. M6.4-B only approved CLI/canonical ninth review tool/Pi/MCP boundary: no SQL/schema/dependency change. Capture covers packages and modules dist. Previous internal server workspace lock/link is current baseline. No VM/Colima/daemon/browser/model/install/global environment action in this capture.'}
(OUT/'baseline.json').open('x').write(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(data['head'],{k:len(v) for k,v in data.items() if isinstance(v,dict)})
