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
reviews=[p for p in (ROOT/'docs/reviews').rglob('*') if p.is_file() and '2026-10-09-m5-1-d2' not in p.parts and str(p.relative_to(ROOT)) not in mutable]
dist=[p for p in ROOT.glob('packages/*/dist/**/*') if p.is_file()]
data={'captured_at':datetime.now(timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'git_status':subprocess.check_output(['git','status','--short','--untracked-files=all'],cwd=ROOT,text=True),'product_source_config_test_hashes':h(product),'current_document_hashes':h(docs),'mutable_status_document_hashes':h(ROOT/p for p in mutable),'protected_review_probe_log_evidence_hashes':h(reviews),'frozen_sql_archive_hashes':h(list(ROOT.glob('packages/**/*.sql'))+list(ROOT.glob('tests/**/*.sql'))+list((ROOT/'archive').rglob('*'))),'schema_profile_hashes':h(p for p in product if 'storage-sqlite/src' in str(p) and 'schema' in p.name),'tracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) in tracked),'untracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) not in tracked),'runtime':{c:subprocess.check_output(c.split(),cwd=ROOT,text=True).strip() for c in ['node --version','pnpm --version']},'environment':{'platform':sys.platform,'uname':list(os.uname())},'history_compatibility_basis':'Previous accepted M5.1-D.1 fully protected including independent report/five real SQLite loopback HTTP groups, root four gates first-pass/core684 tests101 files/current29 actually29, all cleanup/complete outputs/warnings, A7/B8 source freeze and A17 metadata freeze/ADR058, parent acceptance, exact original thirteen before files and afterwards-hash-approved three-diagnostic reader supplement, finalization and all last D.2 taskbook/UI planning. This fresh was captured after complete D.1 finalization, before D.2 implementation. D.2 starts UI/browser-test-only, no lower source/DDL/deps changes. Eleven finite current lock/Web/browser exact-before copies are archived, not executed; new spec is missing and no UI module placeholder is invented.'}
name=sys.argv[1] if len(sys.argv)>1 else 'baseline.json';(OUT/name).open('x').write(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(data['head'],{k:len(v) for k,v in data.items() if isinstance(v,dict)})
