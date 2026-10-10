from pathlib import Path
import json,hashlib,difflib,re,subprocess
root=Path.cwd();v=root/'docs/reviews/2026-10-09-m6-4-c1/verification';author=v.parent/'author/documentation'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
base=json.loads((v/'baseline.json').read_text());mf=author/'freeze-manifest.json';manifest=json.loads(mf.read_text());targets=json.loads((author/'metadata-targets.json').read_text());allowed={e['path'] for e in manifest['files']};hashes=[{'path':e['path'],'expected':e['sha256'],'actual':sha(root/e['path']),'match':e['sha256']==sha(root/e['path'])} for e in manifest['files']]
before=[];old_map={**base['current_document_hashes'],**base['mutable_status_document_hashes']}
bweb=json.loads((v.parent/'author/web/freeze-manifest-v3.json').read_text());bwebmap={e['path']:e['sha256'] for e in bweb['files']}
for e in targets['files']:
 expected=bwebmap[e['path']] if e['path']=='examples/review-web.md' else old_map[e['path']]
 before.append({'path':e['path'],'copy':e['copy'],'expected':expected,'copy_sha256':sha(root/e['copy']),'matches_expected':sha(root/e['copy'])==expected,'source':e['basis'],'timing':targets['timing']})
planning={'docs/reviews/2026-10-09-m6-4-c1/planning/m6-4-c2a-task.md':'f5f6f5d56248112fb7870b02dcdda471cb209a8b01167412c8ddebb32ef53ee2','docs/reviews/2026-10-09-m6-4-c1/planning/m6-4-c2a-owner-candidates.json':'5c165eddb4d3890a3a17ab5302dfd43f11c8d7f76a0f70338c5db9091eaeed46'}
planning_rows=[{'path':p,'expected':s,'actual':sha(root/p),'match':sha(root/p)==s} for p,s in planning.items()]
links=[];missing=[];targetmap={e['path']:root/e['copy'] for e in targets['files']}
for e in manifest['files']:
 p=root/e['path']
 if p.suffix!='.md':continue
 old=targetmap[e['path']].read_text() if e['path'] in targetmap else ''
 additions=[l[1:] for l in difflib.unified_diff(old.splitlines(),p.read_text().splitlines(),n=0) if l.startswith('+') and not l.startswith('+++')]
 for l in additions:
  for url in re.findall(r'\]\(([^)]+)\)',l):
   url=url.strip().strip('<>');url=url.split(' "')[0]
   if re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:',url) or url.startswith('#'):continue
   target=url.split('#')[0];actual=(p.parent/target).resolve() if not target.startswith('/') else Path(target)
   row={'source':e['path'],'target':url,'file_exists':actual.exists()};links.append(row)
   if not actual.exists():missing.append(row)
jsonpaths={str(mf.relative_to(root)),str((author/'metadata-targets.json').relative_to(root)),str((v/'gate-summary.json').relative_to(root)),str((v/'independent-result-files.json').relative_to(root)),*[e['path'] for e in manifest['files'] if e['path'].endswith('.json')],*[p for p in planning if p.endswith('.json')]}
jsonrows=[]
for path in sorted(jsonpaths):
 try:json.loads((root/path).read_text());jsonrows.append({'path':path,'valid':True})
 except Exception as error:jsonrows.append({'path':path,'valid':False,'error_name':type(error).__name__})
