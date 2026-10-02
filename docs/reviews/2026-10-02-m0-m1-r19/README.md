# R19：B.4-3R4 独立复核

审查日期：2026-10-02。被审查任务：**M0/M1-R4-B.4-3R4：主键来源约束与生成失败原子性**。基线为 `71aefc1839a59f79ad9b6c48af42e36ff49f781a` 加工作区已有未提交实现，详见 [baseline.json](baseline.json)。

**结论：R18-F01/F02 的功能修复通过；正式生成测试存在一处无效输入变更和有限覆盖遗漏，交付说明需要勘误。** 本轮没有复现新的 B 包生产行为缺陷。下一轮先完成这些验收补项，达到明确门槛后在同一回合进入 R4-C；不再安排一个只修 B 包生产代码的任务。R4-B 整包当前仍不能标为已获独立验收。

## 1. 独立验证结果

| 项目 | 结果 |
|---|---|
| build / typecheck / lint | 全部 exit 0 |
| `pnpm test:all` | **12 个文件，152/152**；B 正式回归 82 项，新生成套件 5 项 |
| 26 条既定命令 | **25 条 exit 0，1 条 exit 1**；退出码与实现者记录逐项一致 |
| AA01–AA04 / AB01–AB04 | 各 **4/4**，包括允许来源变化与完整输入的正例 |
| R4 老探针 | 6/8；仅 U05/U06 失败，仍归 R4-C，不能写成全绿 |
| 交付原始日志 | 26 份均存在，含完整 stdout/stderr、时间和实际退出码 |
| 实施变化 | 3 个既有生成脚本修改，新增 1 个正式测试；其余 86 个基线文件不变 |
| 历史材料 | 相对 R18 开始基线及 R18 审查文件，本次交付未再覆盖历史材料 |

完整命令见 [verification.md](verification.md)、[commands.json](commands.json)；交付核对见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。审查探针与正式测试存在重叠，数量不相加为独立场景数。

## 2. 已关闭的功能问题

### R18-F01：主键来源语义遗漏——关闭

共享提取器现在检查 `origin=pk` 的键项，按当前固定支持策略拒绝非 BINARY collation 和 DESC，错误包含表、键项和策略信息；生成与同步检查共用该提取器。AB01 的 NOCASE、DESC 两个来源变体均明确失败。健康来源、允许的普通列/索引/FTS 来源变化以及无 `src` 编译产物继续通过。

这是 R18 明确允许的固定支持方案，不要求增加 PK profile 字段或让产品支持 NOCASE/DESC。不能将“支持表达式主键”等未验证说法写入能力清单。实现定位：[extract-schema-requirements.mjs](../../../packages/storage-sqlite/scripts/extract-schema-requirements.mjs)，主键分支约 125–136 行。

### R18-F02：缺迁移标记仍写出不一致产物——关闭

生成器在最终写文件前检查 MIGRATION_DDL 起止标记及顺序。AB02 在同时改变源 SQL 的情况下分别删除 BEGIN/END，生成明确非零，`schema.ts` 字节哈希不变。AB03 的 V1/V2 修复及 AB04 的输入缺失边界保持通过。

已验证的是输入、模板及写入前检查失败不会留下部分生成内容；没有做磁盘写入中断或断电试验，不宣称任意 I/O 故障下的崩溃原子性，也不把该能力加入下一包。实现定位：[generate-schema.mjs](../../../packages/storage-sqlite/scripts/generate-schema.mjs)，约 91–138 行。

## 3. R19-F01（P2）：正式生成测试未真正覆盖声称的来源变化

[schema-generation.test.ts](../../../packages/storage-sqlite/tests/schema-generation.test.ts) 约 98–114 行的命名索引用例替换：

```sql
CREATE INDEX IF NOT EXISTS idx_posts_thread_created ON posts(thread_id, created_at);
```

当前源中没有这条 SQL，实际存在的是：

```sql
CREATE INDEX IF NOT EXISTS idx_events_space_seq ON events(space_id, seq);
```

