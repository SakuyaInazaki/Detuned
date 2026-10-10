# M2.3 independent acceptance preparation

2026-10-03. Baseline captured; no product/test/build/probe execution. Current uncommitted accepted M2.2-B implementation is the legitimate starting state and will not be restored. Exact DTO, cursor TTL/error taxonomy and scan budgets remain subject to parent freeze. This matrix states observable intent without inventing schema.

| ID | Finite scenario | Independent assertions after freeze |
|---|---|---|
| SQ01 | Chinese 图 / 失败 / 零权边; emoji and mixed Unicode, trim and q length boundaries | Branch and length follow Unicode codepoints, not UTF16 units; q only trim, no NFC rewrite; actual literal results match fixed material. |
| SQ02 | Quotes, FTS punctuation/operators, %, _, backslash in 1/2 and3+ queries | Input is literal, not FTS expression; LIKE wildcard escape prevents broadening; approved casefold behavior recorded per branch rather than assumed identical. |
| SQ03 | Two exact tags, case mismatch, query[], duplicates, comma-containing tag | All exact case-sensitive elements match current tags; [] no filter, duplicates same semantic filter; array transport preserves comma while CSV remains legacy two-element syntax. |
| SQ04 | tags/kind/thread combined with deliberately interleaved matching/nonmatching IDs and small limit | All filtering before ID DESC page+1; full finite traversal has expected IDs once each; final cursor null correctly, no gap caused by post-page filtering. Sorting is ID, not time/relevance/snapshot. |
| SQ05 | Cursor actor/space/q/tag/kind/thread/limit/sort bindings per approved payload | Original normalized equivalent query continues; approved changed binding rejects. No assumed limit binding before contract. Position/signature tamper, unknown version, expired token, naked old ID reject explicitly; caller migration restarts first page. |
| SQ06 | Invalid cursor with revoked credential/member/space scope | Current identity/space authorization precedes cursor handling/candidate reads; response follows existing401/403 policy without revealing target candidates. |
| SQ07 | Revision removes unique old terms; withdraw/redact; both LIKE and FTS branches | Current results remove old title/summary/body/tag material after revision; withdrawn/redacted results absent, cross-space absent; fixed evidence/revision reads unaffected. |
| SQ08 | Finite approved scan budget boundary and narrow-vs-broad queries | Actual QUERY_TOO_BROAD422 when budget exceeded, no partial empty result disguised as no match; exact unit/threshold from parent freeze. No 100k or unmeasured latency claim. |
| SQ09 | Existing knowledge/typed/artifact/history regression and current29 | Full suite and versioned manifest with exact counters; all previous reviews/SQL/archive/schema hashes protected; build outputs separated; old original28/29 preserved. |

Small independent fixture design: a deterministic finite set of Unicode/literal marker posts plus decoy tags and explicit IDs for sorting (stored test fixture designation if direct storage required), two threads/two spaces, two identities. Iterate both finite branches with small page sizes; use actual signed server cursor for negative mutations, deterministic clock only through approved injection mechanism. Historical old cursor is actual existing naked post-ID syntax, not a fabricated valid signed token. Do not rewrite product or prior probe expectations to force passing.

Required contract freeze facts before probe: tags_json schema/array limits/CSV whitespace/duplicate parameters; q Unicode boundary; scalar empty/unknown policy; normalized query/filter equivalence; signature purpose/version/TTL/current clock source/white list; precise cursor errors; bounded scan work unit and behavior. Existing text defaults are not presumed authoritative when parent contract supersedes them. Source audit will distinguish pure protocol guards from core authorization/token/storage decisions.

Current baseline: HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44;117 product/config/test,33 current docs/material,1953 old review/evidence,4 SQL/archive,2 schema/profile,208 tracked+32 untracked dist. baseline.json records actual dirty state and runtime. Capture excludes node_modules contents and prunes traversal there.

Previous package current versioned29/29 includes media-aware M2.1 ADv2; historical original R21 JSON-only manifest28/29 is a distinct retained diagnosis. Future compatibility updates must be versioned in new verification directory and retain coverage/failure origins; never modify old scripts/observations. Parent decides any incompatible expected semantics before replacement.

Not run: any M2.3 product check, full suite/current29/build; Node22, clean install, real hosts/models, remote CI, 100k/long load, M2.4 hard context budget, M6. Mechanism experiments by implementation agent under planning/tmp are not independent product acceptance. Await approved contract and stable freeze.
