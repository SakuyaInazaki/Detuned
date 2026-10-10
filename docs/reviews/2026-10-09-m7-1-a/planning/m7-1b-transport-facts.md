# M7.1-B transport facts — read-only inventory

This is current structure and conflict inventory, not an API/route/tool-count design or implementation dispatch. M7.1-A frozen domain source is inspected; no product/generator/test/runtime executed here. Issuing verifier credentials is an authorized maintainer/owner once-only plaintext operation and must not be put in ordinary MCP tools.

## Current callable domain

`packages/core/src/services/check-service.ts`, CheckService constructor(storage, AuthService, IdempotencyService, clock, ids, hasher):

- createRun(auth, spaceId, req:CreateCheckRun, key:string):CheckRunRecord
- getRun(auth, spaceId, runId):CheckRunRecord
- getSnapshot(auth, spaceId, runId): returns existing readReviewSnapshotRecords intrinsic/online records object, not an already-defined public check response DTO
- getPostRevision(auth, spaceId, runId, postId, revision:number): stored fixed PostRevision, only target/dependencies in manifest
- issueCredential(auth, spaceId, runId, ttlSeconds=3600):{credential_id,token,expires_at}, transaction rotation, no idempotent retry, TTL60..86400
- submitReceipt(auth, spaceId, runId, req:SubmitCheckReceipt, key:string):CheckReceiptRecord
- getReceipt(auth, spaceId, runId):CheckReceiptRecord
- invalidateRun(auth, spaceId, runId, req:InvalidateCheckRun, key:string):CheckRunRecord

`packages/core/src/services/artifact-service.ts` has authorizeCheckUpload(auth,spaceId,runId,fresh=false):void; createForCheck(auth,spaceId,runId,input:CreateArtifactInput,key):Promise<ArtifactMetadata>; getCheckMetadata(auth,spaceId,runId,id):Promise<ArtifactMetadata>; getCheckContent(...):Promise<ArtifactContent>. Blob stage/hash/publish/budget/final registration and post-async scope/privacy refresh already reused internally. Generic artifact APIs still require ordinary space permission and cannot serve verify credentials.

Protocol review.ts exposes CreateCheckRunSchema, InvalidateCheckRunSchema, SubmitCheckReceiptSchema/isSubmitCheckReceipt, strict isCheckInstant and internal CheckRunRecord/CheckRunVersionRecord/CheckReceiptRecord/CheckRunCredentialRecord. Check run/receipt transport response schemas and targeted guards are not currently implemented; response-guards.ts was unchanged by M7.1-A. ReviewSnapshotView is an existing public review DTO but current CheckService.getSnapshot returns its underlying records object, requiring explicit projection/guard decision rather than claiming automatic DTO compatibility. History observed_request_version is internal causal state, not a newly authorized public field.

## Exact minimal source contact points

- packages/server/src/app.ts: builds review/artifact services and registers plugins inside /api/v1. No CheckService/check route plugin currently registered.
- packages/server/src/routes/reviews.ts: current review envelope/body/idempotency conventions, not check routes. New route path/design is a root decision, not inferred here.
- packages/server/src/routes/artifacts.ts: bounded multipart/stream handling and private no-store conventions; existing upload/read handlers only generic or review-assignment targets. Run methods have no HTTP wrapper yet.
- packages/protocol/src/review.ts, response-guards.ts, openapi.ts: response DTO/guard plus actual final OpenAPI paths/components construction contacts. Existing final Object.assign overrides require inspection, not just early component declaration.
- packages/client/src/client.ts: direct bounded request transport/reviewResponse/upload/read/download conventions, canonical validators and callTool dispatch. packages/client/src/artifact-transfer.ts carries file integrity/cancel transfer; local CLI uses shared node.ts/file-request-key-store.ts helpers.
- packages/cli/src/index.ts: explicit operation CLI and once-only privileged identity output/error handling contacts; source normalizer/getClient does not automatically discover actor/session.
- packages/protocol/src/tools.ts: forum_read is TypeBox strict Union with root object, read kind branches for review_request/snapshot/assignment/submission/submissions/status/decision, artifact etc. No check read kinds yet; existing forum_read can only already read review_status and review_decision check facts/receipt ID list, not run/receipt detail. client.callTool dispatch handles these explicit kinds.

No check route names or new tool count is selected by this inventory. Existing MCP/Pi adapters consume the same protocol tools and shared client. Credential issuance should remain outside ordinary MCP tool advertisement/dispatch.

## Verify identity discovery conflict

DetunedClient constructor only stores baseUrl/token/options: no implicit getMe or session. Direct request() and ordinary direct read helpers do not invoke identity discovery by default. write()/reviewResponse()/uploadArtifact call prepareWriteKey; with an explicit key or no logicalOperationId, it returns the key without getMe. With logicalOperationId+persistent RequestKeyStore it necessarily calls getMe to derive actor scope (client.ts prepareWriteKey), which verify credentials are intentionally forbidden to use. Simply routing a verify receipt/log write through this persistent path would fail before the run operation. It must not be repaired by granting verify ordinary getMe/list/space discovery. Once-only credential issuance also cannot use normal automatic request retry semantics; existing admin create/revoke uses retryBudget0 and is a structural precedent, not chosen new API.

packages/client/src/session-binding.ts getIdentity always calls capabilities then getMe; prepare(spaceId) uses discovered actor/space and creates/loads ordinary session. packages/mcp/src/bridge.ts calls binding.prepare before tools; packages/adapter-pi/src/runtime.ts likewise always prepare before tool call. Therefore existing authenticated MCP/Pi tool flows assume ordinary credentials and will reject a verify token before dispatch. Ordinary forum_read check facts can reuse ordinary preparation; verifier-specific bound-run HTTP/client/CLI paths cannot borrow ordinary preparation or expose signing credentials through MCP. This is the actual conflict, not proof of needed adapter/host changes.

M7.1-B still needs root-defined scope, fresh ownership and dispatch. No external host/version/authentication evidence is upgraded by this note.
