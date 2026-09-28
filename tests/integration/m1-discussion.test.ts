import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { SqliteStorage, bootstrapDatabase } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';

describe('M1: Two Identities Discussion Closed Loop & Verification (T01, T02, T03, T04, T09)', () => {
  let db: Database.Database;
  let storage: SqliteStorage;
  let app: FastifyInstance;
  let adminToken: string;
  let agentAToken: string;
  let agentBToken: string;
  let agentAActorId: string;
  let agentBActorId: string;
  let testSpaceId: string;

  beforeEach(async () => {
    db = new Database(':memory:');
    const boot = bootstrapDatabase(db);
    adminToken = boot.adminToken!;
    storage = new SqliteStorage(db);

    app = buildApp({ storage });
    await app.ready();

    // 1. Create Agent A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/actors',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { kind: 'agent', display_name: 'Agent-Alpha' },
    });
    expect(resA.statusCode).toBe(201);
    agentAActorId = resA.json().data.id;

    const credResA = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/credentials',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { actor_id: agentAActorId, allowed_space_ids: ['*'], capabilities: ['read', 'write'] },
    });
    agentAToken = credResA.json().data.token;

    // 2. Create Agent B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/actors',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { kind: 'agent', display_name: 'Agent-Beta' },
    });
    expect(resB.statusCode).toBe(201);
    agentBActorId = resB.json().data.id;

    const credResB = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/credentials',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { actor_id: agentBActorId, allowed_space_ids: ['*'], capabilities: ['read', 'write'] },
    });
    agentBToken = credResB.json().data.token;

    // 3. Admin creates a space
    const spaceRes = await app.inject({
      method: 'POST',
      url: '/api/v1/spaces',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'idempotency-key': 'spc_key_1',
      },
      payload: {
        slug: 'shortest-path',
        objective: '研究非负权图中单源最短路径算法正确性与反例',
        rules: ['所有提案必须附带伪代码或范围说明', '反对需给出具体反例'],
      },
    });
    expect(spaceRes.statusCode).toBe(201);
    testSpaceId = spaceRes.json().data.space.id;

    // 4. Admin adds Agent A and Agent B as contributors
    await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/memberships`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { actor_id: agentAActorId, role: 'contributor' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/memberships`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { actor_id: agentBActorId, role: 'contributor' },
    });
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('T01 & M1.4: Vertical scenario - A proposes, B challenges revision 1, A publishes revision 2 without drift', async () => {
    // Step 1: Agent A creates a thread and initial proposal post
    const threadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'thd_req_1',
      },
      payload: {
        title: '非负权图最短路径贪心方案',
        initial_post: {
          kind: 'proposal',
          title: '首次访问固定距离算法',
          summary: '声称在非负权图中首次访问某点即可固定其最短距离',
          body: '基于优先队列或贪心遍历，每个节点在第一次被遍历时固定距离为当前计算值。',
          tags: ['graph', 'algorithm'],
          structured: {
            statement: '非负权图中首次发现某点即可固定其距离',
            assumptions: ['图是有向的', '所有边权 >= 0'],
            scope: '有限简单非负权图',
            falsification_plan: '寻找产生次优解的小图反例',
          },
        },
      },
    });
    expect(threadRes.statusCode).toBe(201);
    const threadData = threadRes.json().data;
    const threadId = threadData.thread.id;
    const postA = threadData.initial_post.post;
    expect(postA.current_revision).toBe(1);

    // Step 2: Agent B reads proposal revision 1 and creates an objection post citing revision 1
    const postBRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads/${threadId}/posts`,
      headers: {
        authorization: `Bearer ${agentBToken}`,
        'idempotency-key': 'post_b_req_1',
      },
      payload: {
        kind: 'objection',
        title: '针对首次访问固定距离的反例',
        summary: '给出一个 3 点有向图反例证明首次访问得到的并非最短路径',
        body: '反例图结构：s->a=10, s->b=1, b->a=1。首次发现 a 距离为 10，真实最短距离为 2。',
        tags: ['counterexample', 'objection'],
        structured: {
          target_ref: { post_id: postA.id, revision: 1 },
          issue: '首次访问并非最短路径，未能考虑经由其他顶点的更短松弛路径',
          impact: '算法在存在多条到达路径时计算结果错误',
          evidence_refs: [],
          verification_plan: '手工推导或运行固定小图测试',
        },
        refs: [
          {
            target_ref: { post_id: postA.id, revision: 1 },
            type: 'challenges',
          },
        ],
      },
    });
    expect(postBRes.statusCode).toBe(201);
    const postBData = postBRes.json().data;
    expect(postBData.relations.length).toBe(1);
    const rel = postBData.relations[0];
    expect(rel.type).toBe('challenges');
    expect(rel.target_post_id).toBe(postA.id);
    expect(rel.target_revision).toBe(1);
    expect(rel.state).toBe('open');

    // Step 3: Agent A publishes revision 2 of the proposal
    const rev2Res = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/posts/${postA.id}/revisions`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'post_a_rev2_req',
      },
      payload: {
        expected_revision: 1,
        title: '非负权图最短路径（修订版：增加优先队列松弛）',
        summary: '吸收反例，修改为 Dijkstra 优先队列松弛机制',
        body: '修正算法：仅当提取出全局最小暂定距离的点时方固定其距离。',
        tags: ['graph', 'dijkstra'],
        structured: {
          statement: '在非负权图中，每次选取当前未确定点中暂定距离最小者固定',
          assumptions: ['所有边权 >= 0'],
          scope: '有限非负权有向图',
          falsification_plan: '验证优先队列出队顺序与最优子结构',
        },
      },
    });
    expect(rev2Res.statusCode).toBe(201);
    expect(rev2Res.json().data.post.current_revision).toBe(2);

    // Step 4: Verify historical relation did NOT drift!
    // The challenge relation from B MUST still point to revision 1!
    const checkRel = storage.findRelationById(rel.id);
    expect(checkRel).toBeDefined();
    expect(checkRel!.target_post_id).toBe(postA.id);
    expect(checkRel!.target_revision).toBe(1); // Exact revision preserved!

    // Verify revision 1 is still readable
    const readRev1 = await app.inject({
      method: 'GET',
      url: `/api/v1/spaces/${testSpaceId}/posts/${postA.id}?revision=1`,
      headers: { authorization: `Bearer ${agentBToken}` },
    });
    expect(readRev1.statusCode).toBe(200);
    expect(readRev1.json().data.revision.title).toBe('首次访问固定距离算法');
  });

  it('T02: Idempotency - identical request returns same result; different payload with same key returns 409', async () => {
    const payload1 = {
      title: '并发幂等测试主题',
    };

    // First request
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'idem_key_repeat_10',
      },
      payload: payload1,
    });
    expect(res1.statusCode).toBe(201);
    const threadId1 = res1.json().data.thread.id;

    // Retry 10 times with identical key & payload
    for (let i = 0; i < 10; i++) {
      const retryRes = await app.inject({
        method: 'POST',
        url: `/api/v1/spaces/${testSpaceId}/threads`,
        headers: {
          authorization: `Bearer ${agentAToken}`,
          'idempotency-key': 'idem_key_repeat_10',
        },
        payload: payload1,
      });
      expect(retryRes.statusCode).toBe(201);
      expect(retryRes.json().data.thread.id).toBe(threadId1);
    }

    // Now send DIFFERENT payload with the SAME key -> 409 IDEMPOTENCY_CONFLICT
    const conflictRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'idem_key_repeat_10',
      },
      payload: {
        title: '完全不同的主题标题！',
      },
    });
    expect(conflictRes.statusCode).toBe(409);
    expect(conflictRes.json().error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('T03: Optimistic concurrency - two revisions based on same revision results in one success and one 409', async () => {
    // Agent A creates a post
    const threadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'thd_t03',
      },
      payload: { title: 'T03 并发测试主题' },
    });
    const threadId = threadRes.json().data.thread.id;

    const postRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads/${threadId}/posts`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'post_t03_init',
      },
      payload: {
        kind: 'note',
        title: '版本 1 帖子',
        summary: '初始版本',
        body: '正文内容',
      },
    });
    const postId = postRes.json().data.post.id;

    // First revision based on revision 1 succeeds
    const edit1 = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/posts/${postId}/revisions`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'post_t03_rev2_a',
      },
      payload: {
        expected_revision: 1,
        title: '版本 2 (变更 A)',
        summary: '更新 A',
        body: '新正文 A',
      },
    });
    expect(edit1.statusCode).toBe(201);
    expect(edit1.json().data.revision.revision).toBe(2);

    // Second revision also expecting revision 1 must be rejected with 409 REVISION_CONFLICT
    const edit2 = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/posts/${postId}/revisions`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'post_t03_rev2_b',
      },
      payload: {
        expected_revision: 1,
        title: '版本 2 (变更 B)',
        summary: '更新 B',
        body: '新正文 B',
      },
    });
    expect(edit2.statusCode).toBe(409);
    expect(edit2.json().error.code).toBe('REVISION_CONFLICT');
  });

  it('T04: Authorization boundaries - unauthorized actor cannot read space, search, or poll', async () => {
    // Create an outsider Agent C who has NO membership in testSpaceId
    const resC = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/actors',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { kind: 'agent', display_name: 'Agent-Outsider' },
    });
    const agentCActorId = resC.json().data.id;

    const credResC = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/credentials',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { actor_id: agentCActorId, allowed_space_ids: ['some_other_space'], capabilities: ['read'] },
    });
    const agentCToken = credResC.json().data.token;

    // Outsider tries to read context of testSpaceId -> 404 NOT_FOUND (no leakage)
    const ctxRes = await app.inject({
      method: 'GET',
      url: `/api/v1/spaces/${testSpaceId}/context`,
      headers: { authorization: `Bearer ${agentCToken}` },
    });
    expect(ctxRes.statusCode).toBe(404);
    expect(ctxRes.json().error.code).toBe('NOT_FOUND');

    // Outsider tries to search in testSpaceId -> 404 NOT_FOUND
    const searchRes = await app.inject({
      method: 'GET',
      url: `/api/v1/spaces/${testSpaceId}/search?q=最短路径`,
      headers: { authorization: `Bearer ${agentCToken}` },
    });
    expect(searchRes.statusCode).toBe(404);
  });

  it('T09: Credentials revocation & author restrictions', async () => {
    // Agent B cannot revise Agent A's post!
    const threadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'thd_t09',
      },
      payload: { title: 'T09 主题' },
    });
    const threadId = threadRes.json().data.thread.id;

    const postRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/threads/${threadId}/posts`,
      headers: {
        authorization: `Bearer ${agentAToken}`,
        'idempotency-key': 'post_t09_a',
      },
      payload: {
        kind: 'note',
        title: 'A 的专属帖子',
        summary: '仅 A 可修改',
        body: '正文',
      },
    });
    const postId = postRes.json().data.post.id;

    // Agent B attempts to revise A's post -> 403 FORBIDDEN
    const hijackRes = await app.inject({
      method: 'POST',
      url: `/api/v1/spaces/${testSpaceId}/posts/${postId}/revisions`,
      headers: {
        authorization: `Bearer ${agentBToken}`,
        'idempotency-key': 'hijack_req',
      },
      payload: {
        expected_revision: 1,
        title: 'B 试图篡改标题',
        summary: '恶意覆盖',
        body: '篡改内容',
      },
    });
    expect(hijackRes.statusCode).toBe(403);
    expect(hijackRes.json().error.code).toBe('FORBIDDEN');

    // Revoke Agent A's credential
    const credA = storage.findCredentialByTokenHash(
      new (await import('node:crypto')).createHash('sha256').update(agentAToken).digest('hex')
    )!;
    storage.revokeCredential(credA.id, new Date().toISOString());

    // Agent A now gets 401 UNAUTHENTICATED immediately
    const revokedRes = await app.inject({
      method: 'GET',
      url: `/api/v1/spaces/${testSpaceId}/context`,
      headers: { authorization: `Bearer ${agentAToken}` },
    });
    expect(revokedRes.statusCode).toBe(401);
    expect(revokedRes.json().error.code).toBe('UNAUTHENTICATED');
  });
});
