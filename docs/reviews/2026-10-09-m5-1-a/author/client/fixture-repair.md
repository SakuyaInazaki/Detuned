# API-v1 fixture coverage repair

D first full gate: 667 passed, 3 failed in 98 files. Original evidence remains in `../../verification/gates/full.stdout`, `full.stderr`, `full.receipt.json`, and `full-first-failure-review.json`.

The two captured-route fixtures construct Web-disabled apps and collect only `/api/v1/` routes. Their OpenAPI enumeration previously included root auth paths and path-item metadata. This authorized fixture repair resolves operation → path → document `servers`, selects effective `/api/v1` server paths, and enumerates only eight standard HTTP verbs. No auth-name exclusion, schema relaxation, response assertion removal, or production change is included. C01-7/C01-8/G01 retain bidirectional route coverage within the captured API-v1 domain. Root auth remains covered by WA04 and server/independent tests.

Target first attempt: exit 1, G01 passed, two cases blocked by listen EPERM. Managed private-loopback second attempt: exit 0, 3 passed / 27 skipped, 802 ms. Logs are `fixture-repair-target*.stdout.txt` / `.stderr.txt`. No build or full suite was run by B.

The necessary noEmit check of both full legacy files exited 2. Its complete diagnostics are preserved in `fixture-repair-noemit.stdout.txt`; these cover unrelated file areas and unresolved root Fastify types, with no diagnostics at the newly inserted helper or modified enumeration/title lines. This does not establish that all reported diagnostics predated this repair, and is not reported as a clean test-file typecheck. No out-of-scope corrections were made.

`fixture-repair-edit-context.txt` records the exact authorized edit locations. The inherited Git dirty diff is not attributed to this repair. Product v3 manifest remains unchanged; the independent fixture manifest covers only these two files.
