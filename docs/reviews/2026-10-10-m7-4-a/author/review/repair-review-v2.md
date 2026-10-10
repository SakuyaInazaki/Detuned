# M7.4-A A v2 narrow repair review

2026-10-10, B static delta review only. No runtime, syntax, build or test run. Original `independent-review.md` remains preserved; this review does not upgrade unexecuted counterexamples to observed failures or native certification.

Actual `author/backend/freeze-v2.json` SHA-256 `cefa5306cc32a5d4b3e5b947d80e7a0a093d499bc514ad2617702a28937f3c90`; actual `source-v2.delta.diff` SHA-256 `e0d42e461aa4b4970004034e75f95f44cd5a5507bbdfdf93949732e3b1742978`. All three file hashes and byte lengths recomputed and match: Pi fixture `631e93d57e39b1fb740896882f813c4db46a8e682a5bc7033e975492b84f7052` /23190 bytes; unchanged TS test `d5113e6b5e86cdf814e37d28b5c8fe6857609bf6585f4e5e43fd4be17b06e0a5` /4228; Claude probe `fe05f74a29c8ddc4e6cf0f9848cf227d4133d101aa4b2e5075e4f4306746d20f` /20489.

The three authorized repairs close the inspected static defects:

- Native stdin gets an error listener before the first control write. `createNativeInputWriter` caches a safe failure, rejects every pending write on callback failure, asynchronous stream error or synchronous write throw, and rejects later writes. `control` awaits callback completion and checks cached failure while and after waiting for response. Failure is not swallowed into successful tool output; it reaches the main catch/finally. The helper merely wraps an already supplied writable stream and neither launches a process nor changes control arguments.
- Both new Pi checks cleanup and Claude cleanup independently attempt each applicable release; a rejected release no longer skips subsequent resources. Original operation error stays primary; cleanup error prevents success. Success flags are assigned only after the corresponding awaited operation completes, with child closure derived from actual tracked close events. Claude safe failure publication cannot replace the original error, and CLI still emits only its fixed safe error line. No old six scenario cleanup was changed.
- Binary preflight uses a 65536-byte `createReadStream` and incremental SHA-256. Same fixed realpath, regular-file check, exact222245312 size and literal digest remain required before directory/native launch. Stream read failure rejects preflight; no weaker pin or extra executable input was introduced.

Rechecked exact old Pi scenario body against the original before copy and the old TS test as exact current prefix: both remain byte-preserved. The TS file is identical to v1, and old/new watchdog and case budgets are unchanged. Actual delta is limited to new Pi cleanup and Claude's three authorized repairs.

No remaining actionable defect in this v1→v2 repair delta. This is clearance of the reviewed source repairs, not release authority or a statement that D's independent fixture/native guard plan has no separate pending issues. D's reported redacted-receipt expectation and guard-stage dispatch remain root/D matters, and no runtime result is claimed here.
