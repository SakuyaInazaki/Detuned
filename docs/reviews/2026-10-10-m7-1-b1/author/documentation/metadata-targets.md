# B1 metadata接点（仅准备，未授权当前文档写入）

日期2026-10-10。D green门禁仍在运行；不得填成功计数或当前功能接受。以下19 existing已核存在，owner须root功能接受后明确放行。

- `README.md`
- `docs/00-implementation-brief.md`
- `docs/03-data-model.md`
- `docs/04-protocol.md`
- `docs/05-review-protocol.md`
- `docs/06-agent-integration.md`
- `docs/07-security-operations.md`
- `docs/08-roadmap.md`
- `docs/09-validation.md`
- `docs/11-development-standards.md`
- `docs/12-decisions.md`
- `docs/progress.md`
- `docs/reviews/README.md`
- `examples/README.md`
- `examples/knowledge-views.md`
- `examples/review-http.md`
- `examples/review-cli.md`
- `examples/mcp-bridge.md`
- `examples/pi-extension.md`

必要新文件：`examples/check-http.md`、本包`README.md`、本包`next-agent-prompt.md`。不先创建正文占位。维护schema6四例无B1新行为，不机械修改；compatibility/宿主官方版本与认证、Web指南、sealed历史不动。

当前ADR实际最大074；075仅候选，正式写入时再核空编号。

重点修正：docs04:12仍称M6.1-A/B且“仍无公开review入口”；474仍称“工具未启用”。它们须标明历史范围，避免与当前评审HTTP/CLI/九工具合同混淆。当前M7A顶部只能在接受B1后改为HTTP/client已有限接受、CLI/tools待B2。其他C2A/C2B段保历史wire/计数，当时范围明确标记，不全局替换。

短草稿要点（待证据后落正文）：B1薄接12 typed方法与相应HTTP，required latest目录≤冻结32且缺run=null；schema仍6、未新增DDL。公开白名单DTO与整对象targeted guards不泄内部created_request_version；snapshot单canonical JCS实现+WebCrypto实际SHA。普通create/invalidate复用持久key；verify receipt/log仅explicit/per-call key，无getMe/session，logicalOperationId在file/HTTP前拒；issuer一次明文、retry0、无key，权限按核心空间owner/maintainer及受限既有admin虚拟owner事实。scoped流URL精确编码同origin，bounded/hash/EOF/cancel/no-clobber、no-store早退保护；run因果版本不要求墙钟单调，真实Unicode码点校验。CLI/普通九工具尚待B2，不宣称完整M7/宿主认证/模型验证。

验收正文只引用D最终真实report/gate/raw及失败修复，不预填通过、不把受控transport等同真实TCP、不相加新测试数。下一链接采用已批准B2task/owner planning，仍需B1seal/B2fresh/rootdispatch。
