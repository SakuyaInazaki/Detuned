"""Static adapter preparation only; prior sealed source bytes remain unchanged."""
import json,pathlib,hashlib,difflib
root=pathlib.Path.cwd();review=root/'docs/reviews/2026-10-09-m6-2-a/verification';out=review/'adapters';out.mkdir(exist_ok=True)
before=json.loads((root/'docs/reviews/2026-10-09-m6-1-b/verification/current29-manifest.json').read_text())
commands=list(before['commands']);rows=[]
for previous in before['adapters']:
    number=previous['number'];source=root/previous['adapter'];old=source.read_text();new=old
    new=new.replace('DROP TABLE review_assignments;', 'DROP TABLE review_submissions; DROP TABLE review_assignments;')
    new=new.replace('// M6.1-B:', '// M6.2-A:')
    if number in [25,26]:
        new=new.replace('for(const version of [1,2])copyFileSync', 'for(const version of [1,2,3])copyFileSync')
        new=new.replace('verifyDatabaseStructure(db, 3)', 'verifyDatabaseStructure(db, 4)')
        if number==25:
            new=new.replace('const v2 = profile(generated, 3);', 'const v2 = profile(generated, 4);')
            new=new.replace('!equal(profile(tsSource, 3), v2)', '!equal(profile(tsSource, 4), v2)')
            new=new.replace('equal(profile(tsSource, 2), profile(generated, 2));', 'equal(profile(tsSource, 2), profile(generated, 2)) && equal(profile(tsSource, 3), profile(generated, 3));')
        else:
            new=new.replace('!equal(profile(sourceTs, 3), profile(generated, 3))', '!equal(profile(sourceTs, 4), profile(generated, 4))')
            new=new.replace('equal(profile(sourceTs, 2), profile(generated, 2));', 'equal(profile(sourceTs, 2), profile(generated, 2)) && equal(profile(sourceTs, 3), profile(generated, 3));')
            new=new.replace('equal(profile(repaired, 3), profile(sourceTs, 3)) }', 'equal(profile(repaired, 3), profile(sourceTs, 3)) && equal(profile(repaired, 4), profile(sourceTs, 4)) }')
    destination=out/source.name
    if destination.exists():raise SystemExit('Adapter evidence already exists')
    destination.write_text(new)
    diff=out/(source.stem+'.diff');diff.write_text(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile=str(source.relative_to(root)),tofile=str(destination.relative_to(root)))))
    rows.append({'number':number,'sealed_schema3_adapter':str(source.relative_to(root)),'sealed_schema3_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                 'original_path':previous['original_path'],'original_sha256':previous['original_sha256'],
                 'adapter':str(destination.relative_to(root)),'adapter_sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'diff':str(diff.relative_to(root))})
    commands[number-1]='node '+str(destination.relative_to(root))
commands[:4]=['pnpm -r --workspace-concurrency=1 run build','pnpm -r --workspace-concurrency=1 run typecheck','pnpm -r --workspace-concurrency=1 run lint','pnpm test --maxWorkers=1 --no-file-parallelism']
(review/'current29-manifest.json').write_text(json.dumps({'state':'prepared_pending_root_scope_and_final_source_stability_not_executed',
 'note':'6 originals + 4 earlier approved adapters + 15 schema4 adapters; original assertions preserved. Schema3 adapters extended only six-table legacy projection and current4/historical1,2,3 generation. Explicit owned stage bootstrap positives and ordinary legacy refusal preserved.',
 'commands':commands,'adapters':rows},indent=2)+'\n')
print(json.dumps({'prepared':len(rows),'executed':False}))
