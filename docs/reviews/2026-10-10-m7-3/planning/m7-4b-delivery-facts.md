# M7.4-B delivery facts — read-only

No product or old evidence was changed; no build, test, CLI, container or host was run. Current AGENTS, README, docs00/08/11 and progress/review heads were read. Current progress.md:3 and reviews/README.md:3 point to accepted finite M7.3/schema6 evidence; M7.4 delivery remains pending. AGENTS.md:17–19 prohibit VM/daemon and subsequent frontend work; docs11:testing section requires actual, layered evidence rather than command presence.

## Runtime COPY closure

Dockerfile:2 and :16 pin Node22.23.3 bookworm-slim at digest b20fe038…c45bd. Builder COPY all, install and build are :10–14. Runtime :21–39 preserves root virtual store and package-specific package.json/node_modules/dist for cli, client, core, protocol, server and storage-sqlite; :40 retains existing web dist; :46–47 start built CLI serve. No modules/review path is copied.

packages/cli/package.json:16–22 depends on client/core/protocol/server/storage-sqlite. packages/server/package.json:19–28 includes @detuned/module-review workspace:*; server/src/app.ts:2 and server/dist/app.js:2 statically import it. modules/review/package.json:5–10 resolves dist/index.js and :19–21 depends only on core/protocol (already copied). The actual server node_modules/@detuned/module-review link reads ../../../../modules/review. Copying node_modules alone preserves this link but omits its runtime target: missing module package.json/dist/node_modules is a concrete recipe closure defect, independent of a live Docker build.

Minimal recipe candidate: Dockerfile only, add the existing module's package.json/node_modules/dist at matching /app/modules/review relative paths. No dependency, image/version, Web or other package change is required by this finding. Minimal static acceptance can enumerate production workspace dependencies recursively from CLI, map each workspace package to its real package directory, and require matching runtime COPY triples plus executable export files/relative symlink targets. This validates closure, not Linux native-addon/image functionality. Optional new bounded static contract test may be a candidate if root chooses; no live container/daemon validation is authorized or claimed. Existing container-health.mjs:7–27 is TLS-only anonymous loopback readiness with CA/hostname validation, not a plain HTTP bootstrap check.

## Last two CI probes

.github/workflows/ci.yml:42–45 runs exactly:

```text
node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs
node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs
```

These are review-archive probes, not the maintained core Vitest entry (:39–40 pnpm test:all). Old files remain protected; a replacement or removal would require explicit CI scope and preserving their intended maintained regression coverage, not editing sealed history.

check-invariants.mjs:9–20 imports current built server/storage/client/Pi adapter, bootstraps a new own DB and builds a real inject app. :43–100 records T01 resolve replay, T02 thread historical replay, T03 full-JSON legacy space result, T04 empty scope, T05 idempotent redaction. :102–134 creates genuine historical-v1 DDL from tests/fixtures/historical-v1-schema.sql, copies only compatible named columns, creates an old result cache and directly calls bootstrapDatabase, expecting no new credential/admin token and cache compaction (T06). :136–145 uses future999 and expects no DDL mutation (T07). :147–157 expects ACL epoch poll/ACK RESYNC without advancement (T08). :159–207 is a controlled Pi/fetch cancellation boundary (T09/T10), not installed-native SDK; it directly activates the adapter and uses current lazy runtime preparation. :209–218 prints safe result counts, sets exit1 on recorded failed invariants and closes app/DB/removes own directory. Awaited gates at :177/:200 have no independent watchdog, so they are not a bounded standalone current-native probe.

Schema6 does not itself make the v1 fixture invalid: bootstrap.ts:638–671 still classifies and directly applies all migrations; :687 onward retains direct legacy compatibility semantics. Ordinary CLI openAndCoordinateDatabase instead rejects supported_legacy at :775, requiring explicit offline migration. Therefore the old T06 direct bootstrap expectation must not be advertised as current CLI in-place migration. Its exact first T01–T10 outcome under current client/runtime/limits is untested here; do not presume obsolete solely from schema number or mark it green from historical receipts. Maintained related cases are in tests/integration/m0-m1-r4-b-regression.test.ts; deciding the exact CI successor requires root's bounded scope.

