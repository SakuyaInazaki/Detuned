# B independent static backend review — C2B

Final conclusion: three actionable findings below were owner-corrected before final freeze, plus the same page-guard default-limit bound. No unresolved blocking defect found in the final inspected implementation. This is independent static review, not runtime acceptance. B does not edit A paths or run build/test/type/lint/runtime. Root accepted the following three actionable findings and authorized A owner corrections with counterexamples:

1. Review cursor payload initially only schema-checked nonempty IDs; an authenticated/synthetic signed payload with a lone surrogate before_submission_id would reach UTF-8 comparison after replacement encoding. Enforce well-formed Unicode IDs before comparison, including cursor actor/space/before. This is strict cursor-contract evidence, not a claim that an unauthenticated client can forge signed cursors.
2. New public-page guard initially allowed fewer than requested limit rows with non-null next_cursor. The service only creates next_cursor after finding one extra genuinely visible match beyond a full page. Reject inconsistent short-page continuation metadata; retain empty-page rule and whole-page rejection.
3. Final OpenAPI Object.assign initially overwrote new source description with old posts-only description and left x-logical-query-schema at SearchQuerySchema. Final generated construction must retain old posts semantics while documenting new source/filter branch and referencing canonical SearchSourceQuerySchema.

Preliminary review: phased intrinsic validation outside narrow online privacy catch follows the task; sealed rows are absent from SQL candidates; full-domain max+1 preflight before cursor filtering prevents budget bypass; no one-shot payload loading; six whitelist field traversal and per-value literal matching avoid cross-field/JSON metadata matches; first-match snippet preserves original text, reserves ellipses within320 codepoints and fits256-point query. Extra-match logic anchors continuation to last delivered ID, original cursor expiry propagates. New UTF-8 byte comparator agrees with SQLite BINARY for well-formed Unicode; no localeCompare. HTTP canonical source filters and tool Union+object root preserve old posts dispatch; typed review client returns strictly guarded complete page.

Filter pattern concern independently withdrawn: actual source contains two backslashes, consistent with existing \S pattern; tool display escaping was not a code defect. The preliminary review required reinspection after A freeze; the final binding and delta review below complete that requirement. No runtime acceptance asserted here.


## Final freeze binding and delta review

A freeze.json SHA256 `8ebdb8972f81a8356612c6946be900b56354b8e0b0d582d673650102f41cd598`; source.diff SHA256 `8b4a9192ed920db850d5d6b917c72ecdb005731bf98e00fc0c939aefbffdd385`. Read-only hashing confirms all15 inspected owner paths match actual final bytes. B did not run the generator or tests; the final OpenAPI construction sequence was read directly, including its terminal Object.assign override.

| Final inspected owner path | SHA256 |
|---|---|
| `packages/core/src/ports/storage.ts` | `32c8cacd7fdce02665d3fccd78f1d6585cab7b343ef14205180c4a0b7f2e0df4` |
| `packages/core/src/services/search-service.ts` | `57b6147831efef21439385ea32f0d1f4b1b73d679a9b9228506da18870f64631` |
| `packages/core/src/index.ts` | `98b98f88542f032f3d3c2f29e899a6d4a495d3e97a00a9840556d294b7d22258` |
| `modules/review/src/submission-service.ts` | `8cb73b651e4f3bd24bcfb4470ec8949d23b719035031d6eba825912d6311886f` |
| `packages/storage-sqlite/src/sqlite-storage.ts` | `497201e358c636704dbe818c1dd07e2d365b8a5a10b8e87644f61a5acc67e7b6` |
| `packages/protocol/src/search.ts` | `9af2a6a646cbae353b98572c9b69b532a61a9e1ca47b7bdae42a052d888cd4e7` |
| `packages/protocol/src/response-guards.ts` | `648aa1de19fa0da3c1c9287ebc8c90c21a30981efd1cf14591e345b2f55f9dbf` |
| `packages/protocol/src/openapi.ts` | `557b0eededb25be93407f2fcd398f06c0068e28ed1cee922964c16fa9db81d99` |
| `packages/protocol/src/tools.ts` | `6db0668afd99369ddd441a160e5611d761f981996f677d0e98069ef44e723368` |
| `packages/client/src/client.ts` | `684c8ceea408c77a486c285397314e5a6138f97bbe2ea167b8dff795a5e38700` |
| `packages/server/src/routes/search.ts` | `c6152c90df1a1fc8f55da32b143649a60b61b76a9a3170769decdb4c7d628c3a` |
| `packages/core/src/services/public-review-submission.ts` | `451fdcc2b74db39d65b2a4a5f0b8f63ed3615db408f066ee55c582da851cb932` |
| `packages/core/src/services/review-submission-search-cursor.ts` | `029d32482aed7b46dd84f917ce3a33e8e19d45e07402119e87b5d0f52fe29c05` |
| `tests/integration/m6-public-review-search.test.ts` | `4628ae4d23fdb47a97183b5b77f79bbd9ec136171c22bd6922b4dd1a6de42793` |
| `tests/contracts/m6-public-review-search-contracts.test.ts` | `5592d19df78825c5aee9f1decf1e5ccc3372eca752d2fdc5c787e40263a2219c` |

The cursor guard now validates actor_id/space_id/before_submission_id with isUnicodeReviewId, and cursor reader rejects unsafe before ID. PC02 independently supplies lone surrogates in each cursor field; the prototype check is now safe before byte comparison. The final public-page guard enforces supplied-query limit or default20 both for maximum rows and non-null continuation/full-page consistency; query absent remains the schema maximum100. PC03 adds under-limit next_cursor and21 default-limit rows, in addition to malformed dates, metadata, duplicate/order, unknown properties, scope/filter and321-codepoint cases. These are controlled contract checks, not public authorization proof.

