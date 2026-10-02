import { runAndRecord } from './run-record.mjs';

const tasks = [
  ['build', 'pnpm -r run build'],
  ['typecheck', 'pnpm -r run typecheck'],
  ['lint', 'pnpm -r run lint'],
  ['tests', 'pnpm test'],
  ['check-legacy-input-presence', 'node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs'],
  ['check-precheck-completeness', 'node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs'],
  ['check-validation-pipeline', 'node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs'],
  ['check-b4-2-boundaries', 'node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs'],
  ['check-b4-1-acceptance', 'node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs'],
  ['check-b3-gates-expected-l03', 'node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs'],
  ['check-unfinished-contracts-expected-u05-u06', 'node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs'],
  ['check-adapters', 'node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs'],
  ['check-behavior', 'node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs'],
  ['check-cli', 'node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs'],
  ['check-remaining', 'node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs'],
  ['check-invariants', 'node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs'],
  ['check-serve-version', 'node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs'],
];

for (const [name, cmd] of tasks) {
  runAndRecord(cmd, name);
}
