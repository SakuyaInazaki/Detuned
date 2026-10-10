# M2.3 independent final verification

2026-10-03. Finite local engineering verification passes; parent makes acceptance decision. No newly observed production defect, no failed product check, no verifier product/formal-test/history edits.

| Evidence | Actual outcome |
|---|---|
| Current versioned commands |29/29 exit0, one unified build/typecheck/lint/fullformal |
| Full formal |24 files /252 tests passed |
| New search formal |core9 + HTTP/client/schema/tool5=14 |
| Prior knowledge |core7 + contracts4 retained; independent KV01–08 rerun pass |
| Prior typed writes |core12 + contracts5 retained |
| Prior attachment |core9 +FS6 +HTTP8 +CLI4 retained |
| Legacy |B82, C26, G4 retained; AC6,ADv2 5,AE5,U8 allpass |
| Independent search |SQ01–08 first run pass; native localhost app/client largeURL pass; SQ09 current29+integrity pass |
| Real historical HTTP fixtures |3 original-key201; fresh create400, revision stale409 then currentexpected400; changed samekey409; restart3; tombstone201; revoked401 |

`observed-search-first.json` contains finite grouped SQ01-02/SQ03-04/SQ05-06/SQ07/SQ08/native results, not six unrelated tests. Literal Unicode/symbol/tag-only requests and 5-page exact tags include normalization/limit change; budget independently uses exact frozen SearchService limits on real SQLite: short full property candidates422, narrowed distant match retained, longFTS candidates422, itemsbytecap1→422. Native actual app/client query uses a2700-character Chinese tag, logical JSON8104bytes and percent encoding >16KiB, proving transport beyond Node default16KiB accepts the legal query. No tag48 restriction was invented. Original search output's pending SQ09 was sequential provenance at probe time; now completed by commands/integrity, not rewritten.

`commands.json` preserves real exit/UTC/stdout/stderr for every current29 command; `coverage.json` maps counters and independent/prior probe results. `search-command-first.json` stores new probe timing; `prior-probe-commands.json` stores actual invocation/timing of old read-only KV/history scripts with all new stdout/stderr written here. No old scripts or observed records altered. Real old successful fixtures are the existing M2.1 hash-proven captured cases, not manufactured bad-shape successes; copied temporary DB preserves original and comparisons. Current-head post.current_revision is the previously approved sole dynamic replay field; fixed version/data/rawhash/result refs and no extra side effects remain strict.

`stable-before.json` / `stable-after.json` and `integrity.json`: all120 product/config/test and34 current docs/material unchanged during verification; all1953 previous reviews/probes/logs/evidence,4SQL/archive and2schema/profile original hashes unchanged. HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44 unchanged. Build normally updated24 trackeddist files, added4 untracked search-cursor outputs (32→36), no removed outputs. B had already built protocol/client before stable baseline, so their dist is baseline rather than a hidden test-period source change. Existing uncommitted accepted implementation was never reset.

Warnings: ADv2 stderr contains16 ignored date-time format lines; validation does not claim date string value-format checking. No other warning/deprecation observed in collected stderr; fullformal stderr identifies `$ vitest run`. Preparation-only schema inspection/syntax success is not product execution proof. All actual first product runs passed; no fixture failure was hidden or fixed during acceptance.

Current29 uses M2.1 media-awareADv2. Original historical R21 JSON-only28/29 failure remains distinct with source pointer in manifest; never claim original29 green. No replacement needed for this package's existing applicable29.

Limits: Node26.3.0/pnpm11.7.0 locally; Node22, clean install, remoteCI, real host/model and100k/long load not run. Pi installed validator/executor and MCPstdio are local contract evidence, not true host certification. Candidate count anditemsbytes caps are not SQLite VMCPU/envelope/context hard bounds. IDDESC keys are neither time/relevance ranking nor snapshot guarantee. SQLite nonASCII short-vs-long case difference remains intentional; no NFC/case rewriting. CLI search data-only/no cursor remains documented. No M2.4/M6 or formal research truth certification. `readonly-final-audit.md` records finite source conclusions.
