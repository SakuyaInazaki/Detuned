# A v8 canonical-root and D guard binding review

2026-10-10, B, static only. A actual freeze-v8 SHA `2d173c96325a40e7bddfc07507fdbf59b0fb4dd0bfde485b535b484f1ac5ce9c`, delta `bf112e820fcb7737ef0025cdd1a9058c25e9a95a5fb9e0a459c5b936f9b3890a`; all three hashes/bytes recomputed and match. Claude21043 bytes SHA `e733a5ad1cf5963fa525910364b99c2602480c42855b8c137abaea16c48805b6`; Pi fixture/TS unchanged from v7.

A v8 is statically clear: the sole native entry allocates its own directory, canonicalizes once, checks directory/non-symlink0700/current UID, and only then derives all existing policy/cwd/token/settings/MCP/state/tmp/sentinel paths. Validation failure attempts removal of exactly its allocated directory and rethrows original error. Shared exported fixture/input-writer functions and CLI import/launch gating are unchanged. Actual policy literal compared with before-v8 is byte-identical. No policy strengthening/weakening, binary/prompt/HTTP/permission change or new owner appears.

The first independent guard result remains actual failure: allowed endpoint succeeded, forbidden endpoint EPERM, sentinel allowed; native not launched, cleanup true. Uncanonical tmp alias is a supported candidate explanation, not statically proven sole cause. V8 does not erase that weakness or claim restored denial before a related guard run.

D guard script current SHA `aee02bcf6e02f42468503c2fd24c48146fe1bb22bf5804281b9de0fb94448094` and plan-v7 bind exact A v8 module; same template SHA `02ea2a24fffbecc5e934c2a01d4311f8a8da89e8473ff839f4f0a2ed2f481ec7`. All policy/sentinel/profile/cwd derivations use canonical owned path, sentinel/profile realpaths are checked, and actual hit/child observations are captured before assertions. Result-v2 is a new wx0600 file. Original positive/negative expectations and actual-close budgets remain; native binary is only streamed/hash-checked, never launched by guard-only code.

One pending D-source finding sent root: `const allocated` exists only inside try; if `owned=await fs.realpath(allocated)` rejects, finally cannot access allocated, skips removal because owned is undefined, yet marks private_directory_removed true. Minimal fix is outer owned-allocation tracking, cleanup of exactly owned-or-allocated, and truthful mark after success, preserving original error. This is a verification-only early failure edge, not an A v8 defect or runtime-observed failure. Final D binding needs narrow recheck after root disposition.

Accepted core967/155 is prior D evidence to retain, not rerun/independently executed by B. A v8 changes only optional native entry and not core/shared exports; no repeat core gate is proposed by this review. Static report model_calls0 in guard-only code means no native/model operation is present; for later native code, accurately say **probe sends no prompt/model request**, not that this field measures every internal host model action. No field rename is made.

Disposition: A v8 clear; D guard early cleanup pending, actual guard/native outcome unknown. No runtime or normal metadata/source edit by B.

## Final D fallback delta closure

The preceding pending finding is retained; original report SHA was `32bc16f20a862b6985d0cd765a2ddee7b111f907297e07d58dbd171dd6e4e08f`. Root authorized D's sole early-cleanup repair. Recomputed final actual guard script SHA `324a0aeb19f298c50522bf63910672d8980c125e2751ecc15a1d8cfd462a3849`, plan-v8 SHA `65006bcac9c2cd729cfeb984c5d504490f1781be7dacc0edf6d69a3b15410eb1`, fallback delta SHA `22830df961d2a812502ef295647d598fb6b6fc3cce8f6036ab46ea4e8b2989c9` match D freeze.

Delta moves allocated directory tracking outside try and finally selects only owned-or-allocated, removes it, then requires actual lstat ENOENT before marking removed/absent. No allocated root is falsely reported removed after realpath failure. Cleanup failures stay separately recorded, original safe failure remains primary, and failure status cannot be overwritten into pass. No policy/expectation/template/native launch/minenv/hit/close/budget change. Final plan still binds exact A v8 module/freeze and new result-v2 wx file.

Final disposition: A v8 and D authorized canonical/fallback deltas have no remaining actionable static blocker. Second guard execution and any native release remain root-owned; no restored sentinel denial or native success is claimed by this review. Core prior967/155 remains prior evidence, not a repeated B gate.