独立核对结果：目标出现 **0 次**，替换后的文本与原文 **完全相同**。因此该测试的 generate/check/运行时成功只证明原始布局有效，没有检验排序属性是否跟随。详见 [test-coverage-audit.json](test-coverage-audit.json)。

同一套件还没有完整落实 R18 提示词已经列明的有限矩阵：FTS 来源变体、允许列变更时 V2 跟随且 V1 不变的显式断言、故意改坏 V1 后修复、缺当前源/helper/V2 标识与相应 check/恢复输入路径。现有 AA/AB 独立探针已通过这些关键行为；这里是正式回归缺口，不能据此声称生产实现又出现相同故障。

修复要求：更正真实索引目标，加入替换命中与变化断言；以参数化方式补齐 [coverage-audit.md](coverage-audit.md) 的有限矩阵。正式测试独立调用产品生成脚本，不导入历史审查探针，不重做已经关闭的存储和幂等功能。

## 4. R19-E01（P3）：证据保存已改善，交付文字仍需勘误

26 份完整日志与 before/after 指纹均可核验，本轮不再存在“只有 500 字符 sample 代替日志”的问题。以下内容在**新交付说明中勘误**，旧报告、旧 observed 及其指纹保持原字节：

1. U05 是“非法关系枚举被接受并提交状态”；U06 是“截断的 HTTP 200 JSON 被当成成功，得到 undefined”。不是“旧版本保留/回退”。
2. R17 被覆盖文件的原哈希应为 `2d21046f8ccf75cd52d1b4aa396b2b67438f7e3ca954457c8c256cab42228815`；现存覆盖后哈希为 `67b0c7e3a4b8435c3b6eb6d474950c78392aafe1686c9910d80a18b6aab75308`。本次交付所抄原哈希不正确。没有可验证原字节备份，仍写“未恢复”，不编造恢复。
3. `check-profile-and-fts.mjs` 本身只输出 stdout；现有证据不能确定哪个调用者把它重定向覆盖了旧文件，不把责任归给脚本本身。
4. 第 18 条命令的真实路径日期是 `2026-09-29-m0-m1-r10`。运行器、清单和日志正确，仅报告表格写错。
5. 测试标题、错误文本与变量名按源码实际情况描述；明确上述生成失败保障的边界，不使用“任何异常都不写文件”的无条件表述。

上述勘误不要求重写历史材料或增加生产功能。

## 5. 下一步：验收补项达标后直接进入 R4-C

使用 [下一轮提示词](next-agent-prompt.md)：**M0/M1-R4-B-GATE+C：完成验收补项并收口请求/响应契约**。

- **单元 A**：完成 R19-F01 和 R19-E01；正式套件、AA/AB 与既有命令达到 B 阶段预期后，可在同一实现回合继续 C，无需为 A 再单独交回一次。
- **单元 B / R4-C**：关闭已知 R4-F05/U05、R4-F06/U06；补齐当前启用路由的请求验证、客户端响应/取消生命周期、锁定 Pi 类型与无 UI 行为；验收范围沿用原 [R4-C 任务书](../2026-09-28-m0-m1-r4/follow-up-contracts.md)。
- 最终 26 条命令应全部 exit 0，R4 U01–U08 应 8/8。当前允许的 U05/U06 失败不再是 C 出口的豁免。
- A+C 一起交回独立复核，附 M2.1 就绪评估；本轮不实施 M2，不宣称 Web、附件或正式独立评审已可用。

Pi/dsh 官方资料已复核，版本边界见 [harness-notes.md](harness-notes.md)。本轮只做源码审查和受控测试，未启动真实模型/宿主认证流程，未修改全局配置。当前仍是 M0/M1 基线收尾，不能等同于完整可用的研究论坛。

本次审查仅新增 R19 材料并更新三个当前状态入口；产品源码、正式测试、旧探针和历史报告保持原样。最终核对见 [review-integrity.json](review-integrity.json)。
