from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,subprocess,os
ROOT=Path.cwd();v=ROOT/'docs/reviews/2026-10-09-m6-4-b/verification';b=json.loads((v/'baseline.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(mapping):return {'checked':len(mapping),'mismatches':[p for p,h in mapping.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]}
freezes=[];allowed=set()
for name in ['author/tools/freeze-manifest-v2.json','author/cli/freeze-manifest.json']:
 p=v.parent/name;d=json.loads(p.read_text());allowed.update(e['path'] for e in d['files']);freezes.append({'path':str(p.relative_to(ROOT)),'sha256':sha(p),'files':len(d['files']),'mismatches':[e['path'] for e in d['files'] if sha(ROOT/e['path'])!=e['sha256']]})
for name in ['catalog-adaptation-manifest.json','official-adaptation-manifest.json','supplement-core-five-before-manifest.json']:
 d=json.loads((v/name).read_text());allowed.update(e['path'] for e in d['files'])
allowed.add('tests/contracts/m6-review-tools-independent.test.ts')
source=b['product_source_config_test_hashes']; changed=[p for p,h in source.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]
current=[]
for folder in ['packages','modules','tests','scripts','.github']:
 for base,dirs,files in os.walk(ROOT/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']];current.extend(str((Path(base)/name).relative_to(ROOT)) for name in files)
mutable=set(b['mutable_status_document_hashes']);current.extend(p.name for p in ROOT.iterdir() if p.is_file() and p.name!='.DS_Store' and p.name not in mutable)
added=sorted(set(current)-set(source));removed=sorted(set(source)-set(current));unauthorized=sorted((set(changed)|set(added))-allowed)
protected={k:check(b[k]) for k in ['protected_review_probe_log_evidence_hashes','sql_archive_before_hashes','schema_profile_before_hashes','mutable_status_document_hashes']}
docchanged=[p for p,h in b['current_document_hashes'].items() if sha(ROOT/p)!=h];unauthdoc=sorted(set(docchanged)-allowed)
oldDist={**b['tracked_build_artifact_hashes'],**b['untracked_build_artifact_hashes']};nowDist={str(p.relative_to(ROOT)):sha(p) for folder in ['packages','modules'] for p in ROOT.glob(folder+'/*/dist/**/*') if p.is_file()}
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();r=subprocess.run(['git','diff','--check'],capture_output=True,text=True);(v/'diffcheck-final.stdout.txt').write_text(r.stdout);(v/'diffcheck-final.stderr.txt').write_text(r.stderr)
result={'checked_at':datetime.now(timezone.utc).isoformat(),'head':head,'head_unchanged':head==b['head'],'lock_sha256':sha(ROOT/'pnpm-lock.yaml'),'lock_unchanged':sha(ROOT/'pnpm-lock.yaml')==source['pnpm-lock.yaml'],'freezes':freezes,'source_before_count':len(source),'source_current_count':len(set(current)),'source_changed':changed,'source_added':added,'source_removed':removed,'unauthorized_source_changes':unauthorized,'document_changed':docchanged,'unauthorized_document_changes':unauthdoc,'protected':protected,'JCS_Hasher_preserved':all(sha(ROOT/p)==source[p] for p in ['modules/review/src/canonical-json.ts','packages/core/src/ports/hasher.ts']),'dist_inventory_scope':'packages and modules; final A2 build-v2, test-only corrections do not rebuild','dist_changed':sorted(p for p,h in oldDist.items() if nowDist.get(p)!=h),'dist_added':sorted(set(nowDist)-set(oldDist)),'dist_removed':sorted(set(oldDist)-set(nowDist)),'dist_current_hashes':nowDist,'diffcheck_exit_code':r.returncode,'readonly_official_launch_config':{p:sha(ROOT/p)==source[p] for p in ['scripts/integrations/dsh-runtime/launch.mjs','scripts/integrations/dsh-runtime/experiment.config.ts','scripts/integrations/dsh-runtime/pid-preload.cjs']},'stage':'after runtime/probes, before future authorized metadata; no finalization claim'}
(v/'integrity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['source_before_count','source_current_count','source_changed','source_added','unauthorized_source_changes','unauthorized_document_changes','head_unchanged','lock_unchanged','diffcheck_exit_code']})); print(json.dumps(protected))
assert not unauthorized and not unauthdoc and not any(x['mismatches'] for x in protected.values()) and not any(x['mismatches'] for x in freezes) and head==b['head'] and result['lock_unchanged'] and r.returncode==0
