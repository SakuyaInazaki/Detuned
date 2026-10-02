import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../../../..');

const commands = [
  { id: 1, cmd: 'pnpm', args: ['build'], expectedExit: 0, desc: 'Project build across all packages' },
  { id: 2, cmd: 'pnpm', args: ['typecheck'], expectedExit: 0, desc: 'Typecheck across all packages' },
  { id: 3, cmd: 'pnpm', args: ['lint'], expectedExit: 0, desc: 'Lint and schema sync check' },
  { id: 4, cmd: 'pnpm', args: ['test:all'], expectedExit: 0, desc: 'Full test suite (147 tests across 11 files)' },
  { id: 5, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1/check-behavior.mjs'], expectedExit: 0, desc: 'R1 behavior checks (15/15)' },
  { id: 6, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1/check-adapters.mjs'], expectedExit: 0, desc: 'R1 adapter checks (5/5)' },
  { id: 7, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs'], expectedExit: 0, desc: 'R2 remaining checks (12/12)' },
  { id: 8, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs'], expectedExit: 0, desc: 'R2 CLI checks (3/3)' },
  { id: 9, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs'], expectedExit: 0, desc: 'R3 invariant checks (10/10)' },
  { id: 10, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs'], expectedExit: 0, desc: 'R3 serve version check (1/1)' },
  { id: 11, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs'], expectedExit: 1, desc: 'R4 unfinished contracts (6/8 passing; U05/U06 deferred to R4-C, expected exit 1)' },
  { id: 12, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs'], expectedExit: 0, desc: 'R5 gaps check (G01-G09 passing 9/9)' },
  { id: 13, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs'], expectedExit: 0, desc: 'R6 upgrade boundaries check (H01-H10 passing 10/10)' },
  { id: 14, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs'], expectedExit: 0, desc: 'R7 B2 completeness check (J01-J07 passing 7/7)' },
  { id: 15, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs'], expectedExit: 0, desc: 'R7 legacy fixture check (K01 passing 1/1)' },
  { id: 16, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs'], expectedExit: 0, desc: 'R8 B3 gates check (L01-L08 passing 8/8)' },
  { id: 17, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs'], expectedExit: 0, desc: 'R9 B4.1 acceptance check (N01-N05 passing 5/5)' },
  { id: 18, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs'], expectedExit: 0, desc: 'R10 B4.2 boundaries check (P01-P06 passing 6/6)' },
  { id: 19, cmd: 'node', args: ['docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs'], expectedExit: 0, desc: 'R11 validation pipeline check (Q01-Q05 passing 5/5)' },
  { id: 20, cmd: 'node', args: ['docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs'], expectedExit: 0, desc: 'R12 precheck completeness check (V01-V05 passing 5/5)' },
  { id: 21, cmd: 'node', args: ['docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs'], expectedExit: 0, desc: 'R13 legacy input presence check (W01-W03 passing 3/3)' },
  { id: 22, cmd: 'node', args: ['docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs'], expectedExit: 0, desc: 'R14 legacy helper boundaries check (X01-X03 passing 3/3)' },
  { id: 23, cmd: 'node', args: ['docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs'], expectedExit: 0, desc: 'R15 structural boundaries check (Y01-Y04 passing 4/4)' },
  { id: 24, cmd: 'node', args: ['docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs'], expectedExit: 0, desc: 'R16 schema semantics check (Z01-Z04 passing 4/4)' },
  { id: 25, cmd: 'node', args: ['docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs'], expectedExit: 0, desc: 'R17 profile and FTS probe check (AA01-AA04 passing 4/4)' },
];

const results = [];
let allPassed = true;

console.log(`Starting execution of all 25 verification commands at ${new Date().toISOString()}...\n`);

for (const c of commands) {
  const fullCommandStr = `${c.cmd} ${c.args.join(' ')}`;
  console.log(`[#${c.id}/25] Executing: ${fullCommandStr}`);
  const startedAt = new Date().toISOString();
  const res = spawnSync(c.cmd, c.args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    timeout: 120000,
  });
  const finishedAt = new Date().toISOString();
  const exitCode = res.status;
  const passed = exitCode === c.expectedExit;
  if (!passed) {
    allPassed = false;
    console.error(`  FAIL: expected exit ${c.expectedExit}, got ${exitCode}`);
    if (res.stderr) console.error(`  stderr: ${res.stderr.slice(0, 500)}`);
  } else {
    console.log(`  PASS: exited with ${exitCode} (expected ${c.expectedExit})`);
  }

  results.push({
    id: c.id,
    command: fullCommandStr,
    desc: c.desc,
    expectedExit: c.expectedExit,
    actualExit: exitCode,
    passed,
    startedAt,
    finishedAt,
    stdoutSample: (res.stdout || '').slice(0, 500),
    stderrSample: (res.stderr || '').slice(0, 500),
  });
}

const summary = {
  executedAt: new Date().toISOString(),
  totalCommands: commands.length,
  passedCount: results.filter(r => r.passed).length,
  allPassed,
  results,
};

writeFileSync(join(__dirname, 'observed-25-commands.json'), JSON.stringify(summary, null, 2));
console.log(`\nFinished running all 25 commands. ${summary.passedCount}/${commands.length} passed criteria.`);
process.exit(allPassed ? 0 : 1);
