import { runAndRecord } from './run-record.mjs';

const steps = [
  { name: 'build', cmd: 'pnpm build' },
  { name: 'typecheck', cmd: 'pnpm typecheck' },
  { name: 'lint', cmd: 'pnpm lint' },
  { name: 'test-all', cmd: 'pnpm test:all' },
  { name: 'probe-r1-behavior', cmd: 'node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs' },
  { name: 'probe-r1-adapters', cmd: 'node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs' },
  { name: 'probe-r2-remaining', cmd: 'node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs' },
  { name: 'probe-r2-cli', cmd: 'node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs' },
  { name: 'probe-r3-invariants', cmd: 'node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs' },
  { name: 'probe-r3-serve-version', cmd: 'node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs' },
  { name: 'probe-r4-contracts', cmd: 'node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs' },
  { name: 'probe-r5-gaps', cmd: 'node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs' },
  { name: 'probe-r6-boundaries', cmd: 'node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs' },
  { name: 'probe-r7-completeness', cmd: 'node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs' },
  { name: 'probe-r7-fixture', cmd: 'node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs' },
  { name: 'probe-r8-gates', cmd: 'node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs' },
  { name: 'probe-r9-acceptance', cmd: 'node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs' },
  { name: 'probe-r10-boundaries', cmd: 'node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs' },
  { name: 'probe-r11-pipeline', cmd: 'node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs' },
  { name: 'probe-r12-precheck', cmd: 'node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs' },
  { name: 'final-build', cmd: 'pnpm build' },
  { name: 'final-typecheck', cmd: 'pnpm typecheck' },
  { name: 'final-lint', cmd: 'pnpm lint' },
  { name: 'final-test-all', cmd: 'pnpm test:all' },
  { name: 'generate-baseline-after', cmd: 'node docs/reviews/2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/generate-baseline.mjs baseline-after.json' },
];

console.log(`Starting execution of ${steps.length} verification steps...`);
for (const step of steps) {
  runAndRecord(step.cmd, step.name);
}
console.log('All verification steps completed.');
