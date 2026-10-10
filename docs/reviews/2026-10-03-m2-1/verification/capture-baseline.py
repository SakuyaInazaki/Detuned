from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[4];OUT=Path(__file__).resolve().parent
tracked=set(subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0'))
def h(paths):return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths)) if p.is_file()}
product=[]
for folder in ['packages','modules','tests','.github']:
 product.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and 'node_modules' not in p.parts and 'dist' not in p.parts)
product.extend(p for p in ROOT.iterdir() if p.is_file() and p.name not in ['.DS_Store'])
docs=[]
for folder in ['docs','integrations','templates','examples']:
 docs.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and 'reviews' not in p.parts)
reviews=[p for p in (ROOT/'docs/reviews').rglob('*') if p.is_file() and '2026-10-03-m2-1' not in p.parts]
dist=[p for p in ROOT.glob('packages/*/dist/**/*') if p.is_file()]
data={'captured_at':datetime.now(timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'git_status':subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True),'product_source_config_test_hashes':h(product),'current_document_hashes':h(docs),'protected_review_probe_log_evidence_hashes':h(reviews),'frozen_sql_archive_hashes':h(list(ROOT.glob('packages/**/*.sql'))+list(ROOT.glob('tests/**/*.sql'))+list((ROOT/'archive').rglob('*'))),'tracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) in tracked),'untracked_build_artifact_hashes':h(p for p in dist if str(p.relative_to(ROOT)) not in tracked),'tracked_node_modules_path_count':sum('node_modules' in Path(t).parts for t in tracked),'runtime':{c:subprocess.check_output(c.split(),cwd=ROOT,text=True).strip() for c in ['node --version','pnpm --version']}}
(OUT/(sys.argv[1]+'.json' if len(sys.argv)>1 else 'baseline.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(data['head'],{k:len(v) for k,v in data.items() if isinstance(v,dict)})
