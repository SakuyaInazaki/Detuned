# M3.2 A交付（待父统一独验）

实现：10个业务write wrapper共用持久key接线；可注入RequestKeyStore；独立Node入口与真实私有文件store。当前actor从GET /me获取，token准备变化拒绝；取消等待不继续业务POST。服务端幂等/权限规则保持唯一裁决。

检查：`pnpm --filter @detuned/client typecheck` exit0；`pnpm exec vitest run tests/integration/m3-request-key-store.test.ts` 最终8/8、1文件、exit0（tests-v3.log）。首次7场景tests.log通过；取消新增后tests-v2.log8通过，后续strict scope/record限额修改再跑tests-v3。它们为相同文件修订验证，不累加数量。before.log只读旧built API盘点exit0，没有持久接口；没有把不存在import或能力声明当产品失败反例。

未运行：build、fullsuite、真实多进程/HTTP响应丢失/credential轮换/CLI端到端由C统一独验；本单元8测试的fetch为受控传输，不冒称真实HTTP服务。并发store测试为独立store对象并发，非OS进程证明。

限制：本机受信目录；同uid恶意改目录不保证隔离。不存在自动清理，final需要人工保留管理；底层I/O取消后可能继续完成。无正文保存但metadata含关联。未commit/push/install/global配置/模型调用。
