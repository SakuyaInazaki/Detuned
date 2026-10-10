from pathlib import Path
import subprocess,sys
p=Path(__file__).resolve().parent
entries=[('tp-http','docs/reviews/2026-10-06-m2-4-b2-2/verification/check-thread-http.mjs'),('tp-cursor-order','docs/reviews/2026-10-06-m2-4-b2-2/verification/check-thread-cursor-order-v2.mjs'),('tp-wal','docs/reviews/2026-10-06-m2-4-b2-2/verification/check-thread-wal.mjs'),('tp-tools','docs/reviews/2026-10-06-m2-4-b2-2/verification/check-thread-tools-cli-v2.mjs'),('pr-http','docs/reviews/2026-10-06-m2-4-b2-1/verification/check-post-http.mjs'),('pr-wal','docs/reviews/2026-10-06-m2-4-b2-1/verification/check-post-wal.mjs'),('pr-tools','docs/reviews/2026-10-06-m2-4-b2-1/verification/check-post-tools-cli.mjs'),('sr-http','docs/reviews/2026-10-03-m2-4-b1/verification/check-space-http.mjs'),('sr-boundaries','docs/reviews/2026-10-03-m2-4-b1/verification/check-space-boundaries-2026-10-06.mjs'),('sr-wal','docs/reviews/2026-10-03-m2-4-b1/verification/check-context-snapshot-2026-10-06.mjs'),('sr-tools','docs/reviews/2026-10-03-m2-4-b1/verification/check-space-tools-cli.mjs'),('sq','docs/reviews/2026-10-03-m2-3/verification/check-search-http.mjs'),('kv','docs/reviews/2026-10-03-m2-2-b/verification/check-knowledge-http.mjs')]
for name,file in entries:
 r=subprocess.run([sys.executable,str(p/'run-recorded.py'),'prior-'+name,'node',file])
 if r.returncode:sys.exit(r.returncode)
