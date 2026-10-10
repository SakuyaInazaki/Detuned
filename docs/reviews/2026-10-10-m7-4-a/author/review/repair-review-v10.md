# M7.4-A v10 independent lifecycle review

Static review only; no syntax/build/test/native execution. v9 diagnostics-only review remains historical and is not lifecycle assurance.

Inspected source SHA256 `ecebcdd61f6315995e64044093e2b0f621389f62f6f823d6acd32f1103f6c8be`; freeze `7f9da969574b034f068c3808ad25433c2b44da62674cbdca06d4235d9b1df685`; delta `9e98ed8678968e71ebd6a7c8372cc001542ac35813f447d558718ba63ade8e3a`. Actual three hashes match the announced freeze (Claude hash recomputed in this review; Pi hashes protected by unchanged delta). D runner inspected as current preparation, containing unbound SOURCE_SHA placeholder, not runnable release.

## Blocking findings

1. **Canceled initializer can resume after supervisor cleanup.** Claude lines 124–133 race the initializer against interruption but do not cancel or await that initializer. `finished=true` in finally does not prevent its line 126 fork or line 132 bootstrap: both check only wall deadline. For example SIGTERM while awaiting hash/root filesystem work or worker ownership callback can let finally inspect no worker, remove root, then the initializer resume before 60 seconds and start or bootstrap a worker. Native registration checks `!finished` later, but ownership-before-bootstrap and cleanup settlement are already violated. Add terminal cancellation checks after each awaited initialization boundary and before every allocation/spawn/bootstrap; retain and settle the initializer under finite cleanup budget, with allocated ownership visible to cleanup. No late continuation may acquire resources after cleanup reports success.

2. **Early canonicalization failure loses allocated root.** Line 125 nests mkdtemp inside realpath and stores only canonical result. A realpath rejection after successful mkdtemp leaves no path in finally; lstat failure retains the canonical path, but nested realpath failure does not. Preserve exact allocated path separately before realpath and apply the same ownership/absence cleanup rule used in the earlier guard fallback repair. Do not claim private_directory_removed when absence is unconfirmed.

3. **D outer capture still waits indefinitely for close.** `verification/claude-bounded-capture.mjs` lines 41–42 await actual close with no terminal bound after TERM/KILL; line 47 repeats the same unbounded await in finally. The 70-second timer initiates cleanup but cannot terminate these waits. Add an absolute finite emergency deadline for actual-close waits, mark driver_actual_close false and failed when unconfirmed, and do not remove roots while registered groups or driver closure are unverified. Killing is not observing close.

## Confirmed improvements / remaining limits

The same-file import gate does not spawn on ordinary import. The owned detached worker is checked with targeted UID/PGID query and trusted registry callback before bootstrap on the ordinary path. Native uses detached:false; MCP launcher registers before importing the fixed bridge and must match the worker group. Worker application cleanup uses drain/idle zero, tracked socket close, and app.close; report fields are fixed safe projections. These source facts do not prove native success or settle the cancellation findings above. Callback throw/never-resolve cases exercise registration rejection, but do not cover interruption of the still-running initializer.

D observer retains IDs in memory before ACK and verifies registry equality; controlled failure checks require no native/MCP registration. SOURCE_SHA must bind the next final A source before any release. Core 967/155 is reusable only for unchanged protected source; guard policy reuse remains a separate binding decision, not native acceptance.
