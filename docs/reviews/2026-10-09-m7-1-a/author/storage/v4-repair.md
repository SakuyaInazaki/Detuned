# Narrow synthetic legacy fixture repair

The first full run recorded 884/892, with eight schema6 residual-table failures in this old file. The classifier correctly rejects check tables without migration6. This repair removes only those four child-to-parent tables before the existing downgrade in eight intended valid legacy fixtures. Existing downgrade SQL, migration rows, metadata choices, assertions, fault injection, timestamps, replay checks and timeouts are unchanged. All other B source remains freeze-v3. No build/test/runtime was run by B.

| Case | Fixture variable | Preserved purpose |
|---|---|---|
| B06 | faultDb | history insertion fault and atomic rollback |
| B08 | legacyDb | legacy upgrade without fresh credentials |
| B09 | legacyServeDb | serve refusal before mutation |
| J04 | dbTime | historical timestamp replay; separate conflict control unchanged |
| L02-1 | l02Db | unreplayable marker survives repeated starts |
| L02-2 | repDb | controlled 422 and no extra writes |
| L02-4 | posDb | full legacy result positive replay |
| B2-8 | dbLeg | supported legacy classification and serve refusal |

The frozen historical V1 SQL already contains nullable artifact check_run_id and review_assignment_id placeholders. No column/profile/classifier relaxation is needed. Deliberate malformed/mixed-version cases are untouched. Exact-before SHA matches the original verification baseline; ownership is additive.
