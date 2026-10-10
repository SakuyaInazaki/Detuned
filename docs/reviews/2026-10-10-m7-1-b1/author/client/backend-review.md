# B independent static review of A B1 freeze v1

Inspected A author/backend/freeze.json SHA2564515da91290011c717ad0d984fbccaf82723f2ae7ab2330fb5e097be909cf18b and source.diff97611f78e65294e4e35882fd19d6bf9ce4dbb47c9b3fa7e222b95497af92726b. All11 actual owned source hashes match. Read actual route/core directory/guards/multipart/OpenAPI construction and existing domain authorization/history, not just author self-report. No build/test/runtime by reviewer; author CH01–05 are unrun sources, not evidence of passing.

## Blocking static findings accepted by root, pending D red evidence and owner fix

1. New isCheckRunView compares changed_at>=created_at. Existing accepted domain deliberately derives historical causality from versions, not wall-clock order: submit/invalidate use ClockPort.nowIso and readCheckRun requires strict instants/intrinsic versions but no clock monotonicity. Create at t1 then legitimate invalidate/complete at earlier t0 can commit successfully yet new HTTP projection rejects409; get/directory also reject otherwise valid stored run. Remove only this new timestamp-order condition, retaining strict ISO, pending version1/same creator/time and terminal/version/reason constraints. Do not change sealed M7A kernel to force a new timestamp rule. D real controlled-clock service/HTTP red case is pending; this is a source-derived counterexample, not executed proof.

2. Scoped artifact content route has no onRequest cache header; its handler sets private,no-store only after successful domain content acquisition. Authentication is app preHandler, so scopedcontent401 and domain404/410 occur before success header. Global app onRequest sets private,no-store only for review-* and can throw WebCSRF/draining errors before new check plugin or upload/metadata local onRequest. **Correction to initial message:** check plugin/upload/metadata local onRequest run before authentication preHandler, so their ordinary401 already have headers; do not claim otherwise. Minimal fix is owned app global early check-runs route matcher alongside existing review matcher, before global possible errors. Ordinary genericartifact cache behavior unchanged. D controlled early-error/header red evidence pending; no executed proof claimed.

## Additional final spec observation awaiting root scope decision

Fixedpost revision actual CheckPostParamsSchema is string ^[1-9][0-9]*$ with handler positive safe-integer conversion. Final OpenAPI checkOperation uses generic reviewParameter revision=minLength1 string, advertising abc/0 though runtime rejects. Reuse exact canonical revision parameter schema in owned OpenAPI path; CH04 should inspect actual final parameter, not only path existence. This does not require a new route/domain or old-post spec sweep.

## Verified narrow boundaries

Core getRequiredChecks does refreshContext→requireOrdinaryAccess→space observer/read before looking up requested object, then online fixed snapshot privacy and existing readRequiredCheckFacts in one readSnapshot. It preserves frozen order/latest attempt/nulls, uses same aggregation and returns no receipt body or all-attempt list; no new port/formula. Verify directory is intentionally denied before discovery.

Run and receipt public whitelist exclude created_request_version/history/credential binding, use full strict DTO plus target space/run. Snapshot guard checks manifest schema/canonical bounds and frozen check/profile order; builder already constructs only sorted required profiles, so that guard does not invent optional-profile exclusion. Client separately recomputes actual SHA. Pending/run-version constraints correspond to current real state transitions; clock comparison above is the exception. Issuer scope is server-owned and response intentionally has no invented scope fields.

Multipart new boolean branch defaults false for old ordinary/private routes. Same parser limit/active pool/staging/hash/MIME/publish/abort/dispose/cleanup is reused; check path preauthorization/key+empty metadata and final core createForCheck preserve domain binding. Only HTTP metadata projection rewrites scoped exact encoded content URL; core ordinary/idempotency projection remains unchanged. Metadata and content select existing check methods rather than loosening genericartifact ACL. Read/upload handler default branches preserve old behavior.

New protocol JCS file is byte-identical to exact-before module canonical-json.ts, SHA256da5f0dbb0d20760c5df62b2da8b2b07b2846c473cbcd0cb0c4e217bec6ff7b53. Old module is only three-name re-export and protocol index explicit export; existing two callers unchanged. No second serializer, altered limits or Node-only helper.

B product freeze1c953e5036d65c4a9a7c3ade58545508e09ae1325807f8b30a35768f5203addc remains intact. Stop same-source review at root request; final owner repair delta must be reviewed separately before clearing blockers. B2 facts are read-only planning, not product authorization.
