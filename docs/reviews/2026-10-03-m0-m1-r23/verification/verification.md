# R23-V independent execution verification

Actual HEAD: `b8dacd56779a007a2e7045b682bca0c036fdfc44`; Node v26.3.0, pnpm 11.7.0, Python 3.14.3.

Build ran first. All 29 R22 commands executed independently with exit 0, no timeout. stdout and stderr are separate; commands.json records UTC start/end, cwd, exit and timeout state. The two loopback commands ran with sandbox escalation for temporary local services, without model or real harness invocation.

Formal suite: 180/180, 13 files; precise counts in integrity.json. AC 6/6, AD 5/5, AE 5/5, U 8/8. Prior B and generation commands all exit 0. No failing command was observed in this run.

Integrity: before/after HEAD unchanged; all 94 captured product/test/config/material paths unchanged; all 1336 historical review evidence paths unchanged; frozen SQL/archive and dist unchanged. The R22 93-file subset differs in exactly six files, matching the stated C.3 subset. The additional capture path packages/storage-sqlite/tests/fixtures.db was already present before this verification; it is a fixture material, not a newly implemented product source. No files were removed or untracked by this verifier. Normal test caches may be reflected in the saved git status.

Evidence: before.json, after.json, integrity.json, commands.json, per-command observed stdout/stderr. Collector code is capture.py and run-existing.py, confined to this verification directory. Historical runners were not executed and old observed files were not overwritten.

Limits: Node 22, clean installation, remote CI, real host/real model runs were not performed. This is execution and integrity verification, not the overall C acceptance decision; parent reviewer combines the independent source audits.
