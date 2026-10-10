# A domain/auth cross-review — final frozen-source review

B independently read current protocol/ports, AuthService ordinary-vs-verify gates, CheckService/authorization/records, artifact run scoped upload/read, review finalization/decision/validity facts. This is source inspection only, not execution or author self-report. Final inspected SHA set is bound below. B storage product remains frozen.

Concrete findings escalated to root/A:

1. Check persisted instants used Date.parse alone, accepting date-only values. Root accepted strict ISO fix; current source now uses protocol isCheckInstant based on full existing date-time format validation. Counterexamples remain author-test responsibility, unexecuted.
2. Intrinsic accepted decision could cite old pass attempt despite newer pending attempt existing before decision. Root accepted latest-run identity binding. Terminal request refuses new attempts, making current latest identity stable after decision; later invalidate changes versions without replacing identity, preserving historic immutable receipt. Current code contains the latest identity check.
3. Check-fail-derived changes_requested accepted a self-selected subset of failed receipt IDs because required.filter(receipts.some) only verifies subset order. Concrete required A/B both latest fail but damaged decision keeps only A still passed intrinsic reconstruction. Root accepted correction using new internal history observed_request_version. Current A source reconstructs all required latest runs at decision.version through the strict causal boundary; accepted requires every selected state pass and exact IDs, check-fail-derived changes_requested requires exact full failed IDs. Creation records advanced request version, completion/invalidate record current transaction request version. Post-final invalidate observed=decision version is excluded while active invalidation is included; no timestamp ordering guess. B implemented only authorized DDL/mapper/helper and D regenerated canonical schema once for this correction. Final frozen source is bound below; tests remain unexecuted by B. Negative-review decision [] priority must stay intact and later explicit invalidate must not destroy immutable past decision.

Other inspected boundaries: verify-only exact single-space, persisted credential/run/actor binding and inclusive expiry; general issuance excludes verify. Ordinary space/list/me/admin/Websession gates reject verify. Scoped check methods expose only fixed manifest posts/artifacts, own run logs/receipt, current privacy and fresh pending/active lifecycle for new uploads/receipts; replay rechecks scope and privacy without requiring pending. Rotation revokes only same-run tokens inside transaction. Receipt input exact hash/config/log binding, same-ID same-content reuse, cross-run ID conflict safe message, single terminal completion; create advances request version but completion/invalidate advance only run. Event/idempotency share transaction. Fixed checks select maximum attempt and failed→error→pending priority, no defaults or inferred algorithm truth.

Final A delta was independently reread: strict date validation; contiguous version state/receipt transitions and observed request-version monotonicity; per-required causal historical selection/exact receipt sets; same-instant later invalidation; selected-pass unavailable-log acceptance gate; normal issuer verify denial and ordinary access gates; event thread mapping/rate/replay boundaries. No remaining actionable source blocker found. No build/type/lint/test/noEmit/runtime by B.

## Final inspected SHA binding

A freeze SHA256 `df0aa550ba3b71906baf237410067a49bfeec428e2cda06d09df9f684c3f96c2`, source.diff SHA256 `823f4f5be0bd3eb7ec99fc52eb622a36b4a555b55a981fd203e9b01d2adec4c9`. All23 actual owner path bytes independently match the manifest:

