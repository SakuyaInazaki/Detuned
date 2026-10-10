import pathlib,json,hashlib,difflib
root=pathlib.Path.cwd();old=root/'docs/reviews/2026-10-09-m6-2-a/verification';new=root/'docs/reviews/2026-10-09-m6-3-a/verification';out=new/'adapters';out.mkdir(exist_ok=True)
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=json.loads((old/'current29-manifest.json').read_text());rows=[]
for row in prior['adapters']:
 source=root/row['adapter'];assert h(source)==row['adapter_sha256'];assert h(root/row['original_path'])==row['original_sha256']
 before=source.read_text();text=before
 text=text.replace('DROP TABLE review_submissions;', 'DROP TABLE review_decisions; DROP TABLE review_submissions;')
 if source.name in ['check-profile-and-fts.mjs','check-generation-completeness.mjs']:
  text=text.replace('for(const version of [1,2,3])','for(const version of [1,2,3,4])')
  if source.name=='check-profile-and-fts.mjs':
   text=text.replace('profile(generated, 4)','profile(generated, 5)').replace('verifyDatabaseStructure(db, 4)','verifyDatabaseStructure(db, 5)').replace('profile(tsSource, 4)','profile(tsSource, 5)')
   text=text.replace('equal(profile(tsSource, 3), profile(generated, 3));','equal(profile(tsSource, 3), profile(generated, 3)) && equal(profile(tsSource, 4), profile(generated, 4));')
  else:
   text=text.replace('verifyDatabaseStructure(db, 4)','verifyDatabaseStructure(db, 5)')
   text=text.replace('!equal(profile(sourceTs, 4), profile(generated, 4))','!equal(profile(sourceTs, 5), profile(generated, 5))')
   text=text.replace('equal(profile(sourceTs, 3), profile(generated, 3));','equal(profile(sourceTs, 3), profile(generated, 3)) && equal(profile(sourceTs, 4), profile(generated, 4));')
   text=text.replace('equal(profile(repaired, 4), profile(sourceTs, 4)) };','equal(profile(repaired, 4), profile(sourceTs, 4)) && equal(profile(repaired, 5), profile(sourceTs, 5)) };')
 target=out/source.name;target.write_text(text);diff=out/(source.stem+'.diff');diff.write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile=row['adapter'],tofile=str(target.relative_to(root)))))
 rows.append({'number':row['number'],'original_path':row['original_path'],'original_sha256':row['original_sha256'],'sealed_schema4_adapter':row['adapter'],'sealed_schema4_sha256':h(source),'adapter':str(target.relative_to(root)),'adapter_sha256':h(target),'diff':str(diff.relative_to(root)),'changed':text!=before,'scope':'Exclude seventh formal table only in synthetic legacy projection; current profile5 plus immutable historical4 generator input when needed. All prior assertions/budgets retained.'})
commands=prior['commands'][:]
for row in rows:commands[row['number']-1]='node '+row['adapter']
manifest={'state':'prepared_not_executed_pending_root','composition':{'gates':4,'probes':25,'originals':6,'previous_approved_adapters':4,'schema5_package_adapters':15},'commands':commands,'adapters':rows,'note':'No probe executed. Unchanged schema4 adapter copies retain byte-identical semantics. Whole old review remains read-only.'}
(new/'current29-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'manifest_sha256':h(new/'current29-manifest.json'),'adapters':len(rows),'changed':sum(r['changed'] for r in rows),'unchanged':sum(not r['changed'] for r in rows)}))
