import os, pathlib, tempfile, subprocess, time, json, signal
E = pathlib.Path(__file__).resolve().parent
root = pathlib.Path(tempfile.mkdtemp(prefix='detuned-colima-owned-', dir='/private/tmp'))
os.chmod(root, 0o700)
env = {'PATH':'/opt/homebrew/bin:/usr/bin:/bin','HOME':os.environ['HOME']}
for key, name in [('COLIMA_HOME','colima'),('LIMA_HOME','lima'),('COLIMA_CACHE_HOME','cache'),('XDG_CACHE_HOME','xdg-cache'),('TMPDIR','tmp'),('DOCKER_CONFIG','docker')]:
    p=root/name; p.mkdir(mode=0o700); env[key]=str(p)
profile='detuned-owned'
args=['/opt/homebrew/bin/colima','start',profile,'--runtime','docker','--vm-type','vz','--arch','aarch64','--cpus','2','--memory','4','--disk','10','--root-disk','10','--activate=false','--template=false','--ssh-config=false','--ssh-agent=false','--mount','none','--binfmt=false','--vz-rosetta=false','--network-address=false','--network-host-addresses=false','--port-forwarder','none']
meta={'owned_root':str(root),'profile':profile,'env_paths':{k:v for k,v in env.items() if k not in ('HOME','PATH')},'argv':args,'timeout_seconds':480,'start_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
(E/'operation.json').write_text(json.dumps(meta,indent=2)+'\n')
beg=time.monotonic()
with (E/'start.stdout.txt').open('wb') as out, (E/'start.stderr.txt').open('wb') as err:
    p=subprocess.Popen(args,env=env,cwd=root,stdout=out,stderr=err,start_new_session=True)
    meta['start_pid']=p.pid; (E/'operation.json').write_text(json.dumps(meta,indent=2)+'\n')
    try: code=p.wait(timeout=480); timed=False
    except subprocess.TimeoutExpired:
        timed=True; os.killpg(p.pid,signal.SIGTERM)
        try: code=p.wait(timeout=5)
        except subprocess.TimeoutExpired: os.killpg(p.pid,signal.SIGKILL); code=p.wait()
meta.update(exit_code=code,timed_out=timed,elapsed_seconds=round(time.monotonic()-beg,3))
if code==0:
    socket=root/'colima'/profile/'docker.sock'; meta['socket']=str(socket)
    with (E/'docker-version.stdout.txt').open('wb') as out,(E/'docker-version.stderr.txt').open('wb') as err:
        probe=subprocess.run(['/opt/homebrew/bin/docker','version','--format','{{json .Server}}'],env={**env,'DOCKER_HOST':'unix://'+str(socket)},cwd=root,stdout=out,stderr=err,timeout=8)
        meta['docker_version_exit']=probe.returncode
else:
    meta['cleanup']=[]
    for command in [['stop',profile,'--force'],['delete',profile,'--force','--data']]:
        tag=command[0]
        with (E/(tag+'.stdout.txt')).open('wb') as out,(E/(tag+'.stderr.txt')).open('wb') as err:
            try:
                c=subprocess.run(['/opt/homebrew/bin/colima',*command],env=env,cwd=root,stdout=out,stderr=err,timeout=45)
                meta['cleanup'].append({'argv':command,'exit':c.returncode})
            except subprocess.TimeoutExpired: meta['cleanup'].append({'argv':command,'timeout':True})
(E/'receipt.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta,indent=2),flush=True)
