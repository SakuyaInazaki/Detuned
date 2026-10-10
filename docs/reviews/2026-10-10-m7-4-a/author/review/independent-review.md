# M7.4-A A v1 independent static review

2026-10-10. Reviewer B. Static reads, exact-byte comparison and SHA-256 calculation only; no syntax/build/test/native execution. Findings below are source-level counterexamples, not observed runtime failures. A/D source was not modified.

## Inspected freeze

Actual file is `author/backend/freeze.json`, SHA-256 `28baa0312a5b973de00f8ca848c92291a166c8aa85213584225991ad7232bc3c`; `source.diff` SHA-256 `1144860daa96776e5ac478374a80659c15187a7e6087f2d1efef99c4c3480a38`.

Recomputed all three source entries against that manifest:

| Path | Bytes | Actual SHA-256 |
| --- | ---: | --- |
| tests/fixtures/pi-runtime/native-lifecycle.mjs | 22831 | 1477a6bf5289b86db3d4b6a708d78c3c29d61d9c51e4cc2b9efe13b25e21bb9a |
| tests/contracts/m4-pi-native-lifecycle.test.ts | 4228 | d5113e6b5e86cdf814e37d28b5c8fe6857609bf6585f4e5e43fd4be17b06e0a5 |
| scripts/integrations/claude-check-probe.mjs | 18869 | ee2dc9055f6f996b7f8e5328685a63cceca9c9c69c442743295ec3f91d1415ca |

## Actionable findings awaiting root disposition

1. **Claude control stdin can bypass cleanup on asynchronous stream failure.** `claude-check-probe.mjs:69–70` consumes native stderr and observes child process error/close, but attaches no native stdin `error` consumer and calls `native.stdin.write` without a completion callback. If the fixed native process closes its input or exits after the `closed` check but before the write completes, an asynchronous `EPIPE`/`ERR_STREAM_DESTROYED` stream error can be unhandled. An unhandled EventEmitter error terminates the controller outside its promise catch/finally, leaving the owned server/database/directory or children unreaped. Narrow repair: record/consume stdin errors and turn failed writes into awaited safe control failures which enter the existing finally; do not merely swallow the failure or report success. This requires no host/tool/schema expansion.

2. **Cleanup failure skips remaining owned resources.** New Pi cleanup at `native-lifecycle.mjs:259` and Claude cleanup at `claude-check-probe.mjs:78` put all resource releases inside one sequential try. For example, a rejected `host.dispose()` prevents Pi app/database/directory release; a failed child close prevents Claude remaining children, forbidden listener, app/database/directory release. The outer catch only captures the cleanup error. Narrow repair: independently attempt each applicable release, record the first cleanup failure, preserve the original operation failure as primary, and only claim each cleanup fact after that release succeeds. Preserve old six cases and budgets. This review does not assert that any release failed in an actual run.

3. **Fixed binary hash unnecessarily retains a 222MB buffer.** D identified, and root confirmed, `claude-check-probe.mjs:55`: `sha(await fs.readFile(binary))` reads the stat-pinned 222245312-byte executable into one buffer. Root requires a streaming SHA-256 preflight under this machine's resource boundary. Narrow repair: stream the same fixed file into the digest and preserve exact realpath/size/hash equality and prelaunch ordering. This is a resource implementation issue, not a changed binary authorization or observed OOM. No additional owner or runtime is needed for the source repair.

## Verified static boundaries

- Compared original Pi scenario body from `const dir = await fs.mkdtemp` through its old final brace against the before copy: exact bytes retained inside the new mode branch. Existing test is an exact byte prefix of the current test. Old six case assertions, 70000ms child watchdog and 80000ms case budgets remain; checks uses those budgets without increasing them.
- Pi imports the helper module through its exported functions. Its module top level imports built shared client and defines literals/functions; the CLI launch condition requires this module itself to be argv[1]. Importing it does not run native preflight, launch a binary, read HOME, create a fixture, or access accounts.
- The shared fixture uses actual HTTP clients for distinct maintainer, verifier and reviewer actors, current maintainer membership and scope-restricted ordinary credential. Administrator token is not passed to native tools. Real request/snapshot/profile, verifier log upload and receipt are shared-client setup, not SQL-forged state or advertised native tools.
- Shared matrix sends 501-codepoint reason, extra field, incomplete branch and prohibited ordinary verify/issuer operations before the first valid native tool call, and compares real onRequest counts. Successful create and six exact read selectors compare complete values to typed-client reads; invalidation uses 500 codepoints. Cross-space denial is real. No arbitrary file/binary/issuer branch is introduced.
- Pi activation itself is asserted zero HTTP; calls execute real registered definitions with a private model runtime, empty auth, no models path, model network disabled, private cwd/session state. Pending batch replay is compared exactly and explicit poll abort settles before disposal; ACK counts remain unchanged.
- Claude accepts only two distinct CLI flags, binds realpath/size/bytes to the fixed installed binary, keeps HOME unchanged and supplies an allowlisted native environment. Guard denies selected user state/Keychains/mach/network and all writes outside owned directory. Allowed/forbidden endpoint and forbidden sentinel checks precede launch. No help/version/model/user-message invocation exists.
- Claude success/error control nesting follows the sealed wrapped control receipt: top-level `control_response.response`, error JSON code, and success `response.structuredContent.result`. This is a static compatibility comparison, not proof the installed host currently accepts it.
- Child tracking uses actual `close` events rather than exitCode polling; native group TERM and 1000ms KILL escalation are present. Pending poll is observed and consumed, with no ACK. Apart from the actionable cleanup issues above, no change to ordinary business permissions was found.
- Reports are explicit whitelisted status/version/hash/tool names/check IDs/counts/cleanup facts, not raw native stderr/responses, credentials or private paths. Output staging uses `wx` with mode0600, file sync and hard-link publication, rejecting an existing output and avoiding overwrite races. Failed native work emits only safe failure projection. Runtime proof of guard, cancellation and cleanup remains D-owned.

## Disposition

Two concrete lifecycle findings sent to root, plus D's independently identified binary buffering issue adopted by root, await owner-scoped repair. No runtime acceptance claim is made; v1 remains frozen. A repair must be separately frozen and reviewed as a delta before release of D's execution window.
