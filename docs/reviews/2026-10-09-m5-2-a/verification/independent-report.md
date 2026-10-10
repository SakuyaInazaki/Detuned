# M5.2-A independent acceptance report

The finite native TLS, CLI lifecycle and HTTPS browser-session scope passes independent verification. No actionable product defect was found. This report is for parent acceptance; deployment, public certificates, system trust and complete M5 remain outside this package.

## Actual gates

| Execution | Exit | Actual result / duration |
| --- | --- | --- |
| Root build | 0 | 7.229 s |
| Root package typecheck | 0 | 5.838 s |
| Root lint | 0 | 6.290 s |
| Default core suite | 0 | **699 tests / 105 files**, 72.511 s including launcher |
| Current probes #5–29 | 0 each | 25/25, sum 16.925 s |
| Independent native TLS probe | 0 | Five groups, 2.768 s |
| Independent IP / empty-SNI negative | 0 | One targeted counterexample, 0.505 s |
| Browser first selection | 1 | Two old journeys passed; TLS201 helper failed, 7.351 s |
| TLS201 only, corrected helper | 0 | One journey, 3.691 s |
| Final browser-source noEmit | 0 | Nine browser files with source aliases, 1.368 s |

The core run actually executed the four new server TLS tests and three built CLI TLS tests. B's earlier source run skipped all three and is not counted as behavior evidence. Browser acceptance is **three unique journeys**, combining the first two passes with the targeted TLS pass. Current29 is four actual root gates plus 25 probes: 21 original scripts and the four previously approved #11/#27/#28/#29 adapters. No new adapter was introduced. No E2 performance run was repeated.

[Complete gate audit](gate-output-audit.json) reads and hashes all stdout/stderr streams and parses the complete 25 probe JSON outputs; [current29 results](current29-results.json) retain exact commands. The known pnpm dependency-state warning is retained in stdout; Vite bundle-size warning is retained in the build output. #28 has 66 existing Ajv date-time-format warnings, not a new successful date-time validation claim. Browser NO_COLOR/FORCE_COLOR warnings are retained. No successful gate was repeated.

## Independent real TLS and lifecycle facts

[Five-group receipt](tls-independent-first.receipt.json) and [original logs](gates/tls-independent-first.stdout.log) establish:

