from pathlib import Path
import json,re,sys,urllib.parse
ROOT=Path(__file__).resolve().parents[4];OUT=Path(__file__).resolve().parent
base=json.loads((OUT/'stable-after-final.json').read_text());final=json.loads((OUT/'stable-after-documents.json').read_text());allowed=set(sys.argv[1:]);
protected=['product_source_config_test_hashes','protected_review_probe_log_evidence_hashes','frozen_sql_archive_hashes','schema_profile_hashes','tracked_build_artifact_hashes','untracked_build_artifact_hashes']
def diff(a,b):return {'added':sorted(b.keys()-a.keys()),'removed':sorted(a.keys()-b.keys()),'changed':sorted(k for k in a.keys()&b.keys() if a[k]!=b[k])}
deltas={k:diff(base[k],final[k]) for k in ['current_document_hashes','mutable_status_document_hashes']}
changed={p for v in deltas.values() for paths in v.values() for p in paths}
invalid=[];checked=[]
for rel in sorted(allowed):
 file=ROOT/rel
 assert file.is_file(),rel
 text=file.read_text()
 # Ordinary Markdown local references. Ignore web/plugin/app/deep links and in-document anchors.
 for target in re.findall(r'\]\(([^)]+)\)',text):
  target=target.strip().strip('<>')
  if target.startswith(('#','http:','https:','codex:','app:','plugin:','mailto:')):continue
  path=urllib.parse.unquote(target.split('#')[0]);path=re.sub(r':\d+$','',path)
  dest=Path(path) if path.startswith('/') else file.parent/path
  checked.append({'file':rel,'target':target,'exists':dest.exists()})
  if not dest.exists():invalid.append({'file':rel,'target':target})
result={'purpose':'read-only final document acceptance after author freeze; no product command rerun','head_unchanged':base['head']==final['head'],'allowed_document_files':sorted(allowed),'authorized_document_delta':deltas,'unexpected_document_changes':sorted(changed-allowed),'protected':{k:{'count':len(base[k]),'unchanged':base[k]==final[k],'delta':diff(base[k],final[k])} for k in protected},'local_links':{'checked':len(checked),'invalid':invalid},'scope':'local target existence; external websites and anchor semantics not fetched; historical material untouched','captures':['stable-after-final.json','stable-after-documents.json']}
(OUT/'finalization.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
assert result['head_unchanged'] and not result['unexpected_document_changes'] and not invalid
assert all(v['unchanged'] for v in result['protected'].values())
print('Finalization checks passed',len(checked),'local links')
