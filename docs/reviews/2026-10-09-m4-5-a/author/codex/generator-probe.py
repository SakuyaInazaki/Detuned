import pathlib,tempfile,subprocess,os,time,signal,json
base=pathlib.Path('/Users/sakimi/Desktop/Detuned/docs/reviews/2026-10-09-m4-5-a/author/codex')
owned=pathlib.Path(tempfile.mkdtemp(prefix='detuned-codex-schema-',dir='/private/tmp'))
profile=owned/'deny-user-state.sb';out=owned/'schema';out.mkdir()
profile.write_text('''(version 1)
(allow default)
(deny network*)
(deny file-read* file-write* (subpath "/Users/sakimi/.codex") (subpath "/Users/sakimi/.claude") (literal "/Users/sakimi/.claude.json") (subpath "/Users/sakimi/.config") (subpath "/Users/sakimi/Library/Keychains") (subpath "/Library/Keychains") (subpath "/Users/sakimi/Library/Application Support/Codex") (subpath "/Users/sakimi/Library/Application Support/Claude"))
(deny file-write*)
(allow file-write* (subpath "'''+str(owned)+'''"))
''')
args=['/usr/bin/sandbox-exec','-f',str(profile),'/opt/homebrew/bin/codex','app-server','generate-json-schema','--experimental','--out',str(out)]
start=time.monotonic();limit=False
with (owned/'stdout').open('wb') as stdout,(owned/'stderr').open('wb') as stderr:
 p=subprocess.Popen(args,cwd=owned,env={'PATH':'/opt/homebrew/bin:/usr/bin:/bin'},stdout=stdout,stderr=stderr,start_new_session=True)
 while p.poll() is None:
  if time.monotonic()-start>60 or any((owned/f).stat().st_size>1048576 for f in ['stdout','stderr']):
   limit=True;os.killpg(p.pid,signal.SIGKILL);break
  time.sleep(.1)
 code=p.wait()
receipt={'argv':args,'owned':str(owned),'pid':p.pid,'exit':code,'limit_killed':limit,'elapsed_seconds':round(time.monotonic()-start,3),'environment_keys':['PATH'],'profile':profile.read_text(),'files':[str(f.relative_to(owned)) for f in owned.rglob('*') if f.is_file()]}
(base/'generator-probe-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
for name in ['stdout','stderr']:(base/('generator-probe.'+name)).write_bytes((owned/name).read_bytes()[:1048576])
print(json.dumps({'owned':str(owned),'exit':code,'limit_killed':limit,'elapsed_seconds':receipt['elapsed_seconds']}))
