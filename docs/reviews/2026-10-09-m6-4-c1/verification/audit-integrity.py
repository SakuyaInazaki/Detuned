from pathlib import Path
import json,hashlib,subprocess,os,difflib
root=Path.cwd();v=root/'docs/reviews/2026-10-09-m6-4-c1/verification';base=json.loads((v/'baseline.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def check(mapping):return [{'path':p,'before_sha256':old,'current_sha256':sha(root/p)} for p,old in mapping.items() if sha(root/p)!=old]
manifest_paths=['author/catalog/freeze-manifest.json','author/web/freeze-manifest-v3.json','verification/independent-source-freeze-v5.json']
freezes=[];allowed=set()
for relative in manifest_paths:
 p=v.parent/relative;x=json.loads(p.read_text());rows=[]
 for entry in x['files']:
  path=entry['path'];allowed.add(path);rows.append({'path':path,'sha256':sha(root/path),'matches_freeze':sha(root/path)==entry['sha256']})
 freezes.append({'manifest':str(p.relative_to(root)),'sha256':sha(p),'files':rows,'all_match':all(r['matches_freeze'] for r in rows)})
product=[]
for folder in ['packages','modules','tests','scripts','.github']:
 for b,dirs,files in os.walk(root/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']];product.extend(Path(b)/n for n in files)
mutable={'AGENTS.md','README.md','docs/progress.md','docs/reviews/README.md','examples/README.md'}
product.extend(p for p in root.iterdir() if p.is_file() and p.name!='.DS_Store' and p.name not in mutable)
now={str(p.relative_to(root)):sha(p) for p in product}
source_changes=check(base['product_source_config_test_hashes']);source_new=[{'path':p,'sha256':h} for p,h in now.items() if p not in base['product_source_config_test_hashes']]
unapproved=[r for r in source_changes+source_new if r['path'] not in allowed]
protected={k:{'count':len(base[k]),'mismatches':check(base[k])} for k in ['protected_review_probe_log_evidence_hashes','sql_archive_before_hashes','schema_profile_before_hashes','current_document_hashes','mutable_status_document_hashes']}
tracked=set(subprocess.check_output(['git','ls-files','-z'],text=True).split('\0'))
dist=[p for folder in ['packages','modules'] for p in root.glob(folder+'/*/dist/**/*') if p.is_file()]
current_dist={str(p.relative_to(root)):sha(p) for p in dist};prior_dist={**base['tracked_build_artifact_hashes'],**base['untracked_build_artifact_hashes']}
changed_dist=[p for p,h in prior_dist.items() if current_dist.get(p)!=h];new_dist=[p for p in current_dist if p not in prior_dist]
(v/'final-dist-inventory.json').write_text(json.dumps({'scope':'packages AND modules dist','tracked':{p:h for p,h in current_dist.items() if p in tracked},'untracked':{p:h for p,h in current_dist.items() if p not in tracked},'changed_existing':changed_dist,'new':new_dist,'removed':[p for p in prior_dist if p not in current_dist],'build_receipt':'build-b3-first.json'},indent=2)+'\n')
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();lock=sha(root/'pnpm-lock.yaml')
result={'author_and_independent_freezes':freezes,'source_inventory':{'before_count':len(base['product_source_config_test_hashes']),'current_count':len(now),'changed_existing':source_changes,'new':source_new,'unapproved':unapproved},'protected':protected,'head':{'before':base['head'],'current':head,'unchanged':head==base['head']},'lock':{'before':base['product_source_config_test_hashes']['pnpm-lock.yaml'],'current':lock,'unchanged':lock==base['product_source_config_test_hashes']['pnpm-lock.yaml']},'dist':{'inventory':'final-dist-inventory.json','before_count':len(prior_dist),'current_count':len(current_dist),'changed_existing':len(changed_dist),'new':len(new_dist),'removed':[p for p in prior_dist if p not in current_dist],'disposition':'actual approved build changes, not protected as source'},'note':'Functional gate-time inventory. Metadata has not been updated or accepted here. Read-only historical review hashes are checked against baseline; no copying or mutation.'}
result['passed']=all(r['all_match'] for r in freezes) and not unapproved and all(not r['mismatches'] for r in protected.values()) and result['head']['unchanged'] and result['lock']['unchanged']
(v/'integrity.json').write_text(json.dumps(result,indent=2)+'\n')
(v/'final-freeze-verification.json').write_text(json.dumps({'all_match':all(r['all_match'] for r in freezes),'freezes':freezes},indent=2)+'\n')
print(json.dumps({'passed':result['passed'],'source_before':len(base['product_source_config_test_hashes']),'source_current':len(now),'changed_existing':len(source_changes),'new':len(source_new),'unapproved':unapproved,'protected':{k:{'count':r['count'],'mismatches':len(r['mismatches'])} for k,r in protected.items()},'dist':result['dist']}))
