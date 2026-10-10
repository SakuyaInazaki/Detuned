# Bounded noEmit attribution

Only author evidence/configuration changed; production and the two frozen fixtures did not change.

The first standalone check had 43 diagnostics, including two missing Fastify module declarations. The corrected standalone configuration maps `fastify` to the already-installed server package's real `fastify.d.ts` (no install or dependency change). The second check exits 2; its complete output is `fixture-repair-noemit-resolved.stdout.txt`. Missing Fastify declarations disappear, but other diagnostics remain. This is therefore not solely a Fastify execution-context failure and not a clean whole-file typecheck.

Fresh baseline records fixture hashes `21251b6ab41e04fc2791022f1dcbc41794fc5381697c0a525bc7945074ed5463` and `e228bd8056a1811366243a42dff89da583f481740fe27e4ea71910e539fe9279`. Author material contains these hashes but no exact pre-edit copies of the two dirty fixtures. No guessed reconstruction is used as compiler input: without hash-matched original bytes a before/after attribution cannot be established. Remaining diagnostics are not labeled pre-existing merely because their lines were not edited. No unrelated legacy repairs or repeat functional tests were run. The package's official typecheck/full gate remains D-owned.
