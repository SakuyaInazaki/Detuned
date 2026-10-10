from pathlib import Path
import json,hashlib,shutil,datetime
root=Path(__file__).resolve().parents[4];v=Path(__file__).resolve().parent
base=json.loads((v/'baseline.json').read_text());c=json.loads((v/'before-candidates.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
known={}
for k in ['product_source_config_test_hashes','current_document_hashes','mutable_status_document_hashes','sql_archive_before_hashes','schema_profile_before_hashes']:known.update(base[k])
paths=sorted({p for k in ['exact_owner_existing_candidates','new_owner_candidates','metadata_candidates','configuration_candidates','immutable_references'] for p in c[k]})
rows=[]
for path in paths:
 p=root/path;item={'path':path}
 if not p.exists():
  item.update({'state':'missing','planned_new':path in c['new_owner_candidates']})
 else:
  assert p.is_file() and not p.is_symlink(),path
  digest=sha(p);assert known.get(path)==digest,(path,'fresh mismatch')
  to=v/'before-files'/path;to.parent.mkdir(parents=True,exist_ok=True);assert not to.exists();shutil.copy2(p,to);assert sha(to)==digest
  item.update({'state':'existing','sha256':digest,'bytes':p.stat().st_size,'before_path':str(to.relative_to(root)),'matches_fresh':True})
 rows.append(item)
manifest={'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline_sha256':sha(v/'baseline.json'),'timing':'fresh capture before any new source changes or runtime execution','files':rows,'existing_count':sum(x['state']=='existing' for x in rows),'missing_count':sum(x['state']=='missing' for x in rows),'ownership_is_not_expanded_by_protected_reference_capture':True}
(v/'before-manifest.json').open('x').write(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'existing':manifest['existing_count'],'missing':manifest['missing_count'],'missing_paths':[x['path'] for x in rows if x['state']=='missing'],'manifest_sha256':sha(v/'before-manifest.json')},indent=2))
