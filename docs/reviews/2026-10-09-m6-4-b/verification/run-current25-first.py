from pathlib import Path
import subprocess,json,time,shlex,hashlib,sys
v=Path(__file__).resolve().parent
selection=json.loads((v/'current29-final-selection.json').read_text())
assert json.loads((v/'core-final-composite.json').read_text())['exit_code']==0
started=time.time()
for item in selection['probes']:
 assert hashlib.sha256(Path(item['source_path']).read_bytes()).hexdigest()==item['source_sha256']
 cmd=shlex.split(item['command']);start=time.time()
 r=subprocess.run(cmd,capture_output=True,text=True,env={'PATH':'/opt/homebrew/bin:/usr/bin:/bin','CI':'1'})
 stem='current-'+str(item['number']).zfill(2)+'-first'
 (v/(stem+'.stdout.txt')).write_text(r.stdout);(v/(stem+'.stderr.txt')).write_text(r.stderr)
 receipt={'command':cmd,'source_path':item['source_path'],'source_sha256':item['source_sha256'],'exit_code':r.returncode,'seconds':round(time.time()-start,3),'stdout':stem+'.stdout.txt','stderr':stem+'.stderr.txt','environment':'explicit PATH+CI only; no user credential/global config'}
 (v/(stem+'.json')).write_text(json.dumps(receipt,indent=2)+'\n')
 item.update({'state':'passed' if r.returncode==0 else 'failed','receipt':stem+'.json'})
 selection['state']='in_progress';(v/'current29-final-selection.json').write_text(json.dumps(selection,indent=2)+'\n')
 print(json.dumps({'probe':item['number'],'exit_code':r.returncode,'seconds':receipt['seconds']}),flush=True)
 if r.returncode:
  print(r.stdout);print(r.stderr);sys.exit(r.returncode)
selection['state']='executed_four_gates_plus25';selection['seconds_current25']=round(time.time()-started,3)
(v/'current29-final-selection.json').write_text(json.dumps(selection,indent=2)+'\n')
print(json.dumps({'passed':25,'seconds':selection['seconds_current25']}),flush=True)
