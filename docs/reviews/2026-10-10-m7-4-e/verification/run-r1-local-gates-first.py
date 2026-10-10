from pathlib import Path
import json,subprocess,time,os,sys,hashlib
v=Path("docs/reviews/2026-10-10-m7-4-e/verification")
p=json.loads((v/"d-execution-plan-v4.json").read_text())
for k,f in {"source_sha256":Path("scripts/integrations/codex-check-probe.mjs"),"new_test_sha256":Path("tests/contracts/m7-codex-launcher.test.ts"),"capture_sha256":v/"codex-bounded-capture-v2.mjs"}.items():
 assert hashlib.sha256(f.read_bytes()).hexdigest()==p[k]
for gate in p["commands"]:
 name="r1-"+gate["id"]+"-first"
 paths=[v/(name+s) for s in [".stdout.txt",".stderr.txt",".receipt.json"]]
 assert all(not f.exists() for f in paths)
 out=os.open(paths[0],os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 err=os.open(paths[1],os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 start=time.monotonic()
 try:
  with os.fdopen(out,"wb") as stdout,os.fdopen(err,"wb") as stderr:
   completed=subprocess.run(gate["argv"],stdout=stdout,stderr=stderr,timeout=45)
  code=completed.returncode
 except subprocess.TimeoutExpired:
  code=124
 elapsed=time.monotonic()-start
 receipt={"gate":gate["id"],"argv":gate["argv"],"exit_code":code,"elapsed_seconds":elapsed,"stdout_path":str(paths[0]),"stderr_path":str(paths[1]),"source_sha256":p["source_sha256"],"test_sha256":p["new_test_sha256"],"capture_sha256":p["capture_sha256"],"status":"passed" if code==0 else "failed","native_run":False}
 with os.fdopen(os.open(paths[2],os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"w") as f:json.dump(receipt,f,indent=2);f.write("\n")
 print(json.dumps(receipt),flush=True)
 if code:sys.exit(code)
