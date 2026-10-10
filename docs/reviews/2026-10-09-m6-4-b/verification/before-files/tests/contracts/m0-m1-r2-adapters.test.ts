import { describe, it, expect } from 'vitest';
import activatePi from '@detuned/adapter-pi';
import { DETUNED_TOOLS } from '@detuned/protocol';

describe('M0-R2 / M1-R2 Adapters Regressions (S12 & Tools Discovery)', () => {
  it('S12: Pi execute must throw for failure per official extension contract', async () => {
    const registered = new Map<string, any>();
    activatePi({
      registerTool(tool: any) {
        registered.set(tool.name, tool);
      },
      registerCommand() {},
      on() {},
    });

    const savedFetch = globalThis.fetch;
    let threw = false;
    let errorObj: any = null;

    try {
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: { code: 'FORBIDDEN', message: 'Synthetic Pi fixture', retryable: false },
          }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )) as any;

      try {
        await registered.get('forum_context').execute(
          'r2-tool-error',
          { space_id: 'dummy-space' },
          new AbortController().signal
        );
      } catch (err: any) {
        threw = true;
        errorObj = err;
      }
    } finally {
      globalThis.fetch = savedFetch;
    }

    expect(threw).toBe(true);
    expect(errorObj).toBeDefined();
  });

  it('Pi execute respects AbortSignal and aborts immediately', async () => {
    const registered = new Map<string, any>();
    activatePi({
      registerTool(tool: any) {
        registered.set(tool.name, tool);
      },
      registerCommand() {},
      on() {},
    });

    const controller = new AbortController();
    controller.abort(); // already aborted

    let threw = false;
    try {
      await registered.get('forum_context').execute(
        'r2-abort-test',
        { space_id: 'dummy-space' },
        controller.signal
      );
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
  });

  it('Tools discovery advertises only currently implemented tools (8 active tools, no unimplemented forum_review)', () => {
    // Only implemented tools should be in DETUNED_TOOLS discovery list
    const toolNames = DETUNED_TOOLS.map((t) => t.name);
    expect(toolNames).toContain('forum_context');
    expect(toolNames).toContain('forum_search');
    expect(toolNames).toContain('forum_read');
    expect(toolNames).toContain('forum_publish');
    expect(toolNames).toContain('forum_relate');
    expect(toolNames).toContain('forum_subscribe');
    expect(toolNames).toContain('forum_poll');
    expect(toolNames).toContain('forum_ack');
    expect(toolNames).not.toContain('forum_review');
    expect(toolNames.length).toBe(8);
  });
});
