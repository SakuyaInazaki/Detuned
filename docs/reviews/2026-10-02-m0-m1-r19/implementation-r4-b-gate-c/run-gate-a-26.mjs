import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../../../');
const logsDir = path.resolve(__dirname, 'gate-a-logs');
mkdirSync(logsDir, { recursive: true });

const commands = [
  { id: 1, command: 'pnpm build', desc: 'Project build across all packages', expectedExit: 0, log: 'cmd-01-build.log' },
  { id: 2, command: 'pnpm typecheck', desc: 'Typecheck across all packages', expectedExit: 0, log: 'cmd-02-typecheck.log' },
  { id: 3, command: 'pnpm lint', desc: 'Lint and schema sync check', expectedExit: 0, log: 'cmd-03-lint.log' },
  { id: 4, command: 'pnpm test:all', desc: 'Full test suite (153 tests across 12 files)', expectedExit: 0, log: 'cmd-04-tests.log' },
  { id: 5, command: 'node docs/reviews/2026-09-28-m0-m1/check-behavior.mjs', desc: 'R1 behavior check (15/15)', expectedExit: 0, log: 'cmd-05-r1-behavior.log' },
  { id: 6, command: 'node docs/reviews/2026-09-28-m0-m1/check-adapters.mjs', desc: 'R1 adapters check (5/5)', expectedExit: 0, log: 'cmd-06-r1-adapters.log' },
  { id: 7, command: 'node docs/reviews/2026-09-28-m0-m1-r2/check-remaining.mjs', desc: 'R2 remaining features check (12/12)', expectedExit: 0, log: 'cmd-07-r2.log' },
  { id: 8, command: 'node docs/reviews/2026-09-28-m0-m1-r2/check-cli.mjs', desc: 'R2 CLI check (3/3)', expectedExit: 0, log: 'cmd-08-r2-cli.log' },
  { id: 9, command: 'node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs', desc: 'R3 invariants check (10/10)', expectedExit: 0, log: 'cmd-09-r3.log' },
  { id: 10, command: 'node docs/reviews/2026-09-28-m0-m1-r3/check-serve-version.mjs', desc: 'R3 serve version check (1/1)', expectedExit: 0, log: 'cmd-10-r3-serve.log' },
  { id: 11, command: 'node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs', desc: 'R4 unfinished contracts (6/8 passing; U05/U06 deferred to R4-C, expected exit 1)', expectedExit: 1, log: 'cmd-11-r4.log' },
  { id: 12, command: 'node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs', desc: 'R5 gaps check (G01-G09 passing 9/9)', expectedExit: 0, log: 'cmd-12-r5.log' },
  { id: 13, command: 'node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs', desc: 'R6 upgrade boundaries check (H01-H10 passing 10/10)', expectedExit: 0, log: 'cmd-13-r6.log' },
  { id: 14, command: 'node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs', desc: 'R7 completeness check (J01-J07 passing 7/7)', expectedExit: 0, log: 'cmd-14-r7.log' },
  { id: 15, command: 'node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs', desc: 'R7 historical DDL frozen check (1/1)', expectedExit: 0, log: 'cmd-15-r7-fixture.log' },
  { id: 16, command: 'node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs', desc: 'R8 gates check (L01-L08 passing 8/8)', expectedExit: 0, log: 'cmd-16-r8.log' },
  { id: 17, command: 'node docs/reviews/2026-09-29-m0-m1-r9/check-b4-1-acceptance.mjs', desc: 'R9 idempotency replay check (N01-N05 passing 5/5)', expectedExit: 0, log: 'cmd-17-r9.log' },
  { id: 18, command: 'node docs/reviews/2026-09-29-m0-m1-r10/check-b4-2-boundaries.mjs', desc: 'R10 boundaries check (P01-P06 passing 6/6)', expectedExit: 0, log: 'cmd-18-r10.log' },
  { id: 19, command: 'node docs/reviews/2026-09-30-m0-m1-r11/check-validation-pipeline.mjs', desc: 'R11 validation pipeline check (Q01-Q05 passing 5/5)', expectedExit: 0, log: 'cmd-19-r11.log' },
  { id: 20, command: 'node docs/reviews/2026-09-30-m0-m1-r12/check-precheck-completeness.mjs', desc: 'R12 precheck completeness (V01-V05 passing 5/5)', expectedExit: 0, log: 'cmd-20-r12.log' },
  { id: 21, command: 'node docs/reviews/2026-09-30-m0-m1-r13/check-legacy-input-presence.mjs', desc: 'R13 input presence check (W01-W03 passing 3/3)', expectedExit: 0, log: 'cmd-21-r13.log' },
  { id: 22, command: 'node docs/reviews/2026-10-01-m0-m1-r14/check-legacy-helper-boundaries.mjs', desc: 'R14 helper boundaries check (X01-X03 passing 3/3)', expectedExit: 0, log: 'cmd-22-r14.log' },
  { id: 23, command: 'node docs/reviews/2026-10-02-m0-m1-r15/check-structural-boundaries.mjs', desc: 'R15 structural boundaries check (Y01-Y04 passing 4/4)', expectedExit: 0, log: 'cmd-23-r15.log' },
  { id: 24, command: 'node docs/reviews/2026-10-02-m0-m1-r16/check-schema-semantics.mjs', desc: 'R16 schema semantics check (Z01-Z04 passing 4/4)', expectedExit: 0, log: 'cmd-24-r16.log' },
  { id: 25, command: 'node docs/reviews/2026-10-02-m0-m1-r17/check-profile-and-fts.mjs', desc: 'R17 profile and FTS probe check (AA01-AA04 passing 4/4)', expectedExit: 0, log: 'cmd-25-r17.log' },
  { id: 26, command: 'node docs/reviews/2026-10-02-m0-m1-r18/check-generation-completeness.mjs', desc: 'R18 generation completeness probe check (AB01-AB04 passing 4/4)', expectedExit: 0, log: 'cmd-26-r18.log' },
];

