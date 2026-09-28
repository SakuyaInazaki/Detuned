import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  SqliteStorage,
  bootstrapDatabase,
  DirectoryLock,
} from '../src/index.js';

describe('SqliteStorage and Bootstrap', () => {
  let db: Database.Database;
  let storage: SqliteStorage;

  beforeEach(() => {
    db = new Database(':memory:');
    bootstrapDatabase(db);
    storage = new SqliteStorage(db);
  });

  afterEach(() => {
    db.close();
  });

  it('bootstraps database and creates initial admin credential', () => {
    const admin = db.prepare("SELECT * FROM actors WHERE kind = 'human'").get() as any;
    expect(admin).toBeDefined();
    expect(admin.display_name).toBe('Administrator');

    const cred = db.prepare('SELECT * FROM credentials WHERE actor_id = ?').get(admin.id) as any;
    expect(cred).toBeDefined();
    expect(JSON.parse(cred.capabilities)).toContain('admin');
  });

  it('enforces atomic rollback in transactions', () => {
    expect(() => {
      storage.transaction((tx) => {
        tx.createActor({
          id: 'act_temp_1',
          kind: 'agent',
          display_name: 'Temp Agent',
          created_at: new Date().toISOString(),
          disabled_at: null,
        });
        throw new Error('Simulated failure during transaction');
      });
    }).toThrow('Simulated failure during transaction');

    const found = storage.findActorById('act_temp_1');
    expect(found).toBeNull();
  });

  it('indexes posts into FTS and retrieves with trigram and short LIKE fallback', () => {
    const spaceId = 'spc_test';
    const now = new Date().toISOString();

    const admin = db.prepare("SELECT * FROM actors WHERE kind = 'human' LIMIT 1").get() as any;
    const actorId = admin.id;

    storage.createSpace(
      {
        id: spaceId,
        slug: 'test-space',
        current_revision: 1,
        policy_revision: 1,
        acl_epoch: 1,
        created_at: now,
      },
      {
        space_id: spaceId,
        revision: 1,
        objective: 'Test',
        rules: ['Rule 1'],
        review_policy: {
          enabled: true,
          required_reviewers: 2,
          exclude_contributors: true,
          distinct_actors: true,
          distinct_independence_groups: false,
          seal_until_all_submitted: true,
          invalidate_on_revision: true,
          required_checks: [],
          allow_open_objections: false,
        },
        check_profiles: {},
        pinned_refs: [],
        editor_id: actorId,
        created_at: now,
      }
    );

    const threadId = 'thd_1';
    storage.createThread({
      id: threadId,
      space_id: spaceId,
      title: '测试主题',
      version: 1,
      state: 'open',
      creator_id: actorId,
      created_at: now,
      updated_at: now,
    });

    storage.createPost(
      {
        id: 'pst_1',
        space_id: spaceId,
        thread_id: threadId,
        author_id: actorId,
        kind: 'proposal',
        current_revision: 1,
        lifecycle: 'active',
        created_at: now,
      },
      {
        post_id: 'pst_1',
        revision: 1,
        title: '最短路径算法分析',
        summary: '关于非负权有向图的讨论',
        body: '详细推导内容包含反例验证...',
        tags: ['algorithm', 'graph'],
        structured: {},
        content_hash: 'abc',
        editor_id: actorId,
        created_at: now,
      }
    );

    // 3-char search (trigram)
    const res1 = storage.searchPosts(spaceId, '最短路');
    expect(res1.items.length).toBe(1);
    expect(res1.items[0].post_id).toBe('pst_1');

    // 1-char search (LIKE fallback)
    const res2 = storage.searchPosts(spaceId, '图');
    expect(res2.items.length).toBe(1);
    expect(res2.items[0].post_id).toBe('pst_1');

    // Non-existent search
    const res3 = storage.searchPosts(spaceId, '不存在的关键词');
    expect(res3.items.length).toBe(0);
  });

  it('prevents multiple processes from locking the same directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detuned-lock-test-'));
    try {
      const lock1 = new DirectoryLock(tempDir);
      lock1.acquire();

      const lock2 = new DirectoryLock(tempDir);
      expect(() => lock2.acquire()).toThrow(/数据目录已被其他 Detuned 实例锁定/);

      lock1.release();

      // Now lock2 should be able to acquire
      expect(() => lock2.acquire()).not.toThrow();
      lock2.release();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
