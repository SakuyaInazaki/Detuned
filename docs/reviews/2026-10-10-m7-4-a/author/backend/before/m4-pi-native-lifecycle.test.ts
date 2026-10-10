import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const helper = fileURLToPath(new URL('../fixtures/pi-runtime/native-lifecycle.mjs', import.meta.url));
const modes = ['identity', 'new', 'switch', 'fork', 'reload', 'shutdown'] as const;
describe('M4.4-B independent real Pi 0.87.1 SDK lifecycle', () => {
  for (const mode of modes) it(`native ${mode} uses isolated ordinary credentials and awaited lifecycle cleanup`, async () => {
    const child = spawn('/usr/bin/env', ['-i', 'PATH=/opt/homebrew/bin:/usr/bin:/bin', 'CI=true', process.execPath, helper, mode], { env: {}, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; let killed = false;
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, 70000);
    const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal }));
    }).finally(() => clearTimeout(timer));
    expect({ mode, ...exit, killed, stderr }).toEqual({ mode, code: 0, signal: null, killed: false, stderr: '' });
    const evidence = JSON.parse(stdout.trim());
    expect(evidence).toMatchObject({ mode, passed: true, model_calls: 0, activation_and_start_http: 0, invalid_review_before_prepare_http: 0, same_generation_retains_a: true, concurrent_first_calls: { capability: 1, me: 1, session: 1, posts: 2, author_a: true }, metadata: { version: '0.87.1', loader_public_export: false, internal_loader_test_only: true } });
    expect(evidence.tools).toHaveLength(9);
    if (mode === 'identity') expect(evidence).toMatchObject({ veto_preserves_runtime: true, new_generation_b: true, ordinary_actor_denied_space: 'NOT_FOUND', ninth_review: { actual_session: true, assignment_actor_b: true, diagnostic_unchanged: true, session_delta: 1, ack_delta: 0 } });
    else expect(evidence).toMatchObject({ cancelled_before_return: true, tool_finally_before_return: true, pending_batch_unchanged: true, ack_request_delta: 0 });
    if (mode === 'reload') expect(evidence).toMatchObject({ closed_extension_no_http: true, reload_reactivated_without_start: true, replacement_uses_b: true });
    if (mode === 'shutdown') expect(evidence.closed_extension_no_http).toBe(true);
    console.info(JSON.stringify(evidence));
  }, 80000);
});
