import pathlib,json,hashlib,subprocess,os,time,signal
base=pathlib.Path('/Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-09-m4-5-a/author/codex');first=json.loads((base/'generator-probe-receipt.json').read_text());owned=pathlib.Path(first['owned']);profile=pathlib.Path(first['argv'][2]);assert profile.read_text()==first['profile'];assert '(deny network*)' in first['profile'];assert first['argv'][3:] == ['/opt/homebrew/bin/codex','app-server','generate-json-schema','--experimental','--out',str(owned/'schema')]
(base/'generator-managed-before.json').write_text(json.dumps({'argv':first['argv'],'profile_sha256':hashlib.sha256(profile.read_bytes()).hexdigest(),'same_profile_exact':True,'same_argv_exact':True},indent=2)+'\n')
start=time.monotonic();limit=False
with (owned/'attempt2.stdout').open('wb') as stdout,(owned/'attempt2.stderr').open('wb') as stderr:
 p=subprocess.Popen(first['argv'],cwd=owned,env={'PATH':'/opt/homebrew/bin:/usr/bin:/bin'},stdout=stdout,stderr=stderr,start_new_session=True)
 while p.poll() is None:
  if time.monotonic()-start>60 or any((owned/f).stat().st_size>1048576 for f in ['attempt2.stdout','attempt2.stderr']):
   limit=True;os.killpg(p.pid,signal.SIGKILL);break
  time.sleep(.1)
 code=p.wait()
receipt={'argv':first['argv'],'owned':str(owned),'pid':p.pid,'exit':code,'limit_killed':limit,'elapsed_seconds':round(time.monotonic()-start,3),'same_profile_sha256':hashlib.sha256(profile.read_bytes()).hexdigest(),'environment_keys':['PATH'],'schema_files':[str(f.relative_to(owned/'schema')) for f in (owned/'schema').rglob('*') if f.is_file()]}
(base/'generator-managed-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
for name in ['stdout','stderr']:(base/('generator-managed.'+name)).write_bytes((owned/('attempt2.'+name)).read_bytes()[:1048576])
print(json.dumps({'exit':code,'limit_killed':limit,'elapsed_seconds':receipt['elapsed_seconds'],'schema_files':len(receipt['schema_files'])}))
