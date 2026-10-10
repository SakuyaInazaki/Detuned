# M4.4-A 独立源码审查

独验者 /root/m44_verify 直接检查 frozen protocol/client/MCP 源码，并核对七项作者 freeze SHA-256（见 independent-freeze-check.json），不以作者报告作为验收结论。

- Me 派生检查保留 actor/根对象/visible_spaces 的全部既有结构约束；仅取掉 Actor.created_at、Actor.disabled_at string 分支的 format，并分别调用锁定 ajv-formats full date-time 谓词。
- Session 派生检查仅取掉 Session.created_at 的 format，并独立调用同一 full 谓词；Value.Check 保留其余约束。公开 Actor/Me/Session schema 未由 guard 修改；无全局 FormatRegistry、coerce/default/remove 操作。
- client 的 browser 入口新增导出 session-binding；该文件只依赖 client 错误类型和 protocol，未引入 Node、凭据 resolver、MCP 或 Pi SDK。
- MCP session-binding 实际委托 createRuntimeSessionBinding；bridge 通过此 wrapper 执行 prepare，内置八工具 AJV 参数检查保持。parseMcpMe/parseMcpSession 实际使用 protocol guard。
- 共享 binding 仍惰性创建 identity flight 和按空间 session flight。注册 map/pending 先于 microtask 中的 I/O；最后 waiter 取消会 abort flight；已 abort flight 不接纳新 waiter；identity 失败仅 settled/finally 后 clear；startedSession 失败保留 terminal 空间状态；关闭遍历 abort 所有 flight 并等待 pending Promise 的 finally。
- 本包没有保留提取前源码字节，因此不声称逐字机械等价。兼容结论依据独立静态不变量检查与旧行为回归的实际执行。

本次首次默认全套发现四个历史 dsh 外部 spec，setup 依赖未提供专用 env，暴露默认核心测试发现边界缺口。已报告父代理；首分类只看日志尾漏列 scripts 两个 spec；完整 stderr 确认为两个 review + 两个 scripts 外部 spec。docs 排除后的第二次默认 gate 仍失败于两个 scripts spec。父批准 B 保留 defaultExclude 并只追加 docs/reviews/**、scripts/integrations/dsh-runtime/** 两个精确目录，v1/v2/v3 freeze 与两份失败日志均保留，v3 SHA 已由独验再次核对。首失败 evidence 保留，最终全套结果另见统一报告。其余本包 frozen 产品源码未发现阻止验收的可行动问题。
