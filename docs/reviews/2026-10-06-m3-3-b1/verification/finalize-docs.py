from pathlib import Path
from datetime import datetime,timezone
import json,re,hashlib
p=Path(__file__).resolve().parent;root=p.parents[3];before=json.loads((p/'final-after-gates.json').read_text());after=json.loads((p/'finalization-after-docs.json').read_text())
protected=['product_source_config_test_hashes','protected_review_probe_log_evidence_hashes','frozen_sql_archive_hashes','schema_profile_hashes','tracked_build_artifact_hashes','untracked_build_artifact_hashes']
def delta(a,b):return {'added':sorted(b.keys()-a.keys()),'removed':sorted(a.keys()-b.keys()),'changed':sorted(k for k in a.keys()&b.keys() if a[k]!=b[k])}
allowed={'README.md','docs/progress.md','docs/reviews/README.md','docs/09-validation.md','examples/README.md','docs/reviews/2026-10-06-m3-3-b1/README.md'}
docdelta={k:delta(before[k],after[k]) for k in ['current_document_hashes','mutable_status_document_hashes']}
unknown=sorted({x for d in docdelta.values() for x in d['added']+d['changed']+d['removed']}-allowed)
baseline=json.loads((p/'baseline.json').read_text());scan=set(root/f for f in allowed)
for key in ['current_document_hashes','mutable_status_document_hashes']:
 for f in after[key]:
  if after[key].get(f)!=baseline[key].get(f) and f.endswith('.md'):scan.add(root/f)
scan.update(p.parent.rglob('*.md'));missing=[];links=0;whitespace=[]
for f in sorted(scan):
 text=f.read_text()
 if any(line.rstrip()!=line for line in text.splitlines()):whitespace.append(str(f.relative_to(root)))
 for m in re.finditer(r'\[[^\]\n]+\]\(([^)\n]+)\)',text):
  target=m.group(1).strip().strip('<>')
  if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',target) or target.startswith('#'):continue
  target=target.split('#',1)[0].split('?',1)[0]
  if not target:continue
  target=re.sub(r':\d+$','',target);links+=1
  if not (f.parent/target).exists():missing.append({'document':str(f.relative_to(root)),'target':target})
state={f:{'contains_current_414': '414' in (root/f).read_text(),'contains_current_48':'48' in (root/f).read_text(),'contains_accepted_date':'2026-10-07' in (root/f).read_text(),'pending_parent_phrase':'待父验收' in (root/f).read_text()} for f in sorted(allowed)}
immutable={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in p.parent.rglob('*') if f.is_file() and (f.suffix in ['.log','.txt'] or f.name in ['baseline.json','frozen-before-build.json','final-gates-window.json','final-after-gates.json'])}
result={'finalized_at':datetime.now(timezone.utc).isoformat(),'review_date':'2026-10-07','package_started':'2026-10-06','status':'parent accepted; doc-only closeout passed','head_unchanged':before['head']==after['head'],'protected_after_final_gates':{k:{'count':len(before[k]),'unchanged':before[k]==after[k]} for k in protected},'authorized_document_delta':docdelta,'unowned_document_delta':unknown,'package_changes':'Parent-approved accepted status and schema-defect attribution; B packageREADME navigation/next plan; A next-task status only, no future implementation. Original observed logs/captures preserved.','local_links':{'documents_scanned':len(scan),'local_targets_checked':links,'missing':missing,'trailing_whitespace_documents':whitespace},'state_wording':state,'immutable_new_log_capture_hashes':immutable,'no_further_product_check_runs':True,'not_run':['additional build/typecheck/lint/suite/current29','additional40MiB probe','600s load','models','import']}
(p/'finalization.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
assert result['head_unchanged'] and not unknown and not missing and not whitespace
assert all(v['unchanged'] for v in result['protected_after_final_gates'].values())
assert all(not v['pending_parent_phrase'] for v in state.values())
print('Doc-only finalization passed: documents',len(scan),'local targets',links,'oldreview3623/source181/SQL4/schema2/dist208+92 unchanged after final gates')