1. Real Fastify HTTPS with a private CA and SAN leaf serves trusted health. Wrong CA produces `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; wrong hostname produces `ERR_TLS_CERT_ALTNAME_INVALID`. A 20 KiB header succeeds and a 66 KiB header receives 431.
2. Nine actual CLI negatives—unpaired flag, missing files, symlink, FIFO, oversized file, invalid PEM, mismatched pair, unreadable owned file and TLS with HTTP Web origin—exit 2 before creating the target data directory. Output is fixed and contains no PEM, certificate path or native error disclosure. Twenty-four same-process loader failures leave the observed own FD count at 13→13.
3. Actual TLS CLI receives SIGTERM and SIGINT while three test clients remain open: raw TCP without ClientHello, completed TLS without HTTP and partial HTTP headers. No client was preclosed. The child exits naturally with code 0, all sockets close, SQLite reopens and the strict directory lock can be reacquired. The receipt's 5.554 ms interval includes socket closure and DB/lock recheck; it is not a pure process-exit latency measurement.
4. An actual occupied-port listen failure exits naturally with code 1 and still permits SQLite reopen and strict lock reacquisition.
5. Real TLS long-poll and partial multipart upload enter resource handlers before app close. Observation wrappers record cancellation, route finally and actual staging finally before app closed → DB closed → lock released. Active resources reach zero, staging is empty and artifact/event/ack state is unchanged. This busy-resource trace is a library app with an owned shutdown sequence; the actual CLI child socket/listen checks above are separate evidence.

[IP negative receipt](tls-ip-sni-first.receipt.json) uses a DNS-only localhost certificate against an IP URL with explicit empty SNI, explicit CA, `rejectUnauthorized:true` and the default hostname verifier. The actual `ERR_TLS_CERT_ALTNAME_INVALID` proves empty SNI does not disable IP SAN validation.

## Browser and preserved first failure

TLS201 uses direct native HTTPS and real SQLite with an ordinary human. It verifies Secure/HttpOnly/SameSite=Strict/path cookies, no readable document cookie or local/session storage, real static assets, no-store auth response, Host/Origin/CSRF denials with no business changes, fixed-revision reading, one authored note, and reliable logout revoking the former cookie. [Browser receipt](browser-tls-browser-second/tls-browser-receipt.json) contains only safe booleans and statuses.

Chrome runs in a disposable nonpersistent context with `ignoreHTTPSErrors:false`; only the private leaf's SPKI is allowed through the explicit launch exception. This is a limited leaf validation exemption, not system PKI validation. Node CA and hostname checks remain independently strict. No HAR, trace, storageState, video, user profile, system trust or model account is used.

The first TLS201 failure occurred after browser login/cookie/storage/assets checks, in the Node auxiliary request. It retained only a safe generic error, so no native code is claimed for that failure. The installed Node HTTP-agent source and the saved test helper show that an intentionally wrong HTTP Host also supplied inferred TLS servername. The only correction makes TLS identity come from the target URL; the intended bad-Host HTTP denial remains asserted. [First source manifest](browser-first-sources-manifest.json), [installed-source fact](node-host-servername-fact.txt) and [first complete output](gates/selected-browser-first.stdout.log) preserve the failed version. Only TLS201 was rerun; both old passed journeys were retained.

[390px real viewport](browser-tls-browser-second/screenshots/tls-human-narrow.png) was actually viewed and accepted by the parent for the visible layout. It does not establish full-page or general accessibility certification.

## Source review and protection

Final A5 manifest SHA is `906422246981e46fe4b13cba4d21b1d43ebf5beec42679e3ff7d1b2d285ba963`; B2 is `415474da35cddc8f04b3dc138997a6bcc1accdfedd4ad3563ffa9295423218c9`. Both still match every product/test byte. D owns only fixture/config/new TLS browser spec. Source changes are exactly ten authorized paths: five changed and five new, source count 317→322. All six old browser specs and all eight Web source files are unchanged.

The actual diff/source review covers `tls-config.ts`, `tls-sockets.ts`, server app/index, CLI index, and D fixture/config/spec. The loader uses bounded 1 MiB same-FD reads, O_NOFOLLOW/O_NONBLOCK, regular-file checks, before/after inode/size/times and finally-close; caller buffers are copied and checked by native TLS context before composition. Errors are fixed. App options and return types retain a real HTTP|HTTPS union; TLS minimum/header cap are native HTTPS options. CLI paired loader and origin checks precede directory/lock/DB access. TLS socket drain follows synchronous business cancellation and awaited resource finally, then Fastify closes before existing CLI DB/lock teardown. No route, ACL, schema, existing shutdown helper or HTTP business algorithm was altered. [A's independent CLI source review](cli-source-review.md) agrees without replacing runtime evidence.

[Protection results](protection-results.json) and [exact-before audit](exact-before-audit.json) confirm 41 preserved fresh byte copies, 7,785 old review files, four SQL/archive files, two schema profiles, HEAD and lock remain identical. Lock SHA remains `ea84a3709fe9a54b1a1fb1e0e9403ab9fd6e363ed8a3ecf7ba0cbf536be94f4f`. No dependencies were installed. Current nonstatus documents remain unchanged; only the author's implementation-phase progress note changed before metadata handoff. Built dist changes are ten expected existing server/CLI files and eight new TLS helper artifacts; Web dist is unchanged. [Exact source diff](exact-before-source.diff) is based on fresh stored bytes, not guessed historical content.

[Cleanup results](cleanup-results.json) confirm thirteen owned test directories removed: five main fixtures, one main certificate directory, one combined IP fixture/certificate directory, four browser fixtures and two browser certificate directories. CLI children naturally exited and were reaped; browser close is awaited. The parent-authorized `/private/tmp/detuned-colima-owned-608g1enf` VM is intentionally retained for the next deployment package and is not a TLS test leak.

The next action is parent acceptance followed by current-document metadata closure. No deployment or next-package product work is claimed here.
