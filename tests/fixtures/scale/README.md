# C.2 deterministic current scale fixture recipe v3

`recipe.json` and `scripts/scale/seed.mjs` describe a parameterized current-schema batch fixture, **not** a million real HTTP successes. No database or credential is stored here. Use the repository's already installed dependencies and accepted current package dist; no install/network/user database is needed.

```sh
node scripts/scale/seed.mjs --output /private/tmp/detuned-c2-smoke-new --profile smoke
node scripts/scale/seed.mjs --output /private/tmp/detuned-c2-full-new --profile full
```

The output directory must not exist. `smoke` is 1,000 posts / 10,000 events / 40 threads / 40 relations; `full` is 100,000 posts / 1,000,000 events / 1,000 threads / 1,000 relations. Twenty ordinary actors and sessions have exclusive note revision/thread targets. No consumer or subscription is seeded: a runtime copy must receive private ephemeral credentials/instance secret and use real context checkpoint → subscribe, after warmup. Baseline is credential-free and intentionally not directly servable.

Kinds are exact 50% note / 20% proposal / 10% failure / 10% summary / 10% claim by deterministic index slots; no random distribution is assumed. Latest bodies are exactly 90% 384 UTF8 bytes / 9% 2,048 bytes / 1% 16,384 bytes; old revision bodies 128 bytes. Unicode characters are never split. Each head is 9 or 10; typed structured payloads and complete create/revision payloads pass the current validators. Stored content hashes use the current title/summary/body/canonical-structured algorithm; separate document hashes cover JSON.stringify({title,summary,body,tags,structured}).

All threads start open version1, then last 10% become archived version2 after posts/revisions. Space revision1 has no pins, final revision2 pins current summaries. Every version/action has its corresponding seed event. Full total is 2 space events + 1,000 thread creates + 100 thread updates + 100,000 post creates + 1,000 relation creates + 897,898 post revisions = 1,000,000. Sources are created before fixed references; final summary references use versions available at that moment. Cross-thread refs stay same-space. Summary source changes later require a real author HTTP revision, not seed mutation.

`manifest.json` is versioned nonsecret runner input: actual schema/counts/high-water, twenty actor/session/consumer-key/write targets, open/archived read pools, fixed post/space refs with document hashes/bytes, Chinese 1/2/3-character and English hit/miss query pools, strict failure template with readable evidence, recipe/source/logical/file hashes. `oracle.json` is **only** an after-the-fact validator answer sheet. `discovery.json` contains only space_id, query `C2三点反例` and task text; the forum-only new-session reader must not read manifest refs/oracle/database answers.

The unique failure and same-thread summary form the D01 three-edge counterexample chain, with scope/evidence state/ruled-out and unexcluded variants/retry conditions. Its summary has a current client0-owned note source for a later authorized update barrier. Other fixed historical sources already show newer heads, without silently rewriting their stored summaries.

Generation validates integrity/FK/counts/event sequence, source fixed versions and timestamps, relationship refs, per-revision content hashes, active/current FTS equality, and twenty ordinary ownership targets; it streams logical fingerprints and database hashing. Bootstrap credential/secret are removed, a new VACUUM archive is scanned for known token/hash/secret bytes, and only then public manifests are emitted. Data/source versions, generation origin and actual time are recorded. Failed runs leave their own partial output and logs; they are not a usable baseline.

Frozen guards: baseline ≤2.5GiB, runtime total target ≤8GiB, stop when free space <6GiB; actual size/time is measured, not promised. Only small smoke reproduction is an author self-check; independent T06 and the separate fixed 600-second 20-client run determine correctness/performance. v1/v2 smoke evidence remains in the C.2 review and must not be presented as the final v3 experiment. No product/DDL/index changes, user DB modifications, model calls, cleanup of old evidence or publishing are part of this generator.
