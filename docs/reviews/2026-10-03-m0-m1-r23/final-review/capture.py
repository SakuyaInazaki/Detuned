from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[4]; OUT=Path(__file__).resolve().parent
base=json.loads((ROOT/'docs/reviews/2026-10-02-m0-m1-r22/baseline.json').read_text())
def hashes(paths):
 return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(paths)) if p.is_file()}
product=set(ROOT/p for p in base['product_and_test_file_hashes'])
for folder in ['packages','modules','tests','.github']:
 for p in (ROOT/folder).rglob('*'):
  if p.is_file() and 'dist' not in p.parts and 'node_modules' not in p.parts: product.add(p)
old=list((ROOT/'docs/reviews').glob('2026-*/**/*'))
old=[p for p in old if '2026-10-03-m0-m1-r23' not in p.parts and p.is_file()]
data={'captured_at':datetime.now(timezone.utc).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'git_status':subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True),'product_and_test_file_hashes':hashes(product),'historical_review_hashes':hashes(old),'frozen_hashes':hashes(list(ROOT.glob('packages/**/*.sql'))+list((ROOT/'archive').rglob('*'))),'build_artifact_hashes':hashes(ROOT.glob('packages/*/dist/**/*')),'runtime':{c:subprocess.check_output(c.split(),cwd=ROOT,text=True).strip() for c in ['node --version','pnpm --version','python3 --version']}}
(OUT/(sys.argv[1]+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(data['head'],len(product),len(old),data['runtime'])
