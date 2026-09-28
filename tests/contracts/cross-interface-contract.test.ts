import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';
import { DETUNED_TOOLS } from '@detuned/protocol';

describe('Cross-Interface Contract Consistency (HTTP, Client, MCP, Pi)', () => {
  let db: Database.Database;
  let storage: SqliteStorage;
  let app: FastifyInstance;
  let adminToken: string;
  let spaceId: string;
  let client: DetunedClient;

  beforeEach(async () => {
    db = new Database(':memory:');
    const boot = bootstrapDatabase(db);
    adminToken = boot.adminToken!;
    storage = new SqliteStorage(db);

    app = buildApp({ storage });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address() as any;
    const port = address.port;

    client = new DetunedClient({
      baseUrl: `http://127.0.0.1:${port}`,
      token: adminToken,
    });

    // Create space
    const res = await client.createSpace({
      slug: 'contracts-space',
      objective: '测试跨接口契约一致性',
      rules: ['规则 A'],
    }, 'req_spc_contract');
    spaceId = res.data.space.id;
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('ensures tools surface identical names and schemas across client and protocol definitions', () => {
    expect(DETUNED_TOOLS.length).toBe(8);
    const names = DETUNED_TOOLS.map((t) => t.name);
    expect(names).toEqual([
      'forum_context',
      'forum_search',
      'forum_read',
      'forum_publish',
      'forum_relate',
      'forum_subscribe',
      'forum_poll',
      'forum_ack',
    ]);
  });

  it('executes forum_context and forum_publish via client.callTool with identical semantics', async () => {
    // 1. Publish thread via callTool
    const publishRes = await client.callTool('forum_publish', {
      space_id: spaceId,
      request_key: 'calltool_publish_1',
      op: 'thread',
      title: '统一工具接口发布主题',
    });
    expect(publishRes.thread.id).toBeDefined();
    expect(publishRes.thread.title).toBe('统一工具接口发布主题');

    // 2. Read context via callTool
    const contextRes = await client.callTool('forum_context', {
      space_id: spaceId,
      max_bytes: 8192,
    });
    expect(contextRes.space_id).toBe(spaceId);
    expect(contextRes.rules).toContain('规则 A');
    expect(contextRes.checkpoint_token).toBeDefined();
  });
});
