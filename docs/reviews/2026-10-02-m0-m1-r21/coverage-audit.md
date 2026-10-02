# R21 覆盖与交付证据核对

结论以 [README](README.md) 为准。本文件区分实际行为通过、正式套件覆盖和报告准确性，不把测试名称当作已覆盖证据。

## C.1 要求与当前覆盖

| 要求 | 当前证据 | 结论 / 下一步 |
|---|---|---|
| AC01 九种输入/调用 | C01-5 正式测试与 AC01 均通过 | 指定反例关闭；扩展到全部当前写入口的政策仍缺，见 AD01 |
| 成功信封与 ClientProtocolError | C02-1～3、AC02 | 修复通过；对象 request_id 等由独立探针验证，正式覆盖可在同一矩阵补齐 |
| 409 message 保真 | C02-7、AC03 | 通过；应补 details/retryable 的完整断言 |
| 未取消的 AbortError / 传输来源 | AD03 | 仍失败，归 R21-F02 |
| 原有 cause/503/400 重试 | C02-8、AC04 | 通过；不能代表完整等待预算与生命周期 |
| 请求阶段取消、最终清理 | AC05：请求前/headers/body/backoff/timeout 均通过 | 正式 C02-4 只有请求前与超时；C02-5 未断言 listener/timer；需纳入稳定阶段矩阵 |
| 请求结束后清理，再退避 | AD04 | 进入退避还有 30s timer 和 2 个 listener；最终清理通过，阶段清理失败 |
| Retry-After 超预算 | AD05 真实 Node timer | 超限值被变成 1ms，实际提前重试；需停止或安全等待 |
| Pi 测试环境隔离 | C03-1、C03-2 | 本轮已改用自身随机端口/token，finally 恢复环境；该项进展确认 |
| 两条 Pi 命令 × UI/无 UI × 成功/失败 | C03-1/2、独立 AC06 | AC06 正例通过；正式 UI 只调用 forum-check，失败矩阵和输出内容/级别未齐 |
| 已注册 Pi 工具错误传播 | 旧 R2/S12 及 AC06 | 已有基础错误/坏 JSON 验证；本轮五类错误变化需经实际注册回调保真，不只直接调 client |
| protocol→Pi schema 类型边界 | adapter-pi/src/index.ts:38 | 仍直接 `as any`；锁定 SDK 的 TypeBox 差异是真实边界，需局部说明/转换及约束保真检查 |
| OpenAPI 与路由约束 | AD02、C.1 inventory | 路由名称 32/32；19/19 body 都为宽泛 object；尚不能称完整契约同步 |

没有重新检查 B 的新 SQL 变体，没有新增模型、Web、附件或正式评审任务。

## 正式测试数量核对

本轮原始输出为 13 个文件、169 项；B 82，生成 6，C 16。完整文件/数量表由 [delivery-evidence-audit.json](delivery-evidence-audit.json) 的 `actual_formal_files` 从独立 stdout 提取，并在 [verification.md](verification.md) 展示。

C.1 coverage-audit 的“13 个文件”表与实际不符。例如：

- `tests/contracts/m0-m1-r3-contracts.test.ts`、`m0-m1-r4-contracts.test.ts`、`m0-m1-validation.test.ts` 不在正式文件清单，也未在仓库找到。
- R2 adapters 实际 3 项，交付表写 12 项；R3 integration 实际 11 项，交付表写 9 项；storage 实际 7 项，交付表写 6 项。
- U01–U08 是独立审查脚本编号，不能把它们写成一个并不存在的正式测试文件。
- `packages/core/tests/ (3 文件、9 项)` 不属于本次实际执行清单。

169/169 总数可以独立确认，以上是覆盖映射失真，不能据此虚构执行或否认已经通过的测试。下一轮从实际文件与断言生成表，不照搬这张表。

## 文档与基线

[机器核对](delivery-evidence-audit.json) 确认 C.1 before 93 文件与 R20 产品基线无差异，after 与本次收到源码无差异；受控修改确为 11 文件，无新增产品源码。原 R20 已收录的历史材料无哈希变化。

docs/04 和 docs/07 确有更新；并非“完全没有同步”。仍缺单次 timeout 和退避边界、等待预算、传输错误来源、默认 4 次尝试的清晰说明。docs/04 开头仍将整份接口称为待实现。三个状态入口与 R20 结束时哈希完全一致，没有 C.1 已实现待复核信息；本轮将入口统一更新到 R21。

compatibility 的 `runtime: v22.19.0+` 仍混用了最低要求和实测版本。本轮实际 Node v26.3.0 / pnpm 11.7.0；Pi SDK 0.87.1 声明 Node >=22.19.0。CI 配置为 Node 22，不等于已经运行该环境。其余接入状态仍为 not_tested，保留这一真实限制。

## 日志采集

C.1 manifest 有 27 条 exit 0 记录，对应主输出均存在。本轮独立复跑也全部 exit 0，因此通过结果可信。

但 manifest 只有 AC 一条带 stderr_file，其他没有两条流的明确记录，也没有交付可检查的 runner。其 observed-tests 只有 Vitest 主输出；本轮相同命令的独立 stderr 存在 `$ vitest run`，另行保存为 observed-tests.stderr.txt。仅有 27 份主输出不足以确认所有成功分支 stderr 都已归档；不推定具体丢失过程或调用者。下一轮保留可复查采集器和两条流即可，不为此重做已确认的产品功能。

本次 [run-existing.py](run-existing.py) 每条命令分别保存 stdout/stderr 和时间、退出码；不调用实现方 runner，不写旧目录。AD 原始 stderr 包含真实计时器溢出警告。

## 历史文件说明

继续保留 R19/R20 已记录的 R17 日志覆盖事实：旧字节未恢复，覆盖调用者仍未确定；本次没有再覆盖该文件。

- 原 R17 日志哈希：`2d21046f8ccf75cd52d1b4aa396b2b67438f7e3ca954457c8c256cab42228815`。
- 现存覆盖后哈希：`67b0c7e3a4b8435c3b6eb6d474950c78392aafe1686c9910d80a18b6aab75308`。
- 冻结 SQL：`0049ed7514e81b00b13f7ed60e49d948c063ae2355691ca792c399857afd3706`。
- archive 原文：`82e3f01295b1847d6bac1dbd403fa079e50e76ca03b0446f05cb39adab332b50`。

不制造恢复，不要求为不可得的旧字节阻塞开发。当前所有原有文件以本轮 baseline 为保护依据。
