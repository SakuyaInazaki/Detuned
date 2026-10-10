# B independent static review of A frozen backend — M6.4-C.2A

Conclusion: no blocking defect found in the inspected frozen implementation. This is source review, not runtime acceptance. No A source/test modified; no build, typecheck, lint, test, noEmit, server or browser executed by B.

## Inspected frozen identity

A freeze.json SHA256: `09c3b6e099a29e81ece1bd882b9b49945628c37eb85804d86d00a4468f9d2af9`.
A source.diff SHA256: `dd5dc36f37a125d68842d5777b844cb7fea7abf90f51d2c671ec5c9ddc429b2c`.
Read-only SHA calculation confirms all 13 frozen path hashes match current bytes (11 changed, 2 unchanged). The source diff and source/test files were inspected after A final freeze.

| Inspected owner path | SHA256 |
|---|---|
| `packages/core/src/services/search-service.ts` | `38ec6d7d3c3b3dc6d26546e8c87c493f3f6133377bb32d47c2f40f48f69a513b` |
| `packages/core/src/services/knowledge-projection.ts` | `e6e05ab14ca8dca3cd3148c0cac8978f455325052865e0a1b55cf0980518598a` |
| `packages/core/src/index.ts` | `d9dd7913fd0ea41ccef3bbee48e87ca0e4ff074e33481fc61acb115fd4b69cba` |
| `modules/review/src/status-service.ts` | `e3d01db1163c46292ead398287154ca09a2cdad046b9a19d64cd2d96b1bead8d` |
| `packages/protocol/src/search.ts` | `e287f999c21dec3160e922381e45cb6a8507734096f74d548be8dbf7c5b1c580` |
| `packages/protocol/src/response-guards.ts` | `426456b8ac8669f356310faf865c3534bdd92c36f51327c8e2c83aa6bbfed05f` |
| `packages/protocol/src/openapi.ts` | `2ff12d6d825b4f1be5894bd306cf54f2e124b487195fa059dd04ab18bd4ee05a` |
| `packages/client/src/client.ts` | `e148388d16db7301acb861ad6b1375addfbec96c01a70a0ea98fdf205bb2285c` |
| `packages/protocol/src/index.ts` | `772b344b5822506a069a34f74147c0e2560cb5742f9dd5c8c00fdc380e47b121` |
| `packages/server/src/routes/search.ts` | `97ee07315ff47e4a8aa5f6f4b2f5c1b8ea927b84d97a5d2c68d95a0dbdce549b` |
| `packages/core/src/services/review-status-facts.ts` | `688b656ce20d22576a3379c64b809520b9949c50f6dc9a2125a34512a8c073e9` |
| `tests/integration/m6-knowledge-status.test.ts` | `f3e5898ebc416eabddf0c73594da0796be5990944432ef7bb17ec3e5750510c4` |
| `tests/contracts/m6-knowledge-status-contracts.test.ts` | `eb92ec90029af45980a2290e146654ed387f8095e303efdc811535c9e5c209c3` |

## Review findings

- `getView` holds one outer synchronous read snapshot, refreshes authentication and checks current observer/read access before policy or material reads. Effective policy is obtained from Space.policy_revision and that exact SpaceRevision, canonical ReviewPolicy validation rejects missing/invalid/extra fields. Only malformed JSON SyntaxError translates to safe RESYNC_REQUIRED; unrelated storage failures propagate, and no stored contents enter its error text. No defaults, writes, event append, ACK or schema mutation were introduced.
- Latest selection calls existing listPostReviewRequests(space, post, 1). Inspected existing SQLite method uses round DESC with no phase predicate, so cancelled/stale rounds supersede favourable older rounds in projection. No-round flags derive only from effective enabled policy. Existing rounds remain visible even after policy disabling and retain their target_ref.revision rather than current item revision.
- New core readReviewStatusFacts is a thin aggregation of existing intrinsic records and lifecycle validity. Module ReviewStatusService retains its same read snapshot and refreshed observer/read gate, now reusing this helper. Dependency direction remains module → core; the new core helper imports only protocol, storage port and existing core record/lifecycle services. Frozen manifest required_checks yields only not_required/pending, not invented M7 pass/fail. Intrinsic validation and safe validity metadata are reused; output excludes manifest, identities, sealed opinions and private evidence contents.
- Legacy projection functions, field-by-field material handling, public relation projection, null/missing fields and limits remain unchanged. REPORT_FLAGS now retains author_report only; explicit status projection supplies canonical formal fields. Open questions retain their prior shape, with no client guard expansion to that view.
- Canonical DTO reuses ReviewPhase, verification enum and complete ReviewRoundSummary, with explicit nullable summary. Local targeted whole-array guards reject unknown/malformed rows, enforce item/summary valid dates, exact matching flags, matching post, requested-space scope and target revision not later than current item. Null summary permits only matching not_enabled/not_requested. Existing date validator is reused without global format mutation. Limits are findings25/failures50. Shared getView preserves generic typed array signature, request/abort path and envelope; targeted strict rejection occurs after transport. OpenAPI components remain canonical schema references and route description reflects the new facts.
- Frozen tests were read, not executed: seven integration cases cover actual SQLite lifecycle/current policy, latest cancellation, old target, frozen checks, challenge/redaction, snapshot/ACL ordering and invalid-policy failure. Four contracts cases separate real HTTP/SQLite evidence from mutated transport, and check typed envelope/canonical schema, safe malformed policy and whole-array rejection. No formal status is forged by SQL; policy corruption is explicitly fault injection. Build and execution can still reveal issues that static review cannot exclude.

## Remaining acceptance

D sole execution window must validate build/type/lint/source checks, new and relevant original tests, real browser and narrow layout. This review does not count pure/transport checks as real ACL or lifecycle acceptance. Full M6/M7 completion is not asserted. No source blocker or required owner repair identified by B at this frozen state.
