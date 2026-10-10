# M2.2-A 覆盖核对

计数直接提取 [最终integrity](verification/integrity.json) 的 test_counts，与 [正式stdout](verification/observed-tests.txt) / [独立报告](verification/verification.md)一致；不是累计不同探针得到的场景数量。

| 正式文件 | 通过项 |
|---|---:|
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `tests/integration/m2-artifacts-http.test.ts` | 8 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/integration/m1-discussion.test.ts` | 5 |
| `tests/integration/m2-artifacts-filesystem.test.ts` | 6 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/contracts/r4-c-route-contracts.test.ts` | 4 |
| `tests/integration/m2-artifacts-cli.test.ts` | 4 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/probes/m0-probes.test.ts` | 3 |
| `tests/integration/m2-typed-writes.test.ts` | 12 |
| `tests/contracts/m2-typed-write-contracts.test.ts` | 5 |
| `tests/integration/m2-artifacts-core.test.ts` | 9 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `packages/protocol/tests/schema.test.ts` | 5 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `tests/contracts/r4-c-contracts.test.ts` | 26 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| **合计20文件** | **227** |

原B82、M2.1 core9/FS6/HTTP8/CLI4与C26/G4保持；本包增加core12与protocol5。当前版本化 [29命令清单](verification/current-commands.json) 全部通过，AC6/ADv2 5/AE5/U8分别保持。ADv2沿用M2.1版本化media-aware探针；历史原29仅28/29及原JSON-only错误保留，不将替代清单混称原命令全绿。

## 契约与独立探针对应

操作目录仍35，19JSON+1multipart；无新增route/tool。完整表复用已验收 [M2.1采集表](../2026-10-03-m2-1/coverage-audit.md)，本包只增加独立严格components及适用说明。

| 本包边界 | 正式覆盖 | 独立证据 |
|---|---|---|
| NewWriteProposal/Claim/Failure/SummaryStructured四components，字段/元素/长度/枚举/unknown/ref形状 | protocol B01–B03，core三入口矩阵 | [四类×三入口12组合](verification/observed-check-typed-http-first.json)，valid201/invalid400且atomic |
| provided≥1证据、unverified非空reason、state必填无default | protocol B01/B03、core条件正反例 | 同探针conditions_three_entries及固定旧revision、withdrawn旧版、跨space404/redacted410 |
| 三写操作兼容wire、严格新action map、initial自身kind/revision storedkind | protocol B04/B05、core新action与不可变kind | [只读最终核查](verification/verification.md)及HTTP新写矩阵 |
| 原key/raw/hash保真，原宽structured新key拒绝 | core历史夹具，protocol兼容静态分支 | [三真实旧HTTP成功fixture](verification/observed-check-historical-http-final.json)：原key201/create新key400/revision stale409、仅改expected后400/变payload409 |
| 重启后原key、当前脱敏/撤credential、拒绝无半状态 | core权限/回滚与历史矩阵 | 同历史探针restart3、墓碑201、撤credential401；新写完整业务/event/key快照 |

三次历史HTTP夹具准备错误保存于 [probe-corrections](verification/probe-corrections.md)与原输出，不算产品故障，不删失败记录。原请求hash/历史数据没有新迁改；独立核验114产品与32docs执行稳定、1716旧证据/4SQLarchive/2schema-profile保持，dist正常构建单列。

未测Node22/clean install/remoteCI/真实四宿主/模型；ignored date-time仅结构编译警告，不能当值格式验证。M2.2-B知识视图/context历史分类、M2.3/2.4不在本覆盖，也不提前宣称整个M2可用。
