import json,pathlib,re,hashlib,difflib
root=pathlib.Path.cwd();out=root/'docs/reviews/2026-10-09-m6-1-b/verification/adapters';out.mkdir(exist_ok=True)
m=json.loads((root/'docs/reviews/2026-10-09-m5-2-a/verification/current29-manifest.json').read_text());rows=[];commands=list(m['commands'])
for number in list(range(12,20))+list(range(20,27)):
 command=commands[number-1];source=root/command.split(' ',1)[1];old=source.read_text();new=old.replace("../../../", "../../../../../")
 # All legacy clone seeds preserve historical study tables, removing only the schema3 additions.
 new=new.replace('DROP TABLE thread_versions;', 'DROP TABLE review_assignments; DROP TABLE review_request_versions; DROP TABLE review_requests; DROP TABLE snapshot_items; DROP TABLE snapshots; DROP TABLE thread_versions;')
 if 'openAndCoordinateDatabase' in new:
  new=new.replace('openAndCoordinateDatabase,', 'openAndCoordinateDatabase as currentCoordinate,',1).replace('openAndCoordinateDatabase }','openAndCoordinateDatabase as currentCoordinate }',1)
  marker="\n// M6.1-B: old migration positives execute in an explicitly owned stage. Ordinary serve/init rejection is independently tested with real CLI.\nimport {classifyDatabase as stageClassify} from '../../../../../packages/storage-sqlite/dist/index.js';\nfunction openAndCoordinateDatabase(database, mode){ if(stageClassify(database).kind==='supported_legacy'){const migrated=bootstrapDatabase(database);currentCoordinate(database,mode);return migrated;}return currentCoordinate(database,mode);}\n"
  # Insert after static imports (before setup, not inside them).
  pos=new.index('\nconst ');new=new[:pos]+marker+new[pos:]
 if number==12:
  new=new.replace("try { response = openAndCoordinateDatabase(database, 'serve'); } catch (err)","try { response = currentCoordinate(database, 'serve'); } catch (err)")
  new=new.replace('The shared serve coordinator upgrades a recognized old initialized schema before applying the new metadata gate','Ordinary serve refuses a recognized old initialized schema without issuing identity or migrating')
  new=new.replace('{ rejected: false, initialized: true, extra_credentials: 0, issued_admin_token: false }','{ rejected: true, initialized: false, extra_credentials: 0, issued_admin_token: false }')
  new=new.replace('!rejected && isDatabaseInitialized(database) && maxVersion(database) >= 2 && extra === 0 && !response?.adminToken','rejected && !isDatabaseInitialized(database) && maxVersion(database) === 1 && extra === 0 && !response?.adminToken')
 if number in [25,26]:
  oldcopy="if (historical) copyFileSync(join(root, 'tests/fixtures/historical-v1-schema.sql'), join(dir, 'tests/fixtures/historical-v1-schema.sql'));"
  newcopy="if (historical) {for(const version of [1,2])copyFileSync(join(root, `tests/fixtures/historical-v${version}-schema.sql`), join(dir, `tests/fixtures/historical-v${version}-schema.sql`));}"
  assert oldcopy in new;new=new.replace(oldcopy,newcopy)
  new=new.replace('verifyDatabaseStructure(db, 2)','verifyDatabaseStructure(db, 3)')
  if number==25:
   new=new.replace('const v2 = profile(generated, 2);','const v2 = profile(generated, 3);')
   new=new.replace('!equal(profile(tsSource, 2), v2)','!equal(profile(tsSource, 3), v2)')
   new=new.replace('output.historical_profile_unchanged = equal(profile(tsSource, 1), v1);','output.historical_profile_unchanged = equal(profile(tsSource, 1), v1) && equal(profile(tsSource, 2), profile(generated, 2));')
  else:
   new=new.replace('!equal(profile(sourceTs, 2), profile(generated, 2))','!equal(profile(sourceTs, 3), profile(generated, 3))')
   new=new.replace('historical_profile_unchanged = equal(profile(sourceTs, 1), profile(generated, 1));','historical_profile_unchanged = equal(profile(sourceTs, 1), profile(generated, 1)) && equal(profile(sourceTs, 2), profile(generated, 2));')
   new=new.replace('equal(profile(repaired, 2), profile(sourceTs, 2))','equal(profile(repaired, 2), profile(sourceTs, 2)) && equal(profile(repaired, 3), profile(sourceTs, 3))')
 dest=out/source.name;dest.write_text(new);diff=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile=str(source.relative_to(root)),tofile=str(dest.relative_to(root))))
 (out/(source.stem+'.diff')).write_text(diff);rows.append({'number':number,'original_path':str(source.relative_to(root)),'original_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'adapter':str(dest.relative_to(root)),'adapter_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'diff':str((out/(source.stem+'.diff')).relative_to(root))});commands[number-1]='node '+str(dest.relative_to(root))
(root/'docs/reviews/2026-10-09-m6-1-b/verification/current29-manifest.json').write_text(json.dumps({'note':'Four actual final root gates and25 probes;15 current schema3 adapters plus4 retained previous adapters and6 originals. Script creation alone claims no execution. Prior migration positives now explicitly owned stage; real CLI rejects ordinary legacy init/serve independently.','commands':commands,'adapters':rows},indent=2)+'\n');print(len(rows))
