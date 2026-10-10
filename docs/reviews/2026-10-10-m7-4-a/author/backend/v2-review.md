# Root-authorized peer-review v2 repair

Only the two owned mjs files changed; TS author test is unchanged. v1/source.diff/peer report and before-v2 bytes retained. No runtime or syntax/test check was run.

1. createNativeInputWriter(child) attaches a real stdin error listener, observes write callbacks/synchronous errors, rejects pending writes and caches a safe NATIVE_INPUT_FAILED error. Control awaits write and checks cached failure throughout response wait and after it. Importing this helper starts no host. Listener stays installed through actual owned child close, rather than exposing late unhandled stream errors.
2. New Pi checks and Claude cleanup independently attempt every created resource's disposal/close/removal even after an earlier failure. Success booleans change only after that individual operation succeeds; actual child close remains the sole children_closed proof. Original failure takes priority. Existing six Pi body and old TS cases/timeouts are untouched. Report-publication failure cannot replace an earlier domain/cleanup failure.
3. Fixed binary realpath/file/size/exact SHA preflight remains before launch, now via64KiB createReadStream SHA chunks; no222MB whole-file Buffer allocation. This is a hash implementation repair, not a new native version or runtime claim.

D adds a real own Node stdin pipe failure contract in its existing owner; native Claude execution remains optional D external evidence. Final verdict requires peer review and D execution, not this static note.
