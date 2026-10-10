# M0/M1-R4-C.3-GATE 单元 A 交付

日期：2026-10-03。完成 R23-A 指出的 Pi/client 有限欠项；未新增产品行为、SDK升级或依赖。源码文件所有权限于 `packages/adapter-pi/src/index.ts`、`tests/contracts/r4-c-contracts.test.ts`。修改前后 SHA256 见 before.sha256 / after.sha256。

## 已完成

- schema helper 输入从 protocol 的 DETUNED_TOOLS schema 类型推导，输出采用官方 SDK ToolDefinition['parameters']；在局部 unknown 断言处解释两个 TypeBox 包的类型标记差异。运行时原样返回，不补任何约束，不使用 any→any helper，不依赖提升的 typebox 类型路径。
- C03-1 逐项执行两命令 × UI/无UI × 成功/受控400失败八组合，检查完整消息、info/error、控制台渠道、对侧渠道无调用、UI与控制台互斥、每组合一次请求；forum-check 不再以坏token假装失败。
- C03-4 注册工具坏JSON抛 ClientProtocolError；409抛 DetunedError，检查code/statusCode/retryable/message/details，调用一次。
- C03-5 保留七union正例、所有工具schema equality与代表负例；publish/thread、relate/create均使用安装0.87.1 validateToolArguments返回参数后执行临时真实服务，检查实际返回对象。Pi安装版本未变。
- C02-5 使用maxRetries=1，先证明503正文已读、单独backoff timer/listener已建立、请求timer已清理、已完成请求未abort；随后取消，检查fetch=1、timer/listener=0。替换的fetch/setTimeout/clearTimeout全在finally恢复；请求派生Promise预装失败处理。
- C02-13 增加409原生正文流socket中断代表控制组，maxRetries=1仍仅一次请求，保留HTTP DetunedError、statusCode=409、retryable=false；原200正文流中断恢复正例保留。

## 验证

1. `pnpm exec vitest run tests/contracts/r4-c-contracts.test.ts -t 'C02|C03'` 最终exit0，18 passed、8 skipped（C01未进入本单元过滤）。输出为 local-tests-final.stdout.txt / stderr.txt。
2. `pnpm --filter @detuned/adapter-pi typecheck` exit0，输出为 adapter-typecheck.stdout.txt / stderr.txt。

首次默认沙箱运行因临时127.0.0.1监听EPERM失败，保留local-tests日志。获自动审查授权后首次运行17通过、1失败：新增relate断言误用了嵌套relation形态；实际契约为直接Relation对象，已依据现有RelationSchema更正，保留local-tests-allowed日志。该失败不是产品故障，也不作为修复前产品故障证据。

没有运行全量build、完整suite、29命令或真实宿主/模型认证；等待独立验证Agent统一执行。Vitest运行会更新仓库已追踪缓存，按既有政策保留。未修改历史报告、探针/observed、全局配置、protocol/server、package/lock；未commit/push/reset/clean或调用模型/子Agent。

## 与方案差异及下一步

C03旧的1/2两条局部UI测试合为一条八组合精确矩阵，因此本文件26条用例，较C.3的27少一条；覆盖行为增加而非删减。没有新增测试文件。下一步由独立验证复核本包，不继续修改产品或扩展边界。
