# M7.1-A independent functional verification

Completed the root-authorized local serial window. Product scope is internal check domain, scoped artifacts and schema6 maintenance; no frontend development, browser gate, new HTTP/client check API, native Agent claim, external model or VM/daemon work.

## Actual gates and first failures

- Actual build1 failed TS2322 (2.862s): four new idempotency families did not reach exhaustive switch cases. A v2 fixed the switch; B caught artifact URL projection mismatch before execution. **Build-v2 was not run**. A v3 reused canonical artifact projection and added CA05; actual build2 (`build-v3`) passed (12.198s).
- Source noEmit first passed (1.453s), and narrow assertion repair recheck passed (1.761s).
- Initial 17-file focused run: **100/101**,16/17 files (21.617s). Only old DF05 expected all expanded15 reasons from a no-check fixture. Root-authorized B fixed explicit original12 order/set without relaxing original checks; D added three exact reasons in existing MI02/MI04. Related2-file repair: **13/13** (3.620s). No repeat101 run.
- Typecheck0 (8.794s), lint0 (8.457s), schema sync0 (.077s), workspace concurrency1.
- **One full core run: 884/892,143/144 files (293.301s).** All8 failures were old legal legacy fixtures in `m0-m1-r4-b-regression.test.ts` that serialized current6 but failed to remove four new check tables before their existing v1 downgrade. Correct classifier rejected mixed structure. Root-authorized B added one child-to-parent drop helper and exactly8 legal fixture calls; original assertions, faults, negative mixed-schema cases and timeouts remained. Entire related old file repair: **82/82** (8.272s). **No second full run.** Final evidence combines the one full run and the corrected related file; it is not a claim that the initial full run was green.
- Current28 and29 each once: exit0 (.532s/.507s). Other current probes reuse accepted evidence; no full25/29-probe matrix, browser or host matrix.

## Independent evidence and accounting

New24 cases (A11+B3+D10) passed initial focused and were included in the892 full count; do not add24 again. D MI7 cover actual two-process WAL request-version/same-key races, transaction rollback trigger, verify-only authorization/expiry/rotation and sealed same-actor denial, latest attempt, terminal replay, causal immutable decisions, all three thread events and check reasons. SQL is explicitly confined to controlled corruption/unavailability cases; successful formal states come from real handlers/services. MSI3 use protected archived V5 copy hydration, explicit5→6, migration/restore publication fault atomicity, physical preservation and credential rotation, plus genuine new run/log/receipt/accepted decision and logical export/import exclusion of trusted bindings. Real SQLite/service/handler assertions are distinct from controlled fault tests; no TCP claim is made for app.inject.

## Integrity, cleanup and limits

`final-integrity.json` matches final A23/B27/D2 owned source freezes, four immutable V5 assets, all nonowner fresh source/config/tests, HEAD/lock, document/SQL/archive/integration protections. Old11026 evidence inventory reused without recursive scan. Current dist547;97 entries differ from fresh535 (including12 new). Post-full dist hashes remained exact through narrow old-file repair/current probes. Complete successful-build/pre-full dist inventory was not saved, so full-period byte identity is not independently claimed. Planning-only work in this new package is outside product drift.

`cleanup.json` records26 own runner/command PIDs absent. Fixture finally/afterEach paths remove their owned temporary material; no independent complete temp-directory census was saved, no old temp directories were scanned/removed and no unrelated process was killed. Raw command receipts/stdout/stderr, original failures, author v1/v2/v3/v4 records and exact deltas remain retained.

Functionality is ready for root acceptance; metadata and next HTTP/client phase remain separate. Full source counts and current-probe evidence must retain the above failure/repair distinction.
