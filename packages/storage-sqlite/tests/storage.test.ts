import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  SqliteStorage,
  bootstrapDatabase,
  openAndCoordinateDatabase,
  DirectoryLock,
  SCHEMA_SQL,
  V2_SCHEMA_TABLES,
  V1_SCHEMA_TABLES,
  parseFts5Ddl,
} from '../src/index.js';
import { extractDatabaseRequirements } from '../scripts/extract-schema-requirements.mjs';

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
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('verifies schema.sql and SCHEMA_SQL in schema.ts are strictly identical (single DDL source of truth)', () => {
    const sqlFilePath = path.resolve(__dirname, '../src/schema.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8').replace(/^--.*$/gm, '').trim();
    const tsSql = SCHEMA_SQL.trim();
    expect(tsSql).toBe(sqlContent);
  });

  it('asserts complete DDL parity between fresh bootstrap and upgraded v1 database', () => {
    const freshDb = new Database(':memory:');
    bootstrapDatabase(freshDb);

    const v1SqlPath = path.resolve(__dirname, '../../../tests/fixtures/historical-v1-schema.sql');
    const v1Sql = fs.readFileSync(v1SqlPath, 'utf8');

    const upgradedDb = new Database(':memory:');
    upgradedDb.exec(v1Sql);
    upgradedDb.pragma('foreign_keys = ON');
    upgradedDb.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)').run(new Date().toISOString());
    upgradedDb.prepare("INSERT INTO actors (id, kind, display_name, created_at) VALUES ('act_admin', 'human', 'Admin', ?)").run(new Date().toISOString());
    upgradedDb.prepare("INSERT INTO credentials (id, actor_id, token_hash, allowed_space_ids, capabilities, created_at) VALUES ('cred_admin', 'act_admin', 'hash', '[\"*\"]', '[\"admin\"]', ?)").run(new Date().toISOString());

    openAndCoordinateDatabase(upgradedDb, 'serve');

    const getTableNames = (d: Database.Database) =>
      d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all()
        .map((r: any) => r.name);

    const freshTables = getTableNames(freshDb);
    const upgradedTables = getTableNames(upgradedDb);
    expect(upgradedTables).toEqual(freshTables);

    for (const table of freshTables) {
      // Columns
      const freshCols = freshDb.prepare(`PRAGMA table_info("${table}")`).all();
      const upgradedCols = upgradedDb.prepare(`PRAGMA table_info("${table}")`).all();
      expect(upgradedCols).toEqual(freshCols);

      // Foreign keys
      const freshFks = freshDb.prepare(`PRAGMA foreign_key_list("${table}")`).all();
      const upgradedFks = upgradedDb.prepare(`PRAGMA foreign_key_list("${table}")`).all();
      expect(upgradedFks).toEqual(freshFks);

      // Indexes and their detailed definitions (columns, order, uniqueness, partial predicate)
      const freshIdx = freshDb.prepare(`PRAGMA index_list("${table}")`).all() as any[];
      const upgradedIdx = upgradedDb.prepare(`PRAGMA index_list("${table}")`).all() as any[];
      expect(upgradedIdx).toEqual(freshIdx);

      for (const idx of freshIdx) {
        const freshXinfo = freshDb.prepare(`PRAGMA index_xinfo("${idx.name}")`).all();
        const upgradedXinfo = upgradedDb.prepare(`PRAGMA index_xinfo("${idx.name}")`).all();
        expect(upgradedXinfo).toEqual(freshXinfo);
      }
    }

    // Virtual table post_fts module and definition parity
    const freshFts = freshDb.prepare("SELECT sql FROM sqlite_master WHERE name='post_fts'").get();
    const upgradedFts = upgradedDb.prepare("SELECT sql FROM sqlite_master WHERE name='post_fts'").get();
    expect(upgradedFts).toEqual(freshFts);

    freshDb.close();
    upgradedDb.close();
  });

  it('asserts complete consistency between runtime schema profiles and authoritative DDL sources (schema.sql and historical-v1-schema.sql)', () => {
    // 1. V2 Profile Parity against authoritative schema.sql
    const v2Db = new Database(':memory:');
    const v2Sql = fs.readFileSync(path.resolve(__dirname, '../src/schema.sql'), 'utf8');
    v2Db.exec(v2Sql);
    const expectedV2 = extractDatabaseRequirements(v2Db);
    expect(V2_SCHEMA_TABLES).toEqual(expectedV2);

    // 2. V1 Profile Parity against frozen historical fixture
    const v1Db = new Database(':memory:');
    const v1SqlPath = path.resolve(__dirname, '../../../tests/fixtures/historical-v1-schema.sql');
    const v1Sql = fs.readFileSync(v1SqlPath, 'utf8');
    v1Db.exec(v1Sql);
    const expectedV1 = extractDatabaseRequirements(v1Db);
    expect(V1_SCHEMA_TABLES).toEqual(expectedV1);

    // 3. FTS5 Definition Parity via table requirement
    expect(V2_SCHEMA_TABLES['post_fts'].virtual).toBe(true);
    expect(V2_SCHEMA_TABLES['post_fts'].fts?.configs['tokenize']).toBe('trigram');
    expect(V1_SCHEMA_TABLES['post_fts'].virtual).toBe(true);
    expect(V1_SCHEMA_TABLES['post_fts'].fts?.configs['tokenize']).toBe('trigram');

    // 4. Intentional drift detection in isolated schema copy
    const mutatedDb = new Database(':memory:');
    mutatedDb.exec(v2Sql.replace('objective TEXT NOT NULL,', 'objective TEXT,'));
    const mutatedV2 = extractDatabaseRequirements(mutatedDb);
    expect(V2_SCHEMA_TABLES).not.toEqual(mutatedV2);

    // 5. Command-level sync tool verifies cleanly
    const checkScriptPath = path.resolve(__dirname, '../scripts/check-schema-sync.mjs');
    const checkResult = spawnSync(process.execPath, [checkScriptPath], { encoding: 'utf8' });
    expect(checkResult.status).toBe(0);

    v2Db.close();
    v1Db.close();
    mutatedDb.close();
  });
});
