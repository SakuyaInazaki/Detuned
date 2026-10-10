from pathlib import Path
import json,hashlib,subprocess,time,os
v=Path("docs/reviews/2026-10-10-m7-4-e/verification");p=json.loads((v/"r1-red-preparation.json").read_text())
assert hashlib.sha256(Path("scripts/integrations/codex-check-probe.mjs").read_bytes()).hexdigest()==p["source_sha256"]
assert hashlib.sha256(Path("tests/contracts/m7-codex-launcher.test.ts").read_bytes()).hexdigest()==p["test_sha256"]
start=time.monotonic()
with os.fdopen(os.open(v/"r1-cl02-red-first.stdout.txt",os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"wb") as out,os.fdopen(os.open(v/"r1-cl02-red-first.stderr.txt",os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"wb") as err:
 result=subprocess.run(p["argv"],stdout=out,stderr=err,timeout=15)
r={"argv":p["argv"],"exit_code":result.returncode,"elapsed_seconds":time.monotonic()-start,"source_sha256":p["source_sha256"],"test_sha256":p["test_sha256"],"status":"actual failed" if result.returncode else "unexpected pass","expected_red":True,"retry":False}
with os.fdopen(os.open(v/"r1-cl02-red-first.receipt.json",os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),"w") as f:json.dump(r,f,indent=2);f.write("\n")
print(json.dumps(r))