console.log(`Starting execution of all 26 verification commands for Gate A...`);
const results = [];
let allPassed = true;

for (const c of commands) {
  const startedAt = new Date().toISOString();
  console.log(`[Cmd #${c.id}] ${c.command}...`);
  const parts = c.command.split(' ');
  const prog = parts[0];
  const args = parts.slice(1);
  const r = spawnSync(prog, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 50 * 1024 * 1024,
  });

  const actualExit = r.status ?? (r.error ? 1 : 0);
  const finishedAt = new Date().toISOString();
  let passed = (actualExit === c.expectedExit);

  if (c.id === 11) {
    try {
      const parsed = JSON.parse(r.stdout);
      const failedProbes = parsed.probes.filter(p => !p.passes).map(p => p.id).sort();
      const expectedFailed = ['U05', 'U06'];
      const failedMatches = JSON.stringify(failedProbes) === JSON.stringify(expectedFailed);
      if (!failedMatches) {
        console.error(`Command #11 failed probes mismatch: expected ${JSON.stringify(expectedFailed)}, got ${JSON.stringify(failedProbes)}`);
        passed = false;
      }
    } catch (e) {
      console.error(`Command #11 output JSON parse error: ${e.message}`);
      passed = false;
    }
  }

  if (!passed) {
    allPassed = false;
    console.error(`FAILED: Cmd #${c.id} expected exit ${c.expectedExit}, got ${actualExit}`);
  } else {
    console.log(`OK: Cmd #${c.id} exited with ${actualExit} as expected`);
  }

  const logContent = [
    `=== COMMAND: ${c.command} ===`,
    `=== STARTED: ${startedAt} ===`,
    `=== FINISHED: ${finishedAt} ===`,
    `=== EXPECTED EXIT: ${c.expectedExit} ===`,
    `=== ACTUAL EXIT: ${actualExit} ===`,
    `=== PASSED: ${passed} ===`,
    `--- STDOUT ---`,
    r.stdout || '',
    `--- STDERR ---`,
    r.stderr || '',
    r.error ? `--- PROCESS ERROR: ${r.error.message} ---` : ''
  ].join('\n');

  const logFileRel = path.join('gate-a-logs', c.log);
  writeFileSync(path.resolve(__dirname, logFileRel), logContent, 'utf8');

  results.push({
    id: c.id,
    command: c.command,
    desc: c.desc,
    expectedExit: c.expectedExit,
    actualExit,
    passed,
    startedAt,
    finishedAt,
    logFile: logFileRel,
    stdoutSample: (r.stdout || '').slice(0, 500),
    stderrSample: (r.stderr || '').slice(0, 500)
  });
}

const summaryPath = path.resolve(__dirname, 'gate-a-commands.json');
writeFileSync(summaryPath, JSON.stringify({
  executedAt: new Date().toISOString(),
  totalCommands: commands.length,
  passedCount: results.filter(r => r.passed).length,
  allPassed,
  commands: results
}, null, 2), 'utf8');

console.log(`Gate A 26-command run complete: ${results.filter(r => r.passed).length}/${commands.length} passed.`);
if (!allPassed) {
  process.exit(1);
}
