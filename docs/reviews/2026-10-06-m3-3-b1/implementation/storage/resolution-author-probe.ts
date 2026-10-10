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
it('author keyset probe: 10000 resolution histories, bounded 30s, discard lines', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'detuned-export-keyset-probe-'));
  const db = new Database(path.join(root, 'forum.sqlite')); let exportService: SpaceExportService | undefined;
  let observed = { requested_resolutions: 10000, body_bytes: 128, lines: 0, elapsed_ms: 0, max_next_ms: 0, complete: false, deadline_exceeded: false };
  try {
    const boot = bootstrapDatabase(db), storage = new SqliteStorage(db), clock = new SystemClock(), hash = new CryptoHasher(), ids = new CryptoIdGenerator();
    const authService = new AuthService(storage, hash, clock), auth = authService.authenticateToken(boot.adminToken!);
    const idem = new IdempotencyService(storage, hash, clock);
    const sid = new SpaceService(storage, ids, clock, authService, idem).createSpace(auth, { slug: 'probe', objective: 'probe', rules: [] }, 'space').space.id;
    const tid = new ThreadService(storage, ids, clock, hash, authService, idem).createThread(auth, sid, { title: 'probe' }, 'thread').thread.id;
    const post = db.prepare("INSERT INTO posts(id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at) VALUES(?,?,?,?, 'note',1,'active',?)");
    const revision = db.prepare("INSERT INTO post_revisions(post_id,revision,title,summary,body,tags,structured,content_hash,editor_id,created_at) VALUES(?,1,'title','summary',?,'[]','{}',?,?,?)");
    const body = 'x'.repeat(128), digest = createHash('sha256').update(body).digest('hex'), now = clock.nowIso();
    post.run('post_reason',sid,tid,auth.actor.id,now); revision.run('post_reason',body,digest,auth.actor.id,now);
    db.prepare("INSERT INTO relations(id,space_id,source_post_id,source_revision,target_post_id,target_revision,type,state,version,creator_id,created_at) VALUES('rel_probe',?, 'post_reason',1,'post_reason',1,'challenges','open',10001,?,?)").run(sid,auth.actor.id,now);
    const ins = db.prepare("INSERT INTO relation_resolutions(id,relation_id,version,resolver_id,reason_ref,action,created_at) VALUES(?,'rel_probe',?,?,?,?,?)");
    const ref=JSON.stringify({post_id:'post_reason',revision:1});
    db.transaction(() => { for(let n=0;n<10000;n++) ins.run('resolution_'+String(n).padStart(5,'0'),n+2,auth.actor.id,ref,n%2===0?'resolve':'reopen',now); })();
    let resolutions=0, previousId='';
    exportService = new SpaceExportService(storage, authService, clock); const session = exportService.open(auth, sid); const started = performance.now();
    try {
      for (;;) {
        if (performance.now() - started > 30000) { observed.deadline_exceeded = true; break; }
        const before = performance.now(); const next = session.nextLine(); observed.max_next_ms = Math.max(observed.max_next_ms, performance.now() - before);
        if (next.kind === 'done') { observed.complete = true; break; }
        if (next.kind === 'line') { observed.lines++; const row=JSON.parse(next.line); if(row.kind==='relation_resolution') { expect(row.data.id > previousId).toBe(true); previousId=row.data.id; expect(row.data.version).toBe(resolutions+2); expect(row.data.reason_ref).toEqual({post_id:'post_reason',revision:1}); resolutions++; } }
        await yieldTurn();
      }
    } finally { session.close(); observed.elapsed_ms = performance.now() - started; }
    console.log(JSON.stringify(observed));
    expect(observed.complete).toBe(true); expect(resolutions).toBe(10000); expect(observed.lines).toBe(10009);
  } catch (error) { console.log(JSON.stringify({ ...observed, error: error instanceof Error ? error.name : 'unknown' })); throw error; }
  finally { exportService?.closeAll(); db.close(); await rm(root, { recursive: true, force: true }); }
}, 35000);