Final OpenAPI terminal override references SearchSourceQuerySchema for logical source query, retains separate old posts SearchQuerySchema and description, and includes review literal search/revealed privacy/filter/candidate/cursor scope. PC01 checks actual generated spec fields when D runs it. No later override of this logical description/schema was found in the construction. TypeBox Union/anyOf and root object are preserved for forum_search; Static type derives from original Union, canonical validation stays dual schema/source validation. Existing MCP/Pi adapter source is reused unchanged; B tests only flat/wrapped/pure schema adaptation, no host activation.

## Final implementation boundary review

- Current read ACL and candidate domain/preflight/content lookahead are inside one outer readSnapshot. Existing SQL port only selects IDs from matching-space request rows and non-null revealed rows, ordered default SQLite BINARY DESC, at most maxCandidates+1. Request/target filters intersect before limit. Cursor before filtering happens later, so continuation cannot shrink the domain budget. Sealed rows do not consume the revealed budget or enter field matching. Invalid candidate Unicode is rejected before comparison. This bounds candidates, not SQLite VM/CPU or a5000-opinion performance certification.
- Intrinsic submission/request/snapshot/assignment/session/all-reveal validation precedes the narrow online catch. SyntaxError maps to safe RESYNC_REQUIRED there; other intrinsic errors propagate. Only online NOT_FOUND/CONTENT_REDACTED returns null without reason/count; other errors propagate. Current target/dependency/evidence privacy remains reused; missing/cross-space online evidence is intentionally invisible, not proof of healthy storage. Module getter's current own-or-public gate/snapshot and returned view remain unchanged except extraction of exactly its prior three privacy calls. Core depends only on protocol/storage/existing core helpers, not module/JCS.
- Search fields remain exactly verdict, coverage, checks_performed, pending requirements, limitations and independence text; arrays remain original order and each value matches independently. Matching/hash fold ASCII only, snippet uses original text and codepoint slicing. First matching field/first match includes whole256-point query and up to32 leading points, with prefix/suffix ellipses within320. No payload JSON, session/hash/evidence IDs, attachments or external text searched. Revision/withdraw/cancel/stale history is not discarded simply for that state; current privacy may exclude it.
- Lookahead finds one extra genuinely visible matching result; it never advances cursor to skipped private candidates. Cursor anchor is the last actual returned ID, source/purpose/actor/space/folded q/filters/sort bound, original exp reused. UTF-8 comparator is shared with whole-page guard and agrees with BINARY for valid Unicode rather than locale ordering. Item JSON-byte overflow is an explicit QUERY_TOO_BROAD, truncated:false retained; response1MiB transport/cancellation remains existing client behavior.
- HTTP strictly rejects source/filter crossings and unknown query keys. New typed client validates canonical query before HTTP and whole-page/identity/date/filter/order/meta after transport. Existing client.search signature/body and old post normalizer/hash/cursor files are preserved; explicit posts is stripped for dispatch. C2A getView body and legacy materials are unaffected by additive service method. No DDL/FTS/index, frontend/browser, M7, new host/model, dependency/global changes enter A diff.

## Tests and remaining acceptance

Six A integration cases and four A contracts cases were independently read, not executed. Real claim/eligible reviewers/session/submission/reveal and actual pagination/privacy/budget tests are distinct from altered response transport and schema-only cursor cases. Small threshold port test is explicitly not5000-scale certification. The original PS03 title implying original-expiry proof was corrected: its body covers pagination/actor/query isolation, while D owns the actual expiry experiment. Runtime rollback, cited/private-vs-unused evidence, WAL snapshot, corruption classification and other independent coverage remain D's acceptance work.

B's five adapter/CLI tests remain unexecuted and frozen; their controlled HTTP cannot substitute for SQLite ACL/privacy evidence. No build, typecheck, lint, test, noEmit, generator, runtime, browser, host or model was executed by B during this review. Root/D must validate final frozen source in the sole serial window before accepting this package. B source and A source are not modified by this report.

## Freeze v2 bounded delta review

Inspected freeze-v2 SHA256 `4afb5b481e8b6f18aa8bf3fd59138c9f0bc099ad53f69e6446632f7b956f434b`; only the following two paths differ from v1, and their actual bytes match v2:

- `packages/protocol/src/tools.ts`: `7b44a0e44a6c78571fc1ca777efccb894a1f7027077bdf6d403666181fd8f4ca`
- `tests/contracts/m6-public-review-search-contracts.test.ts`: `028bd5d78e60b6803232b8d6f1959bca4f35ebaa1e77d9c394ae7afcd5a869fd`

The common root properties reuse the posts branch canonical space_id/q/limit/cursor schemas, also identical in the review branch. Union Kind/anyOf/type object remains intact; neither root required nor root additionalProperties:false is introduced. Each anyOf branch still rejects unknown fields and opposite-source filters. Thus JSON Schema adds equivalent common constraints without excluding branch-specific source/filters or widening either branch. Flat MCP passes the complete schema; wrapped MCP nests that same complete schema under input, with outer strictness unchanged. Pi adaptation also preserves the schema object. The old S04 q metadata access is restored without changing the old test. No actionable constraint conflict found by static inspection.

PC03 now directly rejects an unknown page property with the whole-page guard; malformed row/meta fixtures remain transported in their correct data/meta envelope slots. It no longer claims existing client outer-envelope projection must preserve unknown envelope fields. PC02 adds metadata projection and legal/illegal branch examples. The shared request implementation is unchanged. This review executes no checks; D retains runtime acceptance ownership.
