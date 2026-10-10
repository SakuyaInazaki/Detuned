import json,subprocess,time,pathlib,os,sys
p=pathlib.Path(__file__).resolve().parent;m=json.loads((p/'current29-manifest.json').read_text());start=int(sys.argv[1]);end=int(sys.argv[2]);rows=[]
for number in range(start,end+1):
 command=m['commands'][number-1].split();began=time.time();stem='current-%02d-first'%number;attempt=1
 while (p/(stem+'.log')).exists():attempt+=1;stem='current-%02d-attempt-%d'%(number,attempt)
 log=p/(stem+'.log')
 with log.open('w') as f:
  try:r=subprocess.run(command,env={**os.environ,'npm_config_userconfig':'/dev/null','npm_config_globalconfig':'/dev/null','CI':'1'},stdout=f,stderr=subprocess.STDOUT,timeout=60);exit=r.returncode
  except subprocess.TimeoutExpired:exit=124
 row={'number':number,'command':' '.join(command),'exit_code':exit,'seconds':round(time.time()-began,3),'log':str(log)};rows.append(row);(p/(stem+'.json')).write_text(json.dumps(row,indent=2)+'\n');print(json.dumps(row),flush=True)
 if exit:break
