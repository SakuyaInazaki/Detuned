# R22：覆盖与交付核对

本记录依据 R22 实际命令输出和源代码断言，而不是实现者交付中的文件表。对应源码基线见 [baseline.json](baseline.json)。

## 正式测试：13 个真实文件，175 项

以下数字来自 [observed-tests.txt](observed-tests.txt)，无跳过和失败。独立探针与正式测试可能重叠，不把它们相加成“独立场景数量”。

| 文件 | 数量 |
|---|---:|
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/integration/m1-discussion.test.ts` | 5 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `tests/probes/m0-probes.test.ts` | 3 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `packages/protocol/tests/schema.test.ts` | 5 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| `tests/contracts/r4-c-contracts.test.ts` | 22 |
| **合计** | **175** |

C.2 交付表中的 `tests/contracts/m0-m1-r3-contracts.test.ts`、`m0-m1-r4-contracts.test.ts`、`m0-m1-validation.test.ts` 和 `packages/core/tests/` 不存在；m0-m1-r2-adapters 实际 3 项而非 12 项、r3-regression 实际 11 项而非 9 项、storage 实际 7 项而非 6 项。不能以总数碰巧相符证明各项已经覆盖。

## 对 C.2 出口的逐项核对

| 原要求 | 实际情况 | 结论 |
|---|---|---|
| AD01/02 请求入口及 body 占位修复 | 正式 C01-6/7；独立 AD 通过；AE03 比对全部 32 路由及 19 body 定义一致 | 指定修复通过；非 body 政策仍见 F03 |
| 全部当前操作 body/query/params/header 规则清单与共享约束 | 交付只有 19 个 body 绑定列表，没有完整四维政策表；查询范围/枚举仍由路由手写 | 尚未完成原要求 |
| AD03 错误来源 | 正式 C02-9 及 AD03 通过，409 details 有断言 | 请求阶段通过；正文阶段 F02 遗漏 |
| AD04/05 清理顺序、等待预算 | 正式 C02-10/11 与独立 AD04/05 通过 | R21-F03 功能关闭 |
| 正式五阶段取消、资源计数 | C02-5 新增监听器断言有价值，但所谓退避取消从请求计时器注册时触发，client 重试预算还是 0 | 补真正退避阶段；AE01 新增正文兑现后的控制信号回归 |
| HTTP-date、非法 Retry-After、日期超预算 | C 文件只有秒数/极大秒数；AE05 三例通过 | 功能正例通过，需正式固化 |
| Pi 局部类型边界保持 schema 语义 | 新增 any→any 函数改变联合 schema，AE04 七个合法写入分支全部被 SDK 拒绝 | F01 功能回归，不能归为类型风格问题 |
| 两命令 × UI/无 UI × 成功/失败 | 正式测试没覆盖 forum-check 失败；AE04 独立八组合全通过 | 实现通过，正式覆盖需补 |
| 注册工具坏 JSON 与 409 透传 | C03-4 只有不存在空间的泛化抛错；AE04 两反例通过并核对 class/code/status/details | 实现通过，正式覆盖需补 |
| 准确运行环境与证据 | 实际 Node v26.3.0；compatibility 仍写 v22.19.0+；报告 HEAD 沿用旧值；未交付 runner | 下一包据实补齐，不改旧记录 |

## AE 检查如何解释

AE01、AE02 为客户端 F02；AE03 为契约 F03；AE04 为 Pi F01，同时包含通过的命令和错误透传控制组；AE05 是通过的等待预算控制组。**1/5 是五个组合检查的结果，不表示只剩一个功能能工作。**

AE01 使用受控异步正文 continuation 与受控 timer，验证本次调用取消/超时的判定顺序；没有真实宿主竞态证据。AE02 使用原生 Response/ReadableStream 的读取失败，fetch 受控且不联网。AE03 使用内存 SQLite、实际 Fastify inject、生成 OpenAPI 与 Ajv。AE04 使用真正 activate 注册的回调及已安装 Pi 校验器，没有模型调用。AE05 压缩实际等待，仅验证计算出的 delay 和预算；时间顺序由 AD04 独立验证。

## 修复前失败与证据完整性

C.2 `pre-fix-failures.txt` 确有 **8 failed、14 passed**，同时有 **1 个 unhandled rejection**。这是当时失败记录，不等同于本轮最终全绿结果存在未处理异常；本轮 175 项输出和 stderr 未发现该错误。下一包失败阶段也应妥善接住异步 rejection，以断言失败为证据。

本轮 [run-existing.py](run-existing.py) 保存每条命令的 stdout、stderr、时间和退出码；命令错误/超时也有记录。本轮历史证据只读。R17 历史输出在早前轮次曾被覆盖的情况，继续引用 [R21 coverage 说明](../2026-10-02-m0-m1-r21/coverage-audit.md)，本轮未伪造恢复或重写它。

最终完整性比较见 [integrity.json](integrity.json)：基线覆盖 93 个产品/测试/构建配置、212 个 dist 文件、25 个旧探针、1198 个历史审查文件（含索引）和 22 个当前说明文件。索引及当前状态文档的有意更新单列；C.2 交付材料仍保留原字节。
