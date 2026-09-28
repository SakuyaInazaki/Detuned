import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import {
  DETUNED_TOOLS,
  ToolPublishParamsSchema,
  ToolRelateParamsSchema,
} from '@detuned/protocol';
import activate from '@detuned/adapter-pi';

describe('M0-R Adapter Regressions (A01 - A05)', () => {
  it('A01: ToolPublishParamsSchema accepts its documented valid tool input', () => {
    const validator = TypeCompiler.Compile(ToolPublishParamsSchema);
    const payload = {
      space_id: 'space_fixture',
      request_key: 'key_fixture',
      op: 'thread',
      title: 'A valid title',
    };
    const valid = validator.Check(payload);
    expect(valid).toBe(true);
  });

  it('A02: ToolRelateParamsSchema accepts its documented valid tool input', () => {
    const validator = TypeCompiler.Compile(ToolRelateParamsSchema);
    const payload = {
      space_id: 'space_fixture',
      request_key: 'key_fixture',
      op: 'create',
      source_ref: { post_id: 'post_a', revision: 1 },
      target_ref: { post_id: 'post_b', revision: 1 },
      type: 'cites',
    };
    const valid = validator.Check(payload);
    expect(valid).toBe(true);
  });

  it('A03: Pi commands follow registerCommand(name, options)', () => {
    const commands: any[] = [];
    activate({
      registerTool() {},
      registerCommand(...args: any[]) {
        commands.push(args);
      },
      on() {},
    });

    expect(commands.length).toBe(2);
    expect(commands.every((args) => args.length === 2 && typeof args[0] === 'string' && typeof args[1]?.handler === 'function')).toBe(true);
  });

  it('A04: Pi registered tool definitions include official required label field', () => {
    const tools: any[] = [];
    activate({
      registerTool(def: any) {
        tools.push(def);
      },
      registerCommand() {},
      on() {},
    });

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t) => typeof t.label === 'string')).toBe(true);
  });

  it('A05: Actual stdio bridge completes official SDK tool discovery', async () => {
    const bridge = new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../../packages/mcp/dist/index.js', import.meta.url))],
      env: {
        DETUNED_BASE_URL: 'http://127.0.0.1:1',
        DETUNED_TOKEN: 'synthetic-unused-review-token',
      },
      stderr: 'pipe',
    });
    bridge.stderr?.on('data', () => {});
    const client = new Client({ name: 'detuned-regression', version: '1.0.0' });

    try {
      await client.connect(bridge);
      const listed = await client.listTools();
      expect(listed.tools.length).toBe(DETUNED_TOOLS.length);
    } finally {
      await client.close();
      await bridge.close();
    }
  });

  it('A06: MCP stdio server executes valid and invalid tool calls', async () => {
    const Database = (await import('better-sqlite3')).default;
    const { buildApp } = await import('@detuned/server');
    const { SqliteStorage, bootstrapDatabase } = await import('@detuned/storage-sqlite');
    const { DetunedClient } = await import('@detuned/client');

    const db = new Database(':memory:');
    const boot = bootstrapDatabase(db);
    const storage = new SqliteStorage(db);
    const app = buildApp({ storage });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const port = (app.server.address() as any).port;

    // Create space via client
    const helperClient = new DetunedClient({
      baseUrl: `http://127.0.0.1:${port}`,
      token: boot.adminToken!,
    });
    const spaceRes = await helperClient.createSpace(
      { slug: 'mcp-space', objective: 'Test MCP', rules: [] },
      'mcp-init-space'
    );
    const spaceId = spaceRes.data.space.id;

    const bridge = new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../../packages/mcp/dist/index.js', import.meta.url))],
      env: {
        DETUNED_BASE_URL: `http://127.0.0.1:${port}`,
        DETUNED_TOKEN: boot.adminToken!,
      },
      stderr: 'pipe',
    });
    bridge.stderr?.on('data', () => {});
    const mcpClient = new Client({ name: 'detuned-mcp-caller', version: '1.0.0' });

    try {
      await mcpClient.connect(bridge);

      // 1. Valid tool call
      const validCall = await mcpClient.callTool({
        name: 'forum_publish',
        arguments: {
          space_id: spaceId,
          request_key: 'mcp_call_valid_1',
          op: 'thread',
          title: 'Thread published via MCP stdio',
        },
      });
      expect(validCall.isError).toBeFalsy();
      const validText = (validCall.content as any)[0].text;
      expect(validText).toContain('Thread published via MCP stdio');

      // 2. Invalid tool call (oversize title > 160 chars)
      const invalidCall = await mcpClient.callTool({
        name: 'forum_publish',
        arguments: {
          space_id: spaceId,
          request_key: 'mcp_call_invalid_1',
          op: 'thread',
          title: 'x'.repeat(161),
        },
      });
      expect(invalidCall.isError).toBe(true);
      const invalidText = (invalidCall.content as any)[0].text;
      expect(invalidText).toContain('VALIDATION_ERROR');
    } finally {
      await mcpClient.close();
      await bridge.close();
      await app.close();
      db.close();
    }
  });
});
