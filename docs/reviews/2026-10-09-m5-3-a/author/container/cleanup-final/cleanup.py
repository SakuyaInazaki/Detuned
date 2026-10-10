import os,pathlib,json,subprocess,time,hashlib,shutil
E=pathlib.Path(__file__).resolve().parent
R=pathlib.Path('/private/tmp/detuned-colima-owned-608g1enf')
op=json.loads(pathlib.Path('docs/reviews/2026-10-09-m5-2-a/planning/colima-owned/operation.json').read_text())
assert op['owned_root']==str(R) and op['profile']=='detuned-owned'
assert R.is_dir() and not R.is_symlink() and R.stat().st_uid==os.getuid()
yaml=R/'lima/colima-detuned-owned/lima.yaml'
assert hashlib.sha256(yaml.read_bytes()).hexdigest()=='525b11e614b12d63f003fcc41f3b8e5bb71910815379b81680c27e77c05725e1'
env={'PATH':'/opt/homebrew/bin:/usr/bin:/bin','HOME':os.environ['HOME'],**op['env_paths']}
records=[]
def run(tag,args,timeout=45,extra=None):
 b=time.monotonic()
 p=subprocess.run(args,env={**env,**(extra or {})},cwd=R,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
 (E/(tag+'.stdout.txt')).write_bytes(p.stdout);(E/(tag+'.stderr.txt')).write_bytes(p.stderr)
 records.append({'stage':tag,'argv':args,'exit_code':p.returncode,'elapsed_seconds':round(time.monotonic()-b,3)})
 (E/'receipt.json').write_text(json.dumps({'owned_root':str(R),'profile':'detuned-owned','instance':'colima-detuned-owned','env_paths':op['env_paths'],'stages':records},indent=2)+'\n')
 return p
assert run('version',['/opt/homebrew/bin/colima','version'],8).returncode==0
p=run('containers-before',['/opt/homebrew/bin/docker','ps','--format','{{.ID}}'],8,{'DOCKER_HOST':'unix://'+str(R/'colima/detuned-owned/docker.sock')})
assert p.returncode==0 and not p.stdout.strip(),'active containers; cleanup stopped'
assert run('stop',['/opt/homebrew/bin/colima','stop','detuned-owned']).returncode==0
assert run('delete',['/opt/homebrew/bin/colima','delete','detuned-owned','--force','--data'],90).returncode==0
state={'profile_exists':(R/'colima/detuned-owned').exists(),'instance_exists':(R/'lima/colima-detuned-owned').exists(),'socket_exists':(R/'colima/detuned-owned/docker.sock').exists()}
(E/'after-delete.json').write_text(json.dumps(state,indent=2)+'\n')
assert not any(state.values()),'owned profile remains'
shutil.rmtree(R)
(E/'root-removed.json').write_text(json.dumps({'owned_root_exists':R.exists()},indent=2)+'\n')
print(json.dumps({'stages':records,'after_delete':state,'owned_root_exists':R.exists()}))
