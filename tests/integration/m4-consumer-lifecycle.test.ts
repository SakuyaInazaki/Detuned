import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { CreateSubscriptionRequestSchema, ToolSubscribeParamsSchema, SubscriptionStartConstraintSchema, isSubscriptionStartValid } from '@detuned/protocol';
import { adaptToolSchema } from '@detuned/adapter-pi';

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'detuned-consumer-life-'));
  const db = new Database(path.join(root, 'detuned.sqlite'));
  const admin = bootstrapDatabase(db).adminToken!;
  const app = buildApp({ storage: new SqliteStorage(db) });
  let serial = 0;
  const call = (method: 'POST' | 'DELETE', url: string, token: string, payload?: unknown) => app.inject({ method, url, headers: { authorization: `Bearer ${token}`, 'idempotency-key': `fixture-${++serial}` }, ...(payload === undefined ? {} : { payload: payload as object }) });
  async function ok(url: string, token: string, body: unknown) { const r = await call('POST', url, token, body); expect(r.statusCode).toBe(201); return r.json().data; }
  const spaceA = (await ok('/api/v1/spaces', admin, { slug: 'life-a', objective: 'test', rules: [] })).space.id;
  const spaceB = (await ok('/api/v1/spaces', admin, { slug: 'life-b', objective: 'test', rules: [] })).space.id;
  const actor = await ok('/api/v1/admin/actors', admin, { kind: 'agent', display_name: 'ordinary' });
  for (const space of [spaceA, spaceB]) await ok(`/api/v1/spaces/${space}/memberships`, admin, { actor_id: actor.id, role: 'observer' });
  const full = (await ok('/api/v1/admin/credentials', admin, { actor_id: actor.id, allowed_space_ids: [spaceA, spaceB], capabilities: ['read', 'write'] })).token;
  const onlyA = (await ok('/api/v1/admin/credentials', admin, { actor_id: actor.id, allowed_space_ids: [spaceA], capabilities: ['read', 'write'] })).token;
  return { db, app, admin, call, ok, full, onlyA, spaceA, spaceB, async close() { await app.close(); db.close(); await rm(root, { recursive: true, force: true }); } };
}
function counts(db: Database.Database) {
  return Object.fromEntries(['consumers', 'delivery_batches', 'events', 'subscriptions', 'posts'].map(table => [table, (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n]));
}

describe('M4.1-D consumer lifecycle regressions', () => {
  it('atomically clears pending or acknowledged delivery history on explicit deactivation, preserving research and subscriptions', async () => {
    const f = await fixture();
    try {
      const pending = (await f.ok(`/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, { consumer_key: 'pending', start: 'beginning' })).consumer.id;
      const acked = (await f.ok(`/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, { consumer_key: 'acked', start: 'beginning' })).consumer.id;
      const poll = async (id: string) => { const r = await f.call('POST', `/api/v1/spaces/${f.spaceA}/consumers/${id}/poll`, f.full, {}); expect(r.statusCode).toBe(200); return r.json().data; };
      const first = await poll(pending); const second = await poll(acked);
      expect(first.batch_id).toBeTypeOf('string'); expect(second.batch_id).toBeTypeOf('string');
      const ack = await f.call('POST', `/api/v1/spaces/${f.spaceA}/consumers/${acked}/ack`, f.full, { batch_id: second.batch_id, next_cursor: second.next_cursor }); expect(ack.statusCode).toBe(200);
      const before = counts(f.db); expect(before.consumers).toBe(2); expect(before.delivery_batches).toBe(2); expect(before.events).toBeGreaterThan(0);
      const deleted = [];
      for (const id of [pending, acked]) deleted.push(await f.call('DELETE', `/api/v1/spaces/${f.spaceA}/consumers/${id}`, f.full));
      const after = counts(f.db);
      console.log('consumer-lifecycle same-space observed', JSON.stringify({ before, after, statuses: deleted.map(r => r.statusCode), codes: deleted.map(r => r.json().error?.code ?? null) }));
      expect(deleted.map(r => r.statusCode)).toEqual([200, 200]);
      expect(after).toEqual({ ...before, consumers: 0, delivery_batches: 0 });
      expect(f.db.prepare('PRAGMA foreign_key_check').get()).toBeUndefined();
      for (const id of [pending, acked]) expect((await f.call('DELETE', `/api/v1/spaces/${f.spaceA}/consumers/${id}`, f.full)).statusCode).toBe(200);
      const restarted = (await f.ok(`/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, { consumer_key: 'pending', start: 'now' })).consumer;
      expect(restarted.id).not.toBe(pending); expect(restarted.ack_seq).toBe((f.db.prepare('SELECT max(seq) AS n FROM events WHERE space_id=?').get(f.spaceA) as { n: number }).n);
    } finally { await f.close(); }
  });

  it('cannot deactivate another-space consumer through an allowed-space URL with the same actor restricted credential', async () => {
    const f = await fixture();
    try {
      const id = (await f.ok(`/api/v1/spaces/${f.spaceB}/subscriptions`, f.full, { consumer_key: 'space-b', start: 'now' })).consumer.id;
      const before = counts(f.db); expect(before.consumers).toBe(1); expect(before.delivery_batches).toBe(0);
      const correctSpaceDenied = await f.call('DELETE', `/api/v1/spaces/${f.spaceB}/consumers/${id}`, f.onlyA); expect(correctSpaceDenied.statusCode).toBe(404); expect(correctSpaceDenied.json().error.code).toBe('NOT_FOUND');
      const result = await f.call('DELETE', `/api/v1/spaces/${f.spaceA}/consumers/${id}`, f.onlyA);
      const after = counts(f.db);
      console.log('consumer-lifecycle cross-space observed', JSON.stringify({ before, after, status: result.statusCode, code: result.json().error?.code ?? null, consumerRemains: !!f.db.prepare('SELECT id FROM consumers WHERE id=?').get(id) }));
      expect(result.statusCode).toBe(403); expect(after).toEqual(before);
      expect(f.db.prepare('SELECT id FROM consumers WHERE id=?').get(id)).toBeDefined();
    } finally { await f.close(); }
  });

  it('enforces the shared start/token constraint in HTTP and direct core before any subscription mutation', async () => {
    const f = await fixture();
    try {
      const auth = (f.app as any).authService.authenticateToken(f.full);
      const invalid = [
        { start: 'context_checkpoint' }, { start: 'context_checkpoint', checkpoint_token: '' },
        { checkpoint_token: 'present' }, { start: 'beginning', checkpoint_token: 'present' },
        { start: 'now', checkpoint_token: 'present' },
      ];
      const before = counts(f.db);
      for (const combo of invalid) {
        const body = { consumer_key: 'invalid', ...combo };
        expect(isSubscriptionStartValid(body)).toBe(false);
        expect(() => (f.app as any).eventService.subscribe(auth, f.spaceA, body)).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 }));
        const result = await f.call('POST', `/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, body);
        expect(result.statusCode).toBe(400); expect(result.json().error.code).toBe('VALIDATION_ERROR');
        expect(counts(f.db)).toEqual(before);
      }
      const denied = await f.call('POST', `/api/v1/spaces/${f.spaceB}/subscriptions`, f.onlyA, { consumer_key: 'no-access', start: 'now' });
      expect(denied.statusCode).toBe(404); expect(counts(f.db)).toEqual(before);
      expect(CreateSubscriptionRequestSchema.allOf?.[0]).toBe(SubscriptionStartConstraintSchema);
      expect(ToolSubscribeParamsSchema.allOf?.[0]).toBe(SubscriptionStartConstraintSchema);
      expect(adaptToolSchema(ToolSubscribeParamsSchema)).toBe(ToolSubscribeParamsSchema);
    } finally { await f.close(); }
  });

  it('retains checkpoint validation before reuse and never resets an existing consumer position', async () => {
    const f = await fixture();
    try {
      const context = await f.app.inject({ method: 'GET', url: `/api/v1/spaces/${f.spaceA}/context`, headers: { authorization: `Bearer ${f.full}` } });
      expect(context.statusCode).toBe(200); const token = context.json().data.checkpoint_token;
      const body = { consumer_key: 'checkpoint', start: 'context_checkpoint', checkpoint_token: token };
      const created = (await f.ok(`/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, body)).consumer;
      expect(created.ack_seq).toBeGreaterThan(0);
      const reused = (await f.ok(`/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, { consumer_key: 'checkpoint', start: 'beginning' })).consumer;
      expect(reused.id).toBe(created.id); expect(reused.ack_seq).toBe(created.ack_seq);
      const before = counts(f.db);
      const bad = await f.call('POST', `/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, { ...body, checkpoint_token: 'invalid-signature' });
      expect(bad.statusCode).toBe(422); expect(counts(f.db)).toEqual(before);
      const validReuse = (await f.ok(`/api/v1/spaces/${f.spaceA}/subscriptions`, f.full, body)).consumer;
      expect(validReuse).toEqual(created);
    } finally { await f.close(); }
  });
});
