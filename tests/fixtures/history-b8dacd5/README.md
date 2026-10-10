# Real committed b8dacd5 HTTP history fixture

This package was produced by the actual server/core/protocol/storage dist committed at `b8dacd56779a007a2e7045b682bca0c036fdfc44`, isolated from the current workspace's internal packages. It is a new, reproducible historical source, not the lost original M2.1 database. The three actual old HTTP successes are initial failure without evidence_state, new proposal with assumptions:[42], and its proposal revision with assumptions:[42].

`legacy.db` is a sanitized, checkpointed/VACUUMed SQLite archive. It contains actual old business/event/idempotency records, but no credential records or instance token_secret. It cannot be served directly without explicit test authentication setup. `expected.json` holds actual response data and fixed hash/ref/content/time records; `recipe.json` holds public request payloads and a fixed service clock. `provenance.json` binds fixture hashes, exact committed files, internal ESM resolution checks, external dependency versions and sanitization. Absolute installed paths in provenance are diagnostic observations, not rebuild inputs.

The formal test copies the archive into a new temporary directory, issues a fresh runtime credential to the same historical actor, and supplies a fresh runtime instance secret before the current database coordinator opens it. It never stores tokens in this package. Fixed creation versions/content remain exact; only the documented current post head is projected dynamically. Redaction uses current tombstones, with stored content hashes still preserved.

## Rebuild in a fresh explicit output directory

Requirements: the fixed Git objects remain available and the repository's external dependencies are already installed. No install, checkout or current workspace build is needed. The generator refuses to overwrite an existing archive/expected/provenance. For example, from the repository root:

```sh
history_output="$(mktemp -d "${TMPDIR:-/tmp}/detuned-hr1-output-XXXXXX")"
cp tests/fixtures/history-b8dacd5/recipe.json "$history_output/recipe.json"
node scripts/history-fixtures/generate-b8dacd5.mjs "$history_output"
```

The optional sole argument is the explicit output directory. Without it, output defaults to this package, and an already populated package is refused. The generator exports committed package.json/dist, checks every byte, gives each bare internal @detuned import an isolated old-tree target, and links only already installed external dependencies. It runs the three HTTP successes and sanitizes a new archive; its own temporary server tree is removed in finally. Output actor/bootstrap timestamp and DB hash can differ between generations because old bootstrap uses randomness/current initialization time. This is reproducible semantic history, not a claim of byte-identical DB rebuilding.

Run the persistent-package test in a separate process:

```sh
pnpm exec vitest run tests/integration/historical-http-replay.test.ts
```

The checked-in persistent package test does not need the generation output directory, old temporary tree, or old credentials. Regenerated output can be independently inspected against its own expected/provenance, without replacing this frozen package. The original M2.1 capture logs remain untouched.
