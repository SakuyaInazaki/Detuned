import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '../../../..');
const logsDir = join(__dirname, 'logs');
mkdirSync(logsDir, { recursive: true });

const commands = [
  { id: 1, cmd: 'pnpm', args: ['build'], expectedExit: 0, file: 'cmd-01-build.log', desc: 'Project build across all packages' },
  { id: 2, cmd: 'pnpm', args: ['typecheck'], expectedExit: 0, file: 'cmd-02-typecheck.log', desc: 'Typecheck across all packages' },
  { id: 3, cmd: 'pnpm', args: ['lint'], expectedExit: 0, file: 'cmd-03-lint.log', desc: 'Lint and schema sync check' },
  { id: 4, cmd: 'pnpm', args: ['test:all'], expectedExit: 0, file: 'cmd-04-tests.log', desc: 'Full test suite (152 tests across 12 files)' },
  { id: 5, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1/check-behavior.mjs'], expectedExit: 0, file: 'cmd-05-r1-behavior.log', desc: 'R1 behavior checks (15/15)' },
  { id: 6, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1/check-adapters.mjs'], expectedExit: 0, file: 'cmd-06-r1-adapters.log', desc: 'R1 adapter checks (5/5)' },
  { id: 7, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs'], expectedExit: 0, file: 'cmd-07-r2.log', desc: 'R2 remaining checks (12/12)' },
  { id: 8, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs'], expectedExit: 0, file: 'cmd-08-r2-cli.log', desc: 'R2 CLI checks (3/3)' },
  { id: 9, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs'], expectedExit: 0, file: 'cmd-09-r3.log', desc: 'R3 invariant checks (10/10)' },
  { id: 10, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs'], expectedExit: 0, file: 'cmd-10-r3-serve.log', desc: 'R3 serve version check (1/1)' },
  { id: 11, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs'], expectedExit: 1, file: 'cmd-11-r4.log', desc: 'R4 unfinished contracts (6/8 passing; U05/U06 deferred to R4-C, expected exit 1)' },
  { id: 12, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs'], expectedExit: 0, file: 'cmd-12-r5.log', desc: 'R5 gaps check (G01-G09 passing 9/9)' },
  { id: 13, cmd: 'node', args: ['docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs'], expectedExit: 0, file: 'cmd-13-r6.log', desc: 'R6 upgrade boundaries check (H01-H10 passing 10/10)' },
  { id: 14, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs'], expectedExit: 0, file: 'cmd-14-r7.log', desc: 'R7 B2 completeness check (J01-J07 passing 7/7)' },
  { id: 15, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs'], expectedExit: 0, file: 'cmd-15-r7-fixture.log', desc: 'R7 legacy fixture check (K01 passing 1/1)' },
  { id: 16, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs'], expectedExit: 0, file: 'cmd-16-r8.log', desc: 'R8 B3 gates check (L01-L08 passing 8/8)' },
  { id: 17, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs'], expectedExit: 0, file: 'cmd-17-r9.log', desc: 'R9 B4.1 acceptance check (N01-N05 passing 5/5)' },
  { id: 18, cmd: 'node', args: ['docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs'], expectedExit: 0, file: 'cmd-18-r10.log', desc: 'R10 B4.2 boundaries check (P01-P06 passing 6/6)' },
  { id: 19, cmd: 'node', args: ['docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs'], expectedExit: 0, file: 'cmd-19-r11.log', desc: 'R11 validation pipeline check (Q01-Q05 passing 5/5)' },
  { id: 20, cmd: 'node', args: ['docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs'], expectedExit: 0, file: 'cmd-20-r12.log', desc: 'R12 precheck completeness check (V01-V05 passing 5/5)' },
  { id: 21, cmd: 'node', args: ['docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs'], expectedExit: 0, file: 'cmd-21-r13.log', desc: 'R13 legacy input presence check (W01-W03 passing 3/3)' },
  { id: 22, cmd: 'node', args: ['docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs'], expectedExit: 0, file: 'cmd-22-r14.log', desc: 'R14 legacy helper boundaries check (X01-X03 passing 3/3)' },
  { id: 23, cmd: 'node', args: ['docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs'], expectedExit: 0, file: 'cmd-23-r15.log', desc: 'R15 structural boundaries check (Y01-Y04 passing 4/4)' },
  { id: 24, cmd: 'node', args: ['docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs'], expectedExit: 0, file: 'cmd-24-r16.log', desc: 'R16 schema semantics check (Z01-Z04 passing 4/4)' },
  { id: 25, cmd: 'node', args: ['docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs'], expectedExit: 0, file: 'cmd-25-r17.log', desc: 'R17 profile and FTS probe check (AA01-AA04 passing 4/4)' },
  { id: 26, cmd: 'node', args: ['docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs'], expectedExit: 0, file: 'cmd-26-r18.log', desc: 'R18 generation completeness probe check (AB01-AB04 passing 4/4)' },
];

const results = [];
let allPassed = true;

console.log(`Starting execution of all 26 verification commands at ${new Date().toISOString()}...\n`);

for (const c of commands) {
  const fullCommandStr = `${c.cmd} ${c.args.join(' ')}`;
  console.log(`[#${c.id}/26] Executing: ${fullCommandStr}`);
  const startedAt = new Date().toISOString();
  const res = spawnSync(c.cmd, c.args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    timeout: 180000,
  });
  const finishedAt = new Date().toISOString();
  const exitCode = res.status;
  const passed = exitCode === c.expectedExit;

  // Save complete stdout and stderr to dedicated log file
  const fullOutput = `=== COMMAND ===\n${fullCommandStr}\n\n=== STARTED AT ===\n${startedAt}\n\n=== FINISHED AT ===\n${finishedAt}\n\n=== EXIT CODE ===\n${exitCode} (expected: ${c.expectedExit})\n\n=== STDOUT ===\n${res.stdout || ''}\n\n=== STDERR ===\n${res.stderr || ''}\n`;
  writeFileSync(join(logsDir, c.file), fullOutput, 'utf8');

  // For Command 11, strictly verify only U05 and U06 failed
  if (c.id === 11) {
    try {
      const parsed = JSON.parse(res.stdout || '{}');
      const failedProbes = (parsed.probes || []).filter(p => !p.passes).map(p => p.id);
      const onlyU05U06 = failedProbes.length === 2 && failedProbes.includes('U05') && failedProbes.includes('U06');
      if (!onlyU05U06) {
        console.error(`  FAIL: Command 11 failed items expected ['U05', 'U06'], got:`, failedProbes);
        allPassed = false;
      } else {
        console.log(`  PASS: Command 11 strictly confirmed only U05/U06 failed (6/8 passed, 2 failed)`);
      }
    } catch (e) {
      console.error(`  FAIL: Could not parse Command 11 output JSON: ${e.message}`);
      allPassed = false;
    }
  }

  if (!passed) {
    allPassed = false;
    console.error(`  FAIL: expected exit ${c.expectedExit}, got ${exitCode}`);
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
    logFile: `logs/${c.file}`,
    stdoutSample: (res.stdout || '').slice(0, 500),
    stderrSample: (res.stderr || '').slice(0, 500),
  });
}

const summary = {
  executedAt: new Date().toISOString(),
  totalCommands: commands.length,
  passedCount: results.filter(r => r.passed).length,
  allPassed,
  commands: results,
};

writeFileSync(join(__dirname, 'commands.json'), JSON.stringify(summary, null, 2));
console.log(`\nFinished running all 26 commands. ${summary.passedCount}/${commands.length} passed criteria.`);
process.exit(allPassed ? 0 : 1);