check-serve-version.mjs:12–16 creates a real current DB then adds migration999; :21 launches built CLI with --json serve, own directory, loopback port0; :26 watchdog is8s. :39–46 requires no listening, no timeout, nonzero actual close and diagnostic containing schema/version999. bootstrap.ts:751–755 rejects future999 before initialization/listen, CLI index.ts:377–378 coordinates before :405 listen. This intent remains statically compatible with schema6: future999 is still future, no current5 constant is hard-coded. Actual exit/diagnostic remains pending execution. Its finally :48 uses exitCode/signalCode and does not await a subsequently killed child before directory removal, so its old cleanup is not sufficient new actual-close evidence.

Minimal CI candidate: .github/workflows/ci.yml only if root decides to route the final stage to maintained bounded source tests/probes. Potential new owned delivery probe/test should retain unsupported-version/no-listen and current invariant intent, current schema6 and real actual-close cleanup; exact path is not chosen here. Do not change old archive scripts or classifier to make the old commands pass.

## Fresh local bootstrap and short-lived serve

package.json:6–10 requires Node>=22.19.0, pnpm>=9.0.0, packageManager pnpm11.7.0. Docker's fixed22.23.3 satisfies the declared minimum; this does not establish fresh install/platform compatibility. Root build command is pnpm build (:12), with installed locked dependencies assumed; no install was attempted.

CLI global options index.ts:123–131 include --url/--token/--token-file/--json. init :243–275 accepts --data-dir (default ./data), acquires directory lock, opens detuned.sqlite via init coordinator, closes DB/releases lock, then prints success/data_dir/db_path/is_new_instance/admin_actor_id/admin_token. The first admin_token is a secret stdout field; there is no built-in --output or token-file emission for init. Re-init does not recreate an administrator token (bootstrap.ts:675–684). A starter guide must keep that one stdout private and must not tell users to distribute the admin credential to ordinary agents.

A concrete command recipe for a genuinely new user-owned location (illustrative, not executed):

```sh
umask 077
mkdir -m 700 ./detuned-private
(set -C; node packages/cli/dist/index.js --json init --data-dir ./detuned-private/instance > ./detuned-private/bootstrap.json)
node packages/cli/dist/index.js serve --data-dir ./detuned-private/instance --host 127.0.0.1 --port 3000 --no-request-logs
```

The shell redirection is needed because init has no private-output option; noclobber prevents overwriting the initial secret report. Keep bootstrap.json local0600 and later create distinct least-privilege ordinary credentials through existing admin/client APIs. This is foreground local serve; stop with SIGINT/SIGTERM and await actual close. It is not a daemon install. It enables no Web/TLS/model or public listener.

Serve options :292–309 cover data-dir/host/port, bounded artifact size/space/upload limits, write rate/burst, shutdown timeout1000–120000(default10000), request-log toggle, database/registered-artifact quotas, paired TLS files and existing optional Web settings. Ordinary defaults are host127.0.0.1/port3000/write60-per-minute/burst20; demo burst100 is not required or proposed for this new-user default. Serve refuses missing DB :368–374; locks and coordinates at :364–378; listens at :405 and announces actual bound port in stderr only when not --json (:406–409). For ephemeral-port validation use non-JSON own spawn and safely parse that startup message, or a reserved own port; --json with port0 has no announced address.

A future D bounded local startup verification can capture init JSON only in memory/private file, project shape/booleans without token diffs, start the own foreground CLI child, call shared-client getReadiness() / getLiveness(), SIGTERM and await actual close, then restart same DB and confirm no new bootstrap token plus lock release. Existing createServeShutdown integration :392–403 owns draining/app/DB/strict lock release/log cleanup. Keep watchdog and actual-close cleanup; no shell background persistence, no global configuration or account reads.

Minimal owner candidate is a new local delivery smoke test/script and a starter example document only if root chooses that scope; CLI source itself needs no change to express this recipe. README/progress metadata is root-owned final delivery work, not an A authorization. Dockerfile/CI changes and any new test path require new fresh/dispatch. All facts above are static except explicitly cited already accepted historical/current package evidence; no new runtime pass is claimed.
