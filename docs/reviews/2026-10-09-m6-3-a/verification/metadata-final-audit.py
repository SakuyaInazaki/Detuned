from pathlib import Path
import json,hashlib,subprocess,re,datetime,sys,difflib
from urllib.parse import unquote
root=Path.cwd();v=root/'docs/reviews/2026-10-09-m6-3-a/verification';pkg=v.parent
manifest=pkg/sys.argv[1];m=json.loads(manifest.read_text());base=json.loads((v/'baseline.json').read_text())
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def mismatches(rows):
 return [a['path'] for a in rows if not (root/a['path']).is_file() or sha(root/a['path'])!=a['sha256']]
metadata_bad=mismatches(m['files']);planning_bad=mismatches(m['planning'])
bm={a['original_path']:a for a in json.loads((v/'before-manifest.json').read_text())['files']};diff=[];docs=[]
for a in m['files']:
 p=root/a['path'];docs.append(p)
 if a['path'] in bm:
  b=v/bm[a['path']]['snapshot_path'];diff.extend(difflib.unified_diff(b.read_text().splitlines(True),p.read_text().splitlines(True),fromfile='fresh/'+a['path'],tofile='current/'+a['path'],n=2))
 else:diff.append('\nNEW REVIEW DOCUMENT '+a['path']+'\n'+p.read_text()+'\n')
(v/'metadata-final-reviewed.diff').write_text(''.join(diff))
links=[];link_count=0
for p in docs+[v/'independent-report.md',v/'acceptance.md',pkg/'planning/m6-4-a-task.md']:
 text=p.read_text()
 for match in re.finditer(r'!?\[[^\]]*\]\(([^)]*)\)',text):
  target=match.group(1).strip()
  if target.startswith('<'):target=target[1:target.find('>')]
  else:target=target.split(' ')[0]
  if not target or target.startswith('#') or re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',target):continue
  target=unquote(target.split('#',1)[0].split('?',1)[0]);link_count+=1
  q=Path(target) if target.startswith('/') else p.parent/target
  if not q.exists():links.append({'source':str(p.relative_to(root)),'target':target})
json_errors=[];json_count=0
for p in pkg.rglob('*.json'):
 if any(x in p.relative_to(pkg).parts for x in ['before-files','old-schema4-review-runtime','node_modules']):continue
 json_count+=1
 try:json.loads(p.read_text())
 except Exception as e:json_errors.append({'path':str(p.relative_to(root)),'error':type(e).__name__})
freeze=[]
for name in ['author/finalization/freeze-manifest-v2.json','author/storage/freeze-manifest-v2.json']:
 p=pkg/name;j=json.loads(p.read_text());freeze.append({'path':name,'sha256':sha(p),'files':len(j['files']),'mismatches':mismatches(j['files'])})
dm=json.loads((v/'independent-final-source-manifest.json').read_text());drows=dm['files'];d_bad=mismatches(drows)
protected={}
for k in ['protected_review_probe_log_evidence_hashes','sql_archive_before_hashes']:
 rows=base[k]
 if k=='sql_archive_before_hashes':rows={p:h for p,h in rows.items() if p!='packages/storage-sqlite/src/schema.sql'}
 bad=[p for p,h in rows.items() if not (root/p).is_file() or sha(root/p)!=h];protected[k]={'checked':len(rows),'mismatches':bad}
allowed_docs={a['path'] for a in m['files']}
for k in ['current_document_hashes','mutable_status_document_hashes']:
 rows=base[k];bad=[p for p,h in rows.items() if p not in allowed_docs and (not (root/p).is_file() or sha(root/p)!=h)];protected[k]={'checked':len(rows),'authorized_current_deltas':sorted(set(rows)&allowed_docs),'unexpected_mismatches':bad}
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();lock=sha(root/'pnpm-lock.yaml');diffcheck=subprocess.run(['git','diff','--check'],capture_output=True,text=True)
old=(v/'before-files/packages/storage-sqlite/src/schema.ts').read_text();new=(root/'packages/storage-sqlite/src/schema.ts').read_text();profiles={}
for n in [1,2,3,4]:
 pattern=rf'export const V{n}_SCHEMA_TABLES: Record<string, TableRequirement> = (\{{[\s\S]*?\n\}});';profiles[str(n)]=re.search(pattern,old).group(1)==re.search(pattern,new).group(1)
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'approved 17 metadata paths plus their current package links/JSON; source freezes and historical protection; no runtime gates','metadata_manifest':str(manifest.relative_to(root)),'metadata_manifest_sha256':sha(manifest),'metadata_files':len(m['files']),'metadata_mismatches':metadata_bad,'planning_mismatches':planning_bad,'local_links_checked':link_count,'broken_links':links,'current_package_json_checked':json_count,'json_errors':json_errors,'source_freezes':freeze,'D_final_source_mismatches':d_bad,'protected':protected,'historical_profiles_1_to_4_exact':profiles,'head_unchanged':head==base['head'],'lock_unchanged':lock==base['product_source_config_test_hashes']['pnpm-lock.yaml'],'diffcheck_exit':diffcheck.returncode,'diffcheck_stdout':diffcheck.stdout,'diffcheck_stderr':diffcheck.stderr,'status':'audited_pending_root_final_acceptance_not_sealed'}
(v/'metadata-final-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
