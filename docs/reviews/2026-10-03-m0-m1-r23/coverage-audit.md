# R23 最终覆盖与32操作政策核对

以下逐文件计数直接提取自 [最终正式测试输出](final-review/observed-tests.txt)，与 [integrity.json](final-review/integrity.json) 一致。183/183、14文件，无跳过或失败。原C.3为180/13；原C03两条合并为完整八组合使C文件27→26，新G01–G04增加4项，最终183/14。

| 正式测试文件 | 数量 |
|---|---:|
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/integration/m1-discussion.test.ts` | 5 |
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `packages/protocol/tests/schema.test.ts` | 5 |
| `tests/probes/m0-probes.test.ts` | 3 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `tests/contracts/r4-c-route-contracts.test.ts` | 4 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| `tests/contracts/r4-c-contracts.test.ts` | 26 |
| **合计** | **183** |

## 有限覆盖与运行证据

C01既有请求边界、C02正文/退避/分类、C03安装版Pi与输出矩阵均通过。新G01对比实际路由完整method/path、所有body结构与params；G02–G04覆盖共享整数、字符串/枚举/CSV/header及匿名/订阅/poll/no-body代表行为。B82与生成6继续通过。探针AC6/AD5/AE5/U8各全通；探针和正式测试有重叠，不将它们累加为独立场景数量。

[29命令记录](final-review/commands.json)均exit0、无timeout；包含build/typecheck/lint/test:all及25条历史探针。实际 [路由政策采集输出](final-review/observed-route-policies.json)另行exit0，不计入29。采集代码为 [collect-route-policies.mjs](implementation-c3-gate/contracts/collect-route-policies.mjs)，来自实际Fastify onRoute与生成OpenAPI，完整结构信息保留在JSON。

## 实际32操作政策表

本表由最终采集JSON生成，路径省略`/api/v1`；不是手工补列接口。body列为实际schema源，`none`代表无schema；三个无正文写端点允许undefined/null/{}、拒绝非空对象/数组/基础类型。query缺省取声明default或undefined，必填缺省拒绝；未知和重复query拒绝，CSV使用单一逗号分隔参数，tags空值为[]，整数和普通标量空值拒绝。完整每参数范围/默认/枚举/传输说明、缺省/空值/重复/未知政策、公共验证来源及正式断言指针见采集JSON。

所有path参数均依现有string定义，不新增UUID/前缀规则；业务header列只列Idempotency-Key等业务字段，标准Host/Accept等正常允许。业务必需key按非空白约束处理。capabilities匿名，其余沿既有Bearer；HTTP body不做类型coercion。标准parameter schema不负责执行未知/重复query政策，这部分由HTTP正式测试验证。

| method/path | body | query | path params | 业务header |
|---|---|---|---|---|
| `POST /admin/actors` | CreateActorRequestSchema（必需） | — | — | — |
| `POST /admin/credentials` | CreateCredentialRequestSchema（必需） | — | — | — |
| `POST /admin/credentials/{id}/revoke` | none | — | id | — |
| `GET /capabilities` | none | — | — | — |
| `GET /me` | none | — | — | — |
| `GET /spaces` | none | limit, cursor | — | — |
| `POST /spaces` | CreateSpaceRequestSchema（必需） | — | — | Idempotency-Key（必需） |
| `PATCH /spaces/{space_id}` | PatchSpaceRequestSchema（必需） | — | space_id | Idempotency-Key（必需） |
| `DELETE /spaces/{space_id}/consumers/{id}` | none | — | space_id, id | — |
| `POST /spaces/{space_id}/consumers/{id}/ack` | AckRequestSchema（必需） | — | space_id, id | — |
| `POST /spaces/{space_id}/consumers/{id}/poll` | PollRequestSchema（必需） | — | space_id, id | — |
| `GET /spaces/{space_id}/context` | none | max_bytes, focus_thread_id | space_id | — |
| `POST /spaces/{space_id}/memberships` | CreateMembershipRequestSchema（必需） | — | space_id | — |
| `DELETE /spaces/{space_id}/memberships/{actor_id}` | none | — | space_id, actor_id | — |
| `PATCH /spaces/{space_id}/memberships/{actor_id}` | PatchMembershipRequestSchema（必需） | — | space_id, actor_id | — |
| `GET /spaces/{space_id}/posts/{id}` | none | revision | space_id, id | — |
| `GET /spaces/{space_id}/posts/{id}/revisions` | none | limit, cursor | space_id, id | — |
| `POST /spaces/{space_id}/posts/{id}/revisions` | CreatePostRevisionRequestSchema（必需） | — | space_id, id | Idempotency-Key（必需） |
| `POST /spaces/{space_id}/posts/{id}/withdraw` | WithdrawPostRequestSchema（必需） | — | space_id, id | Idempotency-Key（必需） |
| `POST /spaces/{space_id}/redactions` | CreateRedactionRequestSchema（必需） | — | space_id | Idempotency-Key（必需） |
| `POST /spaces/{space_id}/relations` | CreateRelationRequestSchema（必需） | — | space_id | Idempotency-Key（必需） |
| `POST /spaces/{space_id}/relations/{id}/reopen` | ReopenRelationRequestSchema（必需） | — | space_id, id | Idempotency-Key（必需） |
| `POST /spaces/{space_id}/relations/{id}/resolve` | ReopenRelationRequestSchema（必需） | — | space_id, id | Idempotency-Key（必需） |
| `GET /spaces/{space_id}/search` | none | q, kind, tags, thread_id, limit, cursor | space_id | — |
| `POST /spaces/{space_id}/sessions` | CreateSessionRequestSchema（必需） | — | space_id | — |
| `POST /spaces/{space_id}/subscriptions` | CreateSubscriptionRequestSchema（必需） | — | space_id | Idempotency-Key（可选） |
| `GET /spaces/{space_id}/threads` | none | state, limit, cursor | space_id | — |
| `POST /spaces/{space_id}/threads` | CreateThreadRequestSchema（必需） | — | space_id | Idempotency-Key（必需） |
| `GET /spaces/{space_id}/threads/{id}` | none | limit, cursor | space_id, id | — |
| `PATCH /spaces/{space_id}/threads/{id}` | PatchThreadRequestSchema（必需） | — | space_id, id | Idempotency-Key（必需） |
| `POST /spaces/{space_id}/threads/{id}/posts` | CreatePostRequestSchema（必需） | — | space_id, id | Idempotency-Key（必需） |
| `GET /spaces/{space_id}/views/{name}` | none | — | space_id, name | — |

每操作来源为采集记录中的body schema、protocol/src/request-policies.ts与openapi.ts、server utils/query.ts及实际路由；正式完整性由G01负责，行为代表断言由G02–G04和已有C01负责，不虚称每个路由都拥有独立的全部变体测试。

最终快照与材料完整性见 [stable-before](final-review/stable-before.json)、[stable-after](final-review/stable-after.json) 和 [完整性报告](final-review/integrity.json)。未运行Node22、干净安装、远程CI、四真实宿主或模型；M2附件等规划能力没有纳入本次验收。
