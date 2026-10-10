# M2.2-B independent final verification

2026-10-03. Finite engineering verification passes; final acceptance belongs to parent. No new production defect observed. No product/formal-test/history modifications by verifier.

| Evidence | Actual result |
|---|---|
| Current versioned command manifest | 29/29 real exit0, including one unified build, typecheck, lint, full suite |
| Full formal | 22 files / 238 tests passed |
| New knowledge tests | core7 + protocol/HTTP4 =11 |
| Prior typed writes | core12 + protocol5 retained |
| Attachment formal regression | core9 + FS6 + HTTP8 + CLI4 retained |
| Legacy regression | B82, C26, route G4 retained |
| Legacy focused probes | AC6/6, ADv2 5/5, AE5/5, U8/8 |
| Independent new HTTP/SQLite probe | KV01–08 pass, first run; KV09 regression/integrity pass |
| Real old successful HTTP fixture replays | three original keys201, fresh create keys400; unchanged stale revision409 then only expected_revision adjusted→400; changed samekey409; restart3, redacted tombstone201, revoked401 |

`commands.json` contains every command, stdout/stderr paths, actual exits and UTC timing; `observed-tests.txt` confirms formal counts. `knowledge-command-first.json` + `observed-knowledge-first.json` preserve independent probe result; `historical-command.json` + `observed-historical-http.json` preserve fixture replay. New copy points to the M2.2-A original fixtures and copies its DB into temporary storage; raw request_hash/result expectations are not manufactured. Only post.current_revision is compared as the existing current-head projection, as explicitly justified in prior package; fixed revision/body/structured/hash/result_ref and no-side-effects checks remain.

`stable-before.json.json` and `stable-after.json.json` are the exact capture filenames (capture utility appended .json to supplied name). Both are real full snapshots, not reconstructed. `integrity.json`: all117 product/config/test and33 current docs/material unchanged during checks; all1839 prior review/probe/log/evidence,4 SQL/archive and2 schema/profile byte hashes unchanged; HEAD unchanged b8dacd56779a007a2e7045b682bca0c036fdfc44. Build updates16 tracked dist hashes, adds4 untracked knowledge-projection outputs (28→32); no removals. Implementation docs in current review excluded from historical protection because other agents could finish evidence indexing. Prior uncommitted implementation was baseline, never reset.

Warnings: ADv2 stderr has14 ignored date-time format warnings across newly documented response schemas and existing schemas. No date value format validation claim. Formal stderr only shows `$ vitest run`; build/typecheck/lint have real success. Initial source-inspection command used a nonexistent guessed protocol filename and returned1 after reading actual files; actual protocol/search.ts was then read. Integrity helper initially used an incorrect expected capture filename; corrected to actual double-suffix filenames, no failed product check or lost snapshot. Neither diagnostic is a production failure.

Original historical R21 JSON-only manifest remains 28/29 as diagnosed in M2.1; this current29 uses versioned media-aware ADv2 and retains original failure evidence pointer. No old command, expectation, observed record or failure log edited; never claim original historical29 all green.

Boundaries: Node26.3.0/pnpm11.7.0 locally. Node22, clean installation, remote CI, actual host/model have not run. App.inject probe uses actual HTTP handlers/SQLite but is not a real host certification; CLI/full-suite loopback use already authorized temporary local testing. Historical bad stored shape/private event fixtures are explicitly synthetic; real old-key replay uses prior captured fixture. No hard context byte-limit promise, no M2.3/2.4/M6 conclusion. Source audit details in `readonly-final-audit.md`; no additional broad checks or changes required by observed results.
