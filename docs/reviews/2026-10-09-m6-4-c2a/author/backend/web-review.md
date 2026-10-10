# A independent static review of B — M6.4-C.2A

Reviewed B actual source and exact-before source.diff, four owned paths and existing fixed-reader/session/generation wiring. B freeze SHA256: `6954a08bbc50d0a926027e588cb6cb8709713d2a351550cdec63fac5357a4261`.

- `packages/web/src/app.tsx`: `14e81e14717c0e44f993c61c3ac429794c6b520ad24ba312acc40ca95747e3d1` (matches B freeze: True).
- `packages/web/src/knowledge.tsx`: `bab4ce6f7e2a669e27b477da9e66519eee3d6d6f5a29c36d4a6caabd249d1b6b` (matches B freeze: True).
- `packages/web/src/styles.css`: `d1f6672b075f03e5b2b9aae3ec22fd7cb477d56b644d5c5ed9b9ea54480a78a0` (matches B freeze: True).
- `tests/contracts/m6-knowledge-web-input.test.ts`: `630d4472e86af4c9a9b11f6990a5133f7210a66662eb8922190fb258f455a206` (matches B freeze: True).

No actionable source defect found within this boundary. Findings navigation calls existing shared-client getView, then canonical whole-array parser with requested-space binding. Explicit 25 findings / 50 failures copy matches the backend caps. Both parsers preserve raw DTOs, null/missing material and safe metadata, and reject malformed arrays rather than partial rendering. Existing search/open-question parsing was not widened.

Cards retain author-report interpretation and distinguish phase, check status and current validity. Pending/not_required do not become passed; accepted is explicitly historical and associated with fixed target_revision. Failure dependency reviews do not award acceptance to failure. Current item and fixed review target actions use existing openPost fixed reader, and copy explains the separate round-directory selection. Public relation refs/status/authors remain visible without submission or evidence-body reads. Structured values are React text; summary uses existing SafeMarkdown.

Findings results and loaded flag clear with existing clearSpaceViews, invoked on space/auth reset and logout. Requests use existing generation/abort/run control; late results cannot populate a switched-space findings list. Fixed reader preserves findings origin and returns to cached results, with explicit refresh available. Protected ReviewPanel source was not touched. Responsive CSS supplies wrapping/stacked facts, but actual 390px/keyboard/browser behavior is unverified here.

Four new tests are pure parser/guard evidence and are correctly described as separate from SQLite/HTTP/ACL proof. All runtime/build/type/lint/test/browser execution remains pending sole D window. No B source edits performed by A.

Compatibility boundary: this package expands the findings/failures response contract. Flags cease being constant not_enabled and required formal_review is added. Existing strict old clients/Web builds require the coordinated server/client/Web update; this review does not claim seamless old-binary/schema compatibility or a global API version change.
