# M7.4-B D source review

Static only; no runtime checks. Actual LS01 source SHA7b566923767f7926e08fc89c7ebbd95b5d68bf72247a963a4b263ced90d6b5e9 recomputed and matched announced ready. No actionable blocker found.

Real built CLI invoked directly, new private mkdtemp0700 root and wx0600 bootstrap JSON. First init output is parsed only in memory; expectations contain success/boolean/same-admin projections, no token/raw body/private path. Serve tests live+ready through shared client, sends own child SIGTERM, observes actual close0/null; reinit must be token-free same admin, second same-DB serve proves lock release/readiness. Output does not expose token in diagnostic assertions.

12s watchdog aborts races and signals only tracked ChildProcess handles; owned list includes all four init/serve children. Finally independently waits/TERM/KILL each, records actual close rather than kill return, finite two-second aggregate final close deadline, retains directory if any child close unconfirmed. Original journey failure is retained in final safe booleans separately from cleanup.15000ms case unchanged as approved. mkdtemp/canonical path assignment retains allocated directory if canonicalization rejects. Filesystem cleanup is ordinary small own-tree rm/absence, not global tmp cleanup.

Together with A static review, source is ready for root to consider D minimal focused window. Actual successful startup and container/Linux behavior are not asserted here; Docker remains static only, full/core reuse requires unchanged boundaries.