- `packages/protocol/src/actors.ts`: `d1fe841a6eef3e152f631fd18276bbb2b48d4360d3b2a04eae948a81f2aca884`
- `packages/protocol/src/review.ts`: `c9596654c7be7d7dfbbe0c0381592a697b473039b0a183fbe2631ae98ff4d63e`
- `packages/protocol/src/response-guards.ts`: `648aa1de19fa0da3c1c9287ebc8c90c21a30981efd1cf14591e345b2f55f9dbf`
- `packages/core/src/ports/storage.ts`: `86c596b00477eeeed38cc8dac7a3f3fb5353aed978953553e4444d9d546b9fda`
- `packages/core/src/services/auth-service.ts`: `3a9391c3b4c0e84c0898792fb6919aea4b73c93bf650d603a98c7bd5e9f63835`
- `packages/core/src/services/web-session-service.ts`: `cb8850b9a44e0508569410bd494dbfdcf9c41b0a9ad15ffb11ef785d8fa8cfcd`
- `packages/core/src/services/artifact-service.ts`: `618847dd686b6e92dfb457dbe24bf0ca4ae0ec458eaf2ff3868586d5ae5c2b72`
- `packages/core/src/services/review-decision-records.ts`: `d5e9a463e3cf2e457ea26e1b635144fed7be64b37ab119fe08f4f4e7b6ec3068`
- `packages/core/src/services/review-status-facts.ts`: `9bc092b8dcaf65c44aa63290004ce13816b9533fd0f5a56b265333361ea2cd7f`
- `packages/core/src/services/review-lifecycle.ts`: `778c6aa2e423a18fadf29146b2c70b82234080f8878026017467541df2c85d03`
- `packages/core/src/services/idempotency-service.ts`: `d1e8c1e604043cd17faa4f38e7448a0d29dbf873066e842e3640dbf92a5de49b`
- `packages/core/src/index.ts`: `ec646d5d78f8ac793373ad44cb95bcc739051f615bb439ce2575c77b5bff5363`
- `modules/review/src/finalization-service.ts`: `2872234c68223397494a19a1ba38083533c9ec0eb79a9ca05f6fa443bc1f75f0`
- `packages/server/src/routes/spaces.ts`: `d69bd20ced1f885cfdea1dd89c26c3539f26661c316850a5eb64e1d977218d16`
- `packages/protocol/src/admin.ts`: `346658e9d0dc36729d57956d505fab75372e7c2dbfd57845b1aca77c340cf9d2`
- `packages/core/src/services/admin-service.ts`: `90adf751ebd03131c34f7987714ed6805de25afe20ac9763d07111baa38c573d`
- `packages/protocol/src/events.ts`: `82894e054882b49e8d2f34ea929a8f80ebfa3d27738d95da6466b288290c0de0`
- `packages/core/src/services/event-service.ts`: `9bf590c926a9a4febe479f6efa449fc8467d3a8a6305c62335f650a2f51f6369`
- `packages/core/src/services/check-service.ts`: `09f1bdc34b98c14e058dfc924dd477a9d35c973e03e516c3c00abe7fe8544e7e`
- `packages/core/src/services/check-records.ts`: `913377830da5c7ad3d6d140ce7a974a350e7b4066a6ed06f13f2da3258f84baa`
- `packages/core/src/services/check-authorization.ts`: `20344904b7d774f580bbde69c74d3925190e14a3b4f3a58f1bbff257bd1337c6`
- `tests/integration/m7-check-domain.test.ts`: `6bf78b56e3c0a3fa030890d1aa61a76a5b3ecc0ecb40dbcdc6164a5382113551`
- `tests/integration/m7-check-scope-artifacts.test.ts`: `92b03a1337f9cd111e6e2e05b347b2219a3c13f86b3aead8fe95e249f1013e61`

CD05/06 were read beyond titles: genuine dual failed runs finalize with two IDs; same-instant subsequent invalidate preserves history; SAVEPOINT damage removes an ID and expects RESYNC. Genuine old/latest pass final selects latest, old-ID damage expects RESYNC; selected ready-log redaction blocks fresh finalization. Controlled domain log registry differs from actual file stage/publish CA tests and D physical/logical maintenance. No executed-results claim.

D MSI03 added logical export/import segment independently read: actual exporter open/nextLine shapes, literal newline split, strict header excluded statuses, artifact record-kind/data shape, no check binding key/formal families, existing importSpace options, destination four tables empty and ready log imported missing with null binding plus FK check. Existing source projection/import behavior supports those assertions; D test remains unexecuted. Exact original capture is never modified.

Cross-review conclusion: no remaining actionable blocker in the inspected frozen A source or added D logical test segment. Runtime acceptance remains D/root. B products remain frozen at storage v2.

## Build-v2 delta follow-up

A freeze-v2 SHA eb11cb0d9ec612f502c88f7acc85a5c91603bba03a7df0db270d22d9cc0e87f7 actual23 paths match. Explicit four operation-family switch cases retain never exhaustiveness, parseOperation before extraction and compact result-reference validation. create target binds request via reconstructCheckResult; invalidate/receipt/artifact targets bind run via parseCheckResultReference. equal against actual intrinsic/history reconstruction avoids arbitrary returned objects. No cast-to-never or old assertion removed.

New concrete issue discovered in this delta: fresh artifact.check equal compares protocol toArtifactMetadata encoded content_url to reconstructCheckResult manually constructed unencoded URL. Legal Unicode/special-character retained space ID therefore causes RESYNC rollback, unlike UUID-only fixtures. Root/A notified to reuse canonical toArtifactMetadata after existing identity/privacy checks; pending narrow correction before declaring this newer delta clear. This is static source finding, no test executed by B.

## Final build-v3 delta review

Actual A freeze-v3 SHA `ee912275acd6152b6c4091297aae862e315cfaa0ea56657a568597fb26fce895`, delta SHA `dc74934b5e1686feefe6d6b9f1b0fbb38d0c7524fd11a124eaec9a704cc912bd`; all23 actual paths match. Only check-records.ts and existing scope/artifact test differ from v2. Reconstruct artifact.check now returns canonical toArtifactMetadata after unchanged run/space/owner/visibility and online redacted/ready checks; real result/replay share percent-encoded URL and exact public field projection. Four explicit switch families and never exhaustiveness from v2 remain intact, target binding and equal actual/history reconstruction preserved.

CA05 statically inspected beyond title: controlled legal Unicode/slash/space ID seed only, current same-space reviewer memberships; genuine HTTP thread/post, real service request/run/credential, actual blob stage/publish log create/replay and metadata URL agreement, one persisted artifact. No SQL manufactured formal state. This is one added author case, yielding CD6+CA5=11, still not executed by B. Test closes concrete encoded URL mismatch.

Conclusion for final frozen v3: no remaining actionable source blocker found in this bounded delta. D may run only under root authorization; B executed no gate and storage v2 remains unchanged.
