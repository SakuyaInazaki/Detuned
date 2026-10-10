from pathlib import Path
import subprocess,sys
p=Path(__file__).resolve().parent
entries=[('sr-http','docs/reviews/2026-10-03-m2-4-b1/verification/check-space-http.mjs'),('sr-boundaries','docs/reviews/2026-10-03-m2-4-b1/verification/check-space-boundaries-2026-10-06.mjs'),('sr-wal','docs/reviews/2026-10-03-m2-4-b1/verification/check-context-snapshot-2026-10-06.mjs'),('sr-tools','docs/reviews/2026-10-03-m2-4-b1/verification/check-space-tools-cli.mjs'),('sq','docs/reviews/2026-10-03-m2-3/verification/check-search-http.mjs'),('kv','docs/reviews/2026-10-03-m2-2-b/verification/check-knowledge-http.mjs')]
for name,file in entries:
 r=subprocess.run([sys.executable,str(p/'run-recorded.py'),'prior-'+name,'node',file])
 if r.returncode:sys.exit(r.returncode)
