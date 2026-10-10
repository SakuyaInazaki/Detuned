from pathlib import Path
import hashlib,json,re,urllib.parse,subprocess,datetime,os
root=Path.cwd();v=Path(__file__).resolve().parent;base=json.loads((v/'baseline.json').read_text());functional=json.loads((v/'integrity.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
manifest_path=v.parent/'author/documentation/freeze-manifest-v3.json';manifest=json.loads(manifest_path.read_text());rows=manifest['files'];allowed={r['path'] for r in rows};bad_manifest=[r['path'] for r in rows if sha(root/r['path'])!=r['sha256']]
link_errors=[];link_count=0
for r in rows:
 p=root/r['path']
 if p.suffix!='.md':continue
 for target in re.findall(r'!?\[[^\]]*\]\(([^\n]+?)\)',p.read_text()):
  target=target.strip().split(' "')[0].strip('<>');target=urllib.parse.unquote(target.split('#',1)[0])
  if not target or re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',target):continue
  link_count+=1;q=root/target.lstrip('/') if target.startswith('/') else p.parent/target
  if not q.exists():link_errors.append({'path':r['path'],'target':target})
json_errors=[];json_count=0
for p in v.parent.rglob('*.json'):
 try:json.loads(p.read_text());json_count+=1
 except Exception as e:json_errors.append({'path':str(p.relative_to(root)),'error_type':type(e).__name__})
source_bad=[]
for freeze in functional['freezes']:
 m=json.loads((v.parent/freeze['path']).read_text())
 for r in m['files']:
  if sha(root/r['path'])!=r['sha256']:source_bad.append(r['path'])
independent=json.loads((v/'independent-final-freeze.json').read_text());source_bad.extend([independent['source']] if sha(root/independent['source'])!=independent['sha256'] else [])
allowed_source=set(functional['product_changed'])|set(functional['product_added'])
changed_source={p for p,h in base['product_source_config_test_hashes'].items() if not (root/p).is_file() or sha(root/p)!=h}
current_source=set()
for folder in ['packages','modules','tests','scripts','.github']:
 for path,dirs,files in os.walk(root/folder):
  dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git']]
  current_source.update(str((Path(path)/name).relative_to(root)) for name in files)
mutable={'AGENTS.md','README.md','docs/progress.md','docs/reviews/README.md','examples/README.md'}
current_source.update(p.name for p in root.iterdir() if p.is_file() and p.name!='.DS_Store' and p.name not in mutable)
source_delta=changed_source|(current_source-set(base['product_source_config_test_hashes']))
unauthorized_source=sorted(source_delta-allowed_source)
protected={}
for key in ['protected_review_probe_log_evidence_hashes','sql_archive_before_hashes','schema_profile_before_hashes']:
 protected[key]={'checked':len(base[key]),'mismatches':[p for p,h in base[key].items() if not (root/p).is_file() or sha(root/p)!=h]}
docs={**base['current_document_hashes'],**base['mutable_status_document_hashes']};changed_docs=[p for p,h in docs.items() if not (root/p).is_file() or sha(root/p)!=h];unexpected_docs=sorted(set(changed_docs)-allowed)
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();lock=sha(root/'pnpm-lock.yaml');diff=subprocess.run(['git','diff','--check'],capture_output=True,text=True)
planning={p:{'sha256':sha(v.parent/p)} for p in ['planning/m6-4-b-task.md','planning/m6-4-b/file-ownership.json']}
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'doc_manifest':str(manifest_path.relative_to(root)),'manifest_sha256':sha(manifest_path),'doc_count':len(rows),'doc_manifest_mismatches':bad_manifest,'relative_links_checked':link_count,'link_errors':link_errors,'json_files_checked':json_count,'json_errors':json_errors,'source_freeze_mismatches':source_bad,'unauthorized_source_changes':unauthorized_source,'source_delta_same_as_functional_acceptance':source_delta==allowed_source,'JCS_Hasher_preserved':functional['JCS_Hasher_preserved'] and not any(p in source_delta for p in ['modules/review/src/canonical-json.ts','packages/core/src/ports/hasher.ts']),'protected':protected,'changed_current_docs':changed_docs,'unexpected_current_doc_changes':unexpected_docs,'head_unchanged':head==base['head'],'approved_lock_unchanged_since_functional_acceptance':lock==functional['lock_sha256'],'runtime_commands_since_functional_acceptance':[],'dist_scope_note':'No runtime or build since functional acceptance; prior integrity records actual packages/modules build delta. This metadata audit does not reassert unmeasured dist equality.','diffcheck':{'exit_code':diff.returncode,'stdout':diff.stdout,'stderr':diff.stderr},'final_planning':planning,'scope':'Only current changed doc links/JSON/manifest and final source/old evidence protection; no runtime gates/environment action'}
(v/'metadata-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['doc_count','doc_manifest_mismatches','relative_links_checked','link_errors','json_files_checked','json_errors','source_freeze_mismatches','unexpected_current_doc_changes','head_unchanged','approved_lock_unchanged_since_functional_acceptance','diffcheck']}))
