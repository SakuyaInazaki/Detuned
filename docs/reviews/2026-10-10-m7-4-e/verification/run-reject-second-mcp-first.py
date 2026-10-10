from pathlib import Path
import json,subprocess,time,os,hashlib,sys
v=Path("docs/reviews/2026-10-10-m7-4-e/verification")
p=json.loads((v/"d-execution-plan-v4.json").read_text())
for k,f in {"source_sha256":Path("scripts/integrations/codex-check-probe.mjs"),"new_test_sha256":Path("tests/contracts/m7-codex-launcher.test.ts"),"capture_sha256":v/"codex-bounded-capture-v2.mjs","binding_sha256":v/"guard-source-binding-v4.json"}.items():assert hashlib.sha256(f.read_bytes()).hexdigest()==p[k]
argv=p["reject_second_future_argv"]
out=v/"reject-second-mcp-first.stdout.txt";err=v/"reject-second-mcp-first.stderr.txt";receipt=v/"reject-second-mcp-first.receipt.json"
assert not receipt.exists()
start=time.monotonic()
with os.fdopen(os.open(out,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"wb") as stdout,os.fdopen(os.open(err,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"wb") as stderr:
 process=subprocess.Popen(argv,stdout=stdout,stderr=stderr)
 code=process.wait()
r={"argv":argv,"outer_pid":process.pid,"exit_code":code,"elapsed_seconds":time.monotonic()-start,"stdout_path":str(out),"stderr_path":str(err),"producer_path":argv[3],"capture_path":argv[3]+".capture.json","source_sha256":p["source_sha256"],"test_sha256":p["new_test_sha256"],"capture_sha256":p["capture_sha256"],"status":"passed" if code==0 else "failed","retry":False}
with os.fdopen(os.open(receipt,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"w") as f:json.dump(r,f,indent=2);f.write("\n")
print(json.dumps(r),flush=True)
sys.exit(code)
