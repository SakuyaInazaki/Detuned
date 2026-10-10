from pathlib import Path
import json,hashlib
p=Path(__file__).resolve().parent;root=p.parents[3]
base=json.loads((p/'baseline.json').read_text());before=json.loads((p/'final-gates-window.json').read_text());after=json.loads((p/'final-after-gates.json').read_text())
def delta(a,b):return {'added':sorted(b.keys()-a.keys()),'removed':sorted(a.keys()-b.keys()),'changed':sorted(k for k in a.keys()&b.keys() if a[k]!=b[k])}
protected=['protected_review_probe_log_evidence_hashes','frozen_sql_archive_hashes','schema_profile_hashes']
source='product_source_config_test_hashes';docs='current_document_hashes';mutable='mutable_status_document_hashes'
owned={};author={}
for name in ['storage','transport']:
 manifest=json.loads((p.parent/'implementation'/name/'freeze-manifest.json').read_text());owned.update(manifest);author[name]={'count':len(manifest),'hashes_match':all(hashlib.sha256((root/k).read_bytes()).hexdigest()==v for k,v in manifest.items())}
owned.update({k:after[source][k] for k in ['tests/integration/m3-export-independent.test.ts','tests/helpers/m3-export-worker.mjs']})
scoped=delta(base[source],after[source]);unknown=sorted(set(scoped['added']+scoped['changed']+scoped['removed'])-owned.keys())
docdelta=delta(before[docs],after[docs]);docallowed=not docdelta['added'] and not docdelta['removed'] and set(docdelta['changed'])<= {'examples/space-export.md'}
result={'head_unchanged':base['head']==after['head'],'baseline_head':base['head'],'protected':{k:{'count':len(base[k]),'unchanged':base[k]==after[k],'delta':delta(base[k],after[k])} for k in protected},'final_execution_window':{source:{'count':len(before[source]),'unchanged':before[source]==after[source],'delta':delta(before[source],after[source])},docs:{'count':len(before[docs]),'unchanged':before[docs]==after[docs],'delta':docdelta,'authorized_example_delta_only':docallowed},mutable:{'count':len(before[mutable]),'unchanged':before[mutable]==after[mutable],'delta':delta(before[mutable],after[mutable])}},'author_freezes':author,'baseline_to_final_scope_changes':{k:delta(base[k],after[k]) for k in [source,docs,mutable]},'unowned_source_delta':unknown,'normal_build_changes':{k:delta(base[k],after[k]) for k in ['tracked_build_artifact_hashes','untracked_build_artifact_hashes']},'historical_fixture_assets_unchanged':all(after[source].get(k)==v for k,v in base[source].items() if k.startswith('tests/fixtures/')),'notes':'Initial source window changed only by documented C fixture repairs and parent-approved resolution PK keyset fix; final gates source window is stable. Current example delta is separately authorized; no claim of whole task snapshot immutability.'}
(p/'integrity.json').write_text(json.dumps(result,indent=2)+'\n')
assert result['head_unchanged'] and result['historical_fixture_assets_unchanged'] and not unknown
assert all(v['unchanged'] for v in result['protected'].values())
assert before[source]==after[source] and before[mutable]==after[mutable] and docallowed
assert all(v['hashes_match'] for v in author.values())
print('Integrity passed: source181, oldreview3623, SQL4/schema2 protected; authorized source delta and author freeze matched; doc gate delta',docdelta)