oldcompat=json.loads(targetmap['integrations/compatibility.json'].read_text());newcompat=json.loads((root/'integrations/compatibility.json').read_text());newscope=newcompat.pop('local_c1_scope');compat={'only_local_c1_scope_added':newcompat==oldcompat,'new_scope':newscope}
freezes=[]
for relative in ['author/catalog/freeze-manifest.json','author/web/freeze-manifest-v3.json','verification/independent-source-freeze-v5.json']:
 p=v.parent/relative;x=json.loads(p.read_text());rows=[]
 for e in x['files']:
  if e['path']=='examples/review-web.md':rows.append({'path':e['path'],'source_freeze':e['sha256'],'current':sha(root/e['path']),'disposition':'Root-authorized guide metadata delta; exact B3 before retained','metadata_match':next(r['match'] for r in hashes if r['path']==e['path'])})
  else:rows.append({'path':e['path'],'expected':e['sha256'],'current':sha(root/e['path']),'match':sha(root/e['path'])==e['sha256']})
 freezes.append({'manifest':str(p.relative_to(root)),'sha256':sha(p),'files':rows,'code_test_match':all(r.get('match',r.get('metadata_match',False)) for r in rows)})
protection={}
for k in ['protected_review_probe_log_evidence_hashes','sql_archive_before_hashes','schema_profile_before_hashes','current_document_hashes','mutable_status_document_hashes']:
 mapping=base[k];drift=[{'path':p,'expected':s,'actual':sha(root/p)} for p,s in mapping.items() if p not in allowed and sha(root/p)!=s];protection[k]={'count':len(mapping),'authorized_document_changes':[p for p in mapping if p in allowed],'unapproved_drift':drift}
inv=json.loads((v/'final-dist-inventory.json').read_text());distmap={**inv['tracked'],**inv['untracked']};distnow={str(p.relative_to(root)):sha(p) for folder in ['packages','modules'] for p in root.glob(folder+'/*/dist/**/*') if p.is_file()};distdrift=[p for p,h in distmap.items() if distnow.get(p)!=h];distnew=[p for p in distnow if p not in distmap]
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();lock=sha(root/'pnpm-lock.yaml')
diff=subprocess.run(['git','diff','--check','--',*[e['path'] for e in manifest['files']]],text=True,capture_output=True)
(v/'metadata-diffcheck.stdout.txt').write_text(diff.stdout);(v/'metadata-diffcheck.stderr.txt').write_text(diff.stderr)
result={'phase':'single metadata audit; wording findings separately reported to root','manifest':str(mf.relative_to(root)),'manifest_sha256':sha(mf),'document_count':len(hashes),'document_hashes':hashes,'before_count':len(before),'before_sources':before,'planning':planning_rows,'new_or_changed_markdown_links':links,'missing_links':missing,'json':jsonrows,'compatibility':compat,'source_freezes':freezes,'protection':protection,'dist':{'inventory_count':len(distmap),'current_count':len(distnow),'changed_from_final_inventory':distdrift,'new_since_final_inventory':distnew},'head_unchanged':head==base['head'],'lock_unchanged':lock==base['product_source_config_test_hashes']['pnpm-lock.yaml'],'diffcheck':{'exit_code':diff.returncode,'stdout':'metadata-diffcheck.stdout.txt','stderr':'metadata-diffcheck.stderr.txt'},'functional_report_sha256':sha(v/'independent-report.md'),'runtime_checks_executed':False}
result['mechanical_checks_passed']=all(r['match'] for r in hashes) and all(r['matches_expected'] for r in before) and all(r['match'] for r in planning_rows) and not missing and all(r['valid'] for r in jsonrows) and compat['only_local_c1_scope_added'] and all(r['code_test_match'] for r in freezes) and all(not r['unapproved_drift'] for r in protection.values()) and not distdrift and not distnew and result['head_unchanged'] and result['lock_unchanged'] and diff.returncode==0
(v/'metadata-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'mechanical_checks_passed':result['mechanical_checks_passed'],'doc_count':len(hashes),'before_count':len(before),'missing_links':missing,'json_valid':all(r['valid'] for r in jsonrows),'compat_only_local':compat['only_local_c1_scope_added'],'source_freezes_match':all(r['code_test_match'] for r in freezes),'protection_drift':{k:len(r['unapproved_drift']) for k,r in protection.items()},'dist_changes':distdrift+distnew,'diffcheck':diff.returncode}))
