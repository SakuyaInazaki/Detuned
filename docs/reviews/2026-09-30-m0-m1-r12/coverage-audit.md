# R12 覆盖与交付核对

对象：[B.4-2R2 实现报告](../2026-09-30-m0-m1-r11/implementation-r4-b4-2r2/README.md)、实际源码/测试、R11 任务书。本页不重新展开 B.4-3 全矩阵。

| 原要求 | 本轮实际完成 | 剩余或限制 |
|---|---|---|
| 共同 legacy 解析 | storage 调用 core normalizer，删除重复旧解码；最终投影继续复用 | normalizer 的 marker 早退和 ID-only 处理仍遗漏输入规则，V02 |
| typed 降级前检查 | 核验必需字段、目标、实体存在性；Q01 四例通过 | Post 修订存在性、ID-only 关系存在/来源不查，V01；应与普通 Post/initial_post 的已知实体规则共用 |
| 显式坏值拒绝 | 原 Q02 非法字符串 revision、非法 nested state 拒绝 | legacy relation_ids 字符串被丢弃，错误目标/重复数组进入 marker；V02 |
| 新结果出口 | Q04 字符串数组、损坏 initial_post 拒绝；正式测试增加真实 action 回滚 | null 被排除在校验之外，V03 三类写入提交；显式坏值与缺省仍混淆 |
| 时间来源 | Q03 缺 updated_at 的旧 patch 原子拒绝；导入 helper 共用 | v1 已提供 updated_at 的冲突被 created_at 优先选择掩盖，V04 |
| 11 操作族 | OperationFamily 有限联合、编码 switch/never 已落实 | 业务结果/ref 与 operation 的类型关联未完成；不能称“完全强类型” |
| L02-3c | fullLogicalSnapshot 覆盖 schema/所有表行，真实关闭重开；reason/body 不再同时错配 op | 合法 marker 的实际空间/多次启动正例来自 N02–N04，可准确引用；本项不再列为未修复 |
| 正式 Q 回归 | 净增 5 项，117 项/11 文件，B 53 项属实；Q04 三类写入及重开快照有效 | 新 Q05 正式测试主要验证关系复用 v2 与重放；更完整正例继续由独立 Q05/P06 等提供，不能声称单个 Q05 测试涵盖全部路径 |

## 交付记录的可靠部分

31 次命令都有 stdout/stderr，失败运行未被删除；第 16 次 G 检查失败后第 17 次构建、第 18 次复跑成功有记录。R1–R3 这次均实际执行。before 83 个产品/测试指纹与 R11 输入一致；after 与本次输入一致。

报告的错误包括 19 个不存在的日志路径、4 项旧检查数量、11 操作族列表、precheck 签名、NestedRelationRef 字段、lint 命令及 U06 的请求/响应含义。详见 [机器核对](delivery-evidence-audit.json)。这不推翻有效的原始结果，但会误导下一位实现者。

真实末次主要输出为：

- 构建：`logs/26-final-build.stdout.txt`
- 类型检查：`logs/27-final-typecheck.stdout.txt`
- lint：`logs/28-final-lint.stdout.txt`
- 完整测试：`logs/29-final-test-all.stdout.txt`
- Q：`logs/25-probe-r11-pipeline.stdout.txt`
- P：`logs/24-probe-r10-boundaries.stdout.txt`
- N：`logs/23-probe-r9-acceptance.stdout.txt`

以上路径均相对实现归档目录，其余按 commands.json 查找。新报告应从命令清单和 JSON 结果生成表格，再检查本地链接存在性。历史文档保持原样，通过新勘误说明。

## 保留的范围

B.4-2R3 仅处理本轮两类功能遗漏及交付勘误。B.4-3 仍按 [既定拆分](../2026-09-29-m0-m1-r8/remaining-work.md)，不能把其要求缩成 L03 一个探针。R4-C、M2、真实 dsh/Pi/Codex/Claude Code 接入、Web 和正式评审均不进入本包。
