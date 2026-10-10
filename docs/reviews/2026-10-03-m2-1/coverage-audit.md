# M2.1最终覆盖核对（含R1）

逐文件数量从 [最终测试输出](verification/r1-final/observed-tests.txt)提取，并与 [integrity](verification/r1-final/integrity.json)逐项一致：210/210、18文件，无跳过/失败。此前R23为183/14，M2.1增加core9/FS6/HTTP7/CLI4为209/18，R1新增HTTP metadata正式项后210/18。

| 正式测试文件 | 数量 |
|---|---:|
| `tests/integration/m1-discussion.test.ts` | 5 |
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/integration/m2-artifacts-filesystem.test.ts` | 6 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `tests/contracts/r4-c-route-contracts.test.ts` | 4 |
| `tests/integration/m2-artifacts-core.test.ts` | 9 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/integration/m2-artifacts-cli.test.ts` | 4 |
| `tests/probes/m0-probes.test.ts` | 3 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `tests/integration/m2-artifacts-http.test.ts` | 8 |
| `packages/protocol/tests/schema.test.ts` | 5 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| `tests/contracts/r4-c-contracts.test.ts` | 26 |
| **合计** | **210** |

## 有限覆盖与真实命令结果

原29命令28通过、1失败（不可改写）：原R21 AD02无条件读取application/json槽，合法multipart导致TypeError；原AD其余4/5通过，AC6/AE5/U8全通。父 Agent接受工具不兼容并授权 [版本化AD](verification/r1-final/observed-ad02-v2.json) 5/5补偿，保留原四项并增全35操作/method/path/media结构比较，详见 [映射](verification/ad02-v2-coverage-map.md)。不能累加为29/29。

[六组独立真实验证](verification/r1-final/observed-real-adversaries.json)6/6：尾部/截断/中断无半成品；重启重放/不同bytes冲突与安全下载；真实并发空间配额及4/5上传槽；暂停期间撤凭据/成员；无覆盖/symlink/DBtrigger失败/持锁GC；三写入口合法引用及重复/跨空间/脱敏原子拒绝。metadata4KiB两MIME边界与正常下载后关闭另有独立结果，均由 [independent-commands](verification/r1-final/independent-commands.json)及最终验证记录定位，不冒充实现方自验。

## 实际35操作与请求media

本表取R23已采集32操作政策证据，加最终AD02 media_schemas记录的三个附件操作；最终AD02独立确认它们与实际完整35路由集合一致。请求media完全取最终AD02输出，19 application/json + 1 multipart/form-data；无请求media的15操作显示—。没有手编不存在接口或给multipart制造JSON槽。响应media列仅列该最终media_schemas记录显式结构校验的附件响应，其他—不表示无JSON响应。

| method/path | 请求media | 本次显式响应media结构记录 |
|---|---|---|
| `DELETE /spaces/{space_id}/consumers/{id}` | — | — |
| `DELETE /spaces/{space_id}/memberships/{actor_id}` | — | — |
| `GET /capabilities` | — | — |
| `GET /me` | — | — |
| `GET /spaces` | — | — |
| `GET /spaces/{space_id}/artifacts/{id}` | — | application/json |
| `GET /spaces/{space_id}/artifacts/{id}/content` | — | application/octet-stream |
| `GET /spaces/{space_id}/context` | — | — |
| `GET /spaces/{space_id}/posts/{id}` | — | — |
| `GET /spaces/{space_id}/posts/{id}/revisions` | — | — |
| `GET /spaces/{space_id}/search` | — | — |
| `GET /spaces/{space_id}/threads` | — | — |
| `GET /spaces/{space_id}/threads/{id}` | — | — |
| `GET /spaces/{space_id}/views/{name}` | — | — |
| `PATCH /spaces/{space_id}` | application/json | — |
| `PATCH /spaces/{space_id}/memberships/{actor_id}` | application/json | — |
| `PATCH /spaces/{space_id}/threads/{id}` | application/json | — |
| `POST /admin/actors` | application/json | — |
| `POST /admin/credentials` | application/json | — |
| `POST /admin/credentials/{id}/revoke` | — | — |
| `POST /spaces` | application/json | — |
| `POST /spaces/{space_id}/artifacts` | multipart/form-data | application/json |
| `POST /spaces/{space_id}/consumers/{id}/ack` | application/json | — |
| `POST /spaces/{space_id}/consumers/{id}/poll` | application/json | — |
| `POST /spaces/{space_id}/memberships` | application/json | — |
| `POST /spaces/{space_id}/posts/{id}/revisions` | application/json | — |
| `POST /spaces/{space_id}/posts/{id}/withdraw` | application/json | — |
| `POST /spaces/{space_id}/redactions` | application/json | — |
| `POST /spaces/{space_id}/relations` | application/json | — |
| `POST /spaces/{space_id}/relations/{id}/reopen` | application/json | — |
| `POST /spaces/{space_id}/relations/{id}/resolve` | application/json | — |
| `POST /spaces/{space_id}/sessions` | application/json | — |
| `POST /spaces/{space_id}/subscriptions` | application/json | — |
| `POST /spaces/{space_id}/threads` | application/json | — |
| `POST /spaces/{space_id}/threads/{id}/posts` | application/json | — |

来源：[最终AD02输出](verification/r1-final/observed-ad02-v2.json)和 [R23原32操作采集](../2026-10-03-m0-m1-r23/final-review/observed-route-policies.json)。现正式G01全路由/body/path比较，M2 HTTP/core测试与独立P01–P06负责multipart字节/元信息/权限/配额/引用，不把schema binary编译等同传输验证。AJV对date-time忽略警告仍在，未验证日期格式值。

最终 [完整性](verification/r1-final/integrity.json)记录111产品/config/test/material、31当前docs执行期间不变，1508旧证据与冻结SQL/archive及schema/profile保持；既有tracked dist不变，R1的三个untracked artifact-route构建输出变更单列。未删/取消追踪、commit/push。Node22/干净安装/远程CI/真实宿主/模型未跑；M2.2/2.3/2.4尚未验收。
