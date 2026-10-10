// Bounded author probe only. Intentionally not *.test.ts and excluded from the normal suite.
import { it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { setImmediate as yieldTurn } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { AuthService, CryptoHasher, CryptoIdGenerator, SystemClock, IdempotencyService, SpaceService, ThreadService, SpaceExportService } from '@detuned/core';
it('author keyset probe: 10000 small posts and revisions, bounded 30s, discard lines', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'detuned-export-keyset-probe-'));
  const db = new Database(path.join(root, 'forum.sqlite')); let exportService: SpaceExportService | undefined;
  let observed = { requested_posts: 10000, body_bytes: 128, lines: 0, elapsed_ms: 0, max_next_ms: 0, complete: false, deadline_exceeded: false };
  try {
    const boot = bootstrapDatabase(db), storage = new SqliteStorage(db), clock = new SystemClock(), hash = new CryptoHasher(), ids = new CryptoIdGenerator();
    const authService = new AuthService(storage, hash, clock), auth = authService.authenticateToken(boot.adminToken!);
    const idem = new IdempotencyService(storage, hash, clock);
    const sid = new SpaceService(storage, ids, clock, authService, idem).createSpace(auth, { slug: 'probe', objective: 'probe', rules: [] }, 'space').space.id;
    const tid = new ThreadService(storage, ids, clock, hash, authService, idem).createThread(auth, sid, { title: 'probe' }, 'thread').thread.id;
    const post = db.prepare("INSERT INTO posts(id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at) VALUES(?,?,?,?, 'note',1,'active',?)");
    const revision = db.prepare("INSERT INTO post_revisions(post_id,revision,title,summary,body,tags,structured,content_hash,editor_id,created_at) VALUES(?,1,'title','summary',?,'[]','{}',?,?,?)");
    const body = 'x'.repeat(128), digest = createHash('sha256').update(body).digest('hex'), now = clock.nowIso();
    db.transaction(() => { for (let n = 0; n < 10000; n++) { const id = 'post_' + String(n).padStart(5, '0'); post.run(id,sid,tid,auth.actor.id,now); revision.run(id,body,digest,auth.actor.id,now); } })();
    exportService = new SpaceExportService(storage, authService, clock); const session = exportService.open(auth, sid); const started = performance.now();
    try {
      for (;;) {
        if (performance.now() - started > 30000) { observed.deadline_exceeded = true; break; }
        const before = performance.now(); const next = session.nextLine(); observed.max_next_ms = Math.max(observed.max_next_ms, performance.now() - before);
        if (next.kind === 'done') { observed.complete = true; break; }
        if (next.kind === 'line') observed.lines++;
        await yieldTurn();
      }
    } finally { session.close(); observed.elapsed_ms = performance.now() - started; }
    console.log(JSON.stringify(observed));
    expect(observed.complete).toBe(true); expect(observed.lines).toBe(20006);
  } catch (error) { console.log(JSON.stringify({ ...observed, error: error instanceof Error ? error.name : 'unknown' })); throw error; }
  finally { exportService?.closeAll(); db.close(); await rm(root, { recursive: true, force: true }); }
}, 35000);
