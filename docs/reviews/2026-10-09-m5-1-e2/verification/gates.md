# Actual E2 gates

| Check | Exit / actual result | Evidence |
|---|---|---|
| root-build | 0, 5.966s;  | [stdout](gates/root-build.stdout.log), [stderr](gates/root-build.stderr.log), [receipt](gates/root-build.json) |
| root-build-index-second | 0, 5.995s;  | [stdout](gates/root-build-index-second.stdout.log), [stderr](gates/root-build-index-second.stderr.log), [receipt](gates/root-build-index-second.json) |
| root-typecheck | 0, 4.947s;  | [stdout](gates/root-typecheck.stdout.log), [stderr](gates/root-typecheck.stderr.log), [receipt](gates/root-typecheck.json) |
| root-lint | 0, 4.946s;  | [stdout](gates/root-lint.stdout.log), [stderr](gates/root-lint.stderr.log), [receipt](gates/root-lint.json) |
| root-core-first | 0, 46.695s; 692 tests /103 files | [stdout](gates/root-core-first.stdout.log), [stderr](gates/root-core-first.stderr.log), [receipt](gates/root-core-first.json) |
| browser-source-noemit-fixture-final | 0, 0.971s;  | [stdout](gates/browser-source-noemit-fixture-final.stdout.log), [stderr](gates/browser-source-noemit-fixture-final.stderr.log), [receipt](gates/browser-source-noemit-fixture-final.json) |
| selected-browser-first | 1, 38.97s; 10pass2fixturefail | [stdout](gates/selected-browser-first.stdout.log), [stderr](gates/selected-browser-first.stderr.log), [receipt](gates/selected-browser-first.json) |
| browser-two-fixtures-second | 0, 4.183s; 2pass;12unique composite | [stdout](gates/browser-two-fixtures-second.stdout.log), [stderr](gates/browser-two-fixtures-second.stderr.log), [receipt](gates/browser-two-fixtures-second.json) |
| independent-order-first | 0, 0.825s;  | [stdout](gates/independent-order-first.stdout.log), [stderr](gates/independent-order-first.stderr.log), [receipt](gates/independent-order-first.json) |
| independent-order-index-second | 0, 0.785s;  | [stdout](gates/independent-order-index-second.stdout.log), [stderr](gates/independent-order-index-second.stderr.log), [receipt](gates/independent-order-index-second.json) |
| runtime-index-first | 0, 0.73s;  | [stdout](gates/runtime-index-first.stdout.log), [stderr](gates/runtime-index-first.stderr.log), [receipt](gates/runtime-index-first.json) |
| order-performance-first | 0, 5.699s; 80collected; concentrated p95 FAILED500ms | [stdout](gates/order-performance-first.stdout.log), [stderr](gates/order-performance-first.stderr.log), [receipt](gates/order-performance-first.json) |
| order-performance-index-second | 0, 1.563s; 80collected;4waves p95 under500ms | [stdout](gates/order-performance-index-second.stdout.log), [stderr](gates/order-performance-index-second.stderr.log), [receipt](gates/order-performance-index-second.json) |
| current25 | 25/25 exit0,15.708s total | [all actual commands/results](current25-results.json), [complete output audit](gate-output-audit.json) |

Rootbuild first covered pre-index A v1; second covered final A v2/B6. Final type/lint/core/current25 were each run once. Browser source first failed ES2022 `toSorted`, then mechanical spread/sort correction passed; final source noEmit follows the two fixture corrections. Author source/test noEmit evidence is separate from D browser noEmit. Core contains formal eight new order/index cases; browser twelve are separate.

Warnings retained: pnpmfiles dependency-state warning, Vite chunk over500kB, Playwright NO_COLOR/FORCE_COLOR. Current#28 emitted66 Ajv unknown date-time format warnings; AD01–05 passed, but this adapter does not prove date-time format rejection. No warning was converted into a silent success or omitted from raw evidence.
