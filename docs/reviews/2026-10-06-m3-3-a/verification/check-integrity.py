from pathlib import Path
import json,sys
p=Path(__file__).resolve().parent
base=json.loads((p/'baseline.json').read_text());before=json.loads((p/sys.argv[1]).read_text());after=json.loads((p/sys.argv[2]).read_text())
protected=['protected_review_probe_log_evidence_hashes','frozen_sql_archive_hashes','schema_profile_hashes']
stable=['product_source_config_test_hashes','current_document_hashes','mutable_status_document_hashes']
def diff(a,b):
 return {'added':sorted(b.keys()-a.keys()),'removed':sorted(a.keys()-b.keys()),'changed':sorted(k for k in a.keys()&b.keys() if a[k]!=b[k])}
result={'baseline_head':base['head'],'head_unchanged':base['head']==after['head'],'protected':{k:{'count':len(base[k]),'unchanged':base[k]==after[k],'delta':diff(base[k],after[k])} for k in protected},'final_execution_window':{k:{'count':len(before[k]),'unchanged':before[k]==after[k],'delta':diff(before[k],after[k])} for k in stable},'normal_build_changes':{k:diff(base[k],after[k]) for k in ['tracked_build_artifact_hashes','untracked_build_artifact_hashes']},'baseline_to_final_scope_changes':{k:diff(base[k],after[k]) for k in stable},'historical_fixture_assets_unchanged':all(after['product_source_config_test_hashes'].get(k)==v for k,v in base['product_source_config_test_hashes'].items() if k.startswith('tests/fixtures/')),'notes':'Snapshot stability applies only to stated final execution window. Authorized interim fixture repairs and document closeout are listed separately; older snapshots and first failures remain.'}
(p/'integrity.json').write_text(json.dumps(result,indent=2)+'\n')
assert result['head_unchanged'] and result['historical_fixture_assets_unchanged']
assert all(x['unchanged'] for x in result['protected'].values())
assert all(x['unchanged'] for x in result['final_execution_window'].values())
print('Integrity passed', {k:v['count'] for k,v in result['protected'].items()})
