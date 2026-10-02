import { runAndRecord } from './run-record.mjs';

const commands = [
  { name: 'pnpm-build', cmd: 'pnpm build' },
  { name: 'pnpm-typecheck', cmd: 'pnpm typecheck' },
  { name: 'pnpm-lint', cmd: 'pnpm lint' },
  { name: 'pnpm-test-all', cmd: 'pnpm test:all' },
  { name: 'probe-r1-behavior', cmd: 'node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs' },
  { name: 'probe-r1-adapters', cmd: 'node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs' },
  { name: 'probe-r2-remaining', cmd: 'node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs' },
  { name: 'probe-r2-cli', cmd: 'node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs' },
  { name: 'probe-r3-invariants', cmd: 'node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs' },
  { name: 'probe-r3-serve-version', cmd: 'node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs' },
  { name: 'probe-r4-unfinished-contracts', cmd: 'node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs' },
  { name: 'probe-r5-r4b-gaps', cmd: 'node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs' },
  { name: 'probe-r6-upgrade-boundaries', cmd: 'node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs' },
  { name: 'probe-r7-b2-completeness', cmd: 'node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs' },
  { name: 'probe-r7-legacy-fixture', cmd: 'node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs' },
  { name: 'probe-r8-b3-gates', cmd: 'node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs' },
  { name: 'probe-r9-b4-1-acceptance', cmd: 'node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs' },
  { name: 'probe-r10-b4-2-boundaries', cmd: 'node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs' },
  { name: 'probe-r11-validation-pipeline', cmd: 'node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs' },
  { name: 'probe-r12-precheck-completeness', cmd: 'node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs' },
  { name: 'probe-r13-legacy-input-presence', cmd: 'node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs' },
  { name: 'probe-r14-legacy-helper-boundaries', cmd: 'node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs' },
];

console.log(`Starting execution of ${commands.length} verification commands...`);
for (const { name, cmd } of commands) {
  runAndRecord(cmd, name);
}
console.log('All verification commands completed.');
