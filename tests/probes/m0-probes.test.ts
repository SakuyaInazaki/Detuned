import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('M0.4 Technical Probes', () => {
  it('verifies better-sqlite3 with SQLite FTS5 trigram tokenizer on Chinese text', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE VIRTUAL TABLE test_fts USING fts5(
        content,
        tokenize="trigram"
      );
    `);

    db.prepare('INSERT INTO test_fts (content) VALUES (?)').run('图论中最短路径算法失败记录');
    db.prepare('INSERT INTO test_fts (content) VALUES (?)').run('非负权图中首次发现某点即可固定其距离');

    // 3-char match via trigram
    const rows = db.prepare('SELECT * FROM test_fts WHERE test_fts MATCH ?').all('"最短路"');
    expect(rows.length).toBe(1);
    expect((rows[0] as { content: string }).content).toContain('最短路径算法');

    db.close();
  });

  it('verifies 1-2 char Chinese search fallback using escaped LIKE query', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE test_posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        body TEXT
      );
    `);

    db.prepare('INSERT INTO test_posts (id, title, body) VALUES (?, ?, ?)').run(
      'post_1',
      '图论笔记',
      '包含重要发现'
    );
    db.prepare('INSERT INTO test_posts (id, title, body) VALUES (?, ?, ?)').run(
      'post_2',
      '代码审查',
      '没有问题'
    );

    function escapeLike(str: string): string {
      return str.replace(/([%_\\])/g, '\\$1');
    }

    // 1-char search for "图"
    const q1 = escapeLike('图');
    const rows1 = db.prepare(
      "SELECT * FROM test_posts WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\'"
    ).all(`%${q1}%`, `%${q1}%`);
    expect(rows1.length).toBe(1);
    expect((rows1[0] as { id: string }).id).toBe('post_1');

    // 2-char search for "审查"
    const q2 = escapeLike('审查');
    const rows2 = db.prepare(
      "SELECT * FROM test_posts WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\'"
    ).all(`%${q2}%`, `%${q2}%`);
    expect(rows2.length).toBe(1);
    expect((rows2[0] as { id: string }).id).toBe('post_2');

    db.close();
  });

  it('verifies official MCP SDK server-client handshake with zero side-effects', async () => {
    const server = new Server(
      {
        name: 'detuned-probe',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    server.setRequestHandler(
      ListToolsRequestSchema,
      async () => {
        return {
          tools: [
            {
              name: 'forum_context',
              description: 'Detuned context tool probe',
              inputSchema: {
                type: 'object',
                properties: {
                  space_id: { type: 'string' },
                },
                required: ['space_id'],
              },
            },
          ],
        };
      }
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const toolsResult = await client.listTools();
    expect(toolsResult.tools.length).toBe(1);
    expect(toolsResult.tools[0]?.name).toBe('forum_context');

    await client.close();
    await server.close();
  });
});
