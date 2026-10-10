# M5.1-D.1 protocol/client exact-before ownership facts

Read-only preparation against the [frozen D.1 task](m5-1-d1-task.md). No implementation, build or test. C's frozen Web files and all old review bytes stay unchanged. Proposed names below are implementation candidates for parent freeze, not already public APIs.

## Existing files needing exact-before capture

| Path | Minimal role |
|---|---|
| `packages/protocol/src/index.ts` | Add only the new catalog module's wildcard export; existing guards/policies/OpenAPI are already exported. |
| `packages/protocol/src/request-policies.ts` | Existing LIST_LIMIT=1..100/default20 and CONTEXT_BYTES=4096..65536/default12288, strict transport policy. Reuse these; only edit if parent chooses a named catalog policy/limits constant here rather than in the new module. |
| `packages/protocol/src/openapi.ts` | Sole source function `generateOpenApiSpec()` at59: add two paths and shared query/full-envelope response schemas. Its standard HTTP-verb loop and query-policy post-processing must still handle metadata properly; add exact catalog cursor schemas to the existing cursor override logic (694–697), rather than weakening old endpoints. |
| `packages/protocol/src/response-guards.ts` | Proposed location for two targeted known-response guards, keeping current Me/Session/Web guards unchanged. Existing full date-time predicate and controlled format derivatives can serve actual `created_at` array-item fields; no global format registry or schema walker. If parent chooses guard colocation in new DTO module instead, this file need not change. |
| `packages/client/src/client.ts` | Two thin GET methods using `requestWithBody<unknown>(options,undefined,true)` plus targeted response/binding validation. Existing request/old full revisions stay unchanged. Encode path IDs; accept query+AbortSignal; response fixed post/ref consistency is client protocol validation, not ACL/cursor-business duplication. |
| `packages/client/src/index.ts` | Thin type reexports only if callers need named catalog types; current wildcard client.ts exposes methods but imported protocol types are not automatically public named exports. |

Dependencies referenced **read-only**, not requiring product edits: `packages/protocol/src/posts.ts` (old full revision/content unchanged), `threads.ts` (bounded page completion/meta pattern), `common.ts` (envelope api_version/request_id), `artifacts.ts` (25MiB upload metadata must not be reused for catalog claims), `packages/client/src/artifact-transfer.ts` (existing bounded JSON reader/cleanup), `packages/client/package.json` and `packages/protocol/package.json` (exports/build only, no dependency change).

## Proposed new paths

- `packages/protocol/src/post-catalogs.ts`: dedicated DTOs/query/cursor payloads/page+full-envelope schemas and envelope serialization byte helpers. Revision catalog metadata only; attachment catalog ready/missing allows bytes through MAX_SAFE_INTEGER and original arbitrary purpose; redacted exact id/state. Do not reuse ArtifactMetadataSchema (25MiB/content_url) or PostRevisionSchema (full body). Preserve old schemas unchanged.
- `tests/contracts/m5-post-catalog-client.test.ts`: candidate B-owned contract tests for DTO/OpenAPI/query guards and bounded client response/ref mismatches; exact filename/case ownership is for parent/D freeze.
- New review `author/client/**`: source noEmit/targeted logs, actual report and freeze manifest. No empty product module before next fresh.

## Generated OpenAPI/artifact facts

There is no checked-in generated `openapi.json` or separate code-generation script found in protocol/server/scripts. Existing contracts directly import `generateOpenApiSpec()`; the spec is produced in memory. Build emits `packages/protocol/dist/openapi.js/.d.ts` (+maps), plus new module/index/guard outputs, and client dist outputs. D's build-artifact capture owns these generated files; B does not hand-edit dist. No server OpenAPI route needs adding merely to expose a generator.

## Actual bounded JSON transport and remaining decision

`client.ts229` private executor already selects bounded JSON when its third argument is true: fetch/late-response abort at314–315, explicit reader at378, cleanup at530. `artifact-transfer.ts90–114` reads at most1,048,576 raw bytes, awaits complete EOF, fatal UTF8 then JSON parses, and finally observes reader cancel/release. It races abort/timeouts through the existing helper; same executor carries BrowserSession credentials/CSRF (safe GET has no CSRF), Bearer/default bounded retry/error-envelope behavior. Reuse it for both success **and error** catalogs; do not call legacy `request()`/`res.json()` and claim bounded.

The reader has artifact-specific fixed diagnostic text but its cap/algorithm already fits both catalogs' <=65,536-byte wire pages. Parent should explicitly authorize reuse as-is (safe existing ClientProtocolError) or a minimal naming/error-text adjustment; no extra transport framework is needed. Do not change existing reader/stream algorithms just for the new wrappers.

Validate the returned full page's strict schema/created_at and metadata variants, then require revision `data.post_id===requested P`, each revision positive/not exceeding returned current revision, and attachment `data.ref` equal requested `{post_id:P,revision:R}`. Preserve server signed cursor as opaque. No trust in static assertions alone; no JSON/body field normalization, response coercion, or source signature/permission claims. Exact within-page ordering/uniqueness checks and full-envelope-vs-{data,meta} guard placement should be frozen with the two method signatures; no new business route/field is necessary.
