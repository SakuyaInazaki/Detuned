# M5.1-A：同源human认证与sharedclient基础

2026-10-09父已接受有限范围；实际证据以[独立报告](verification/independent-report.md)为准。Node真实HTTP认证通过，尚无Web页面或真实浏览器cookie/DOM/XSS旅程，不代表完整M5/M4/profile/模型认证。

- core670/98，新23（A12+B4+D7）；独立真实HTTP7/7，current29组合29/29。最终build覆盖为根build加protocol/server必要增量，不能称最终全部源码一次全量build。
- human原身份/权限、绝对30min/1000实例/8credential、独立login120/min burst20、当前撤权/到期/禁用、Host/Origin/CSRF/混身份、严格rootquery/logout正文与no-store已验。无SQL迁移/新依赖。
- sharedclient rootauth标准响应/abort、POST/DELETE singleattempt、memory CSRF与显式browserSession；新auth JSON1MiB本地限额不扩称旧JSON全有该限制。

首失败与必要修复：[作者](author/server/README.md) · [root反例](verification/root-auth-first-counterexample.json) · [旧两fixture](author/client/fixture-repair.md) · [#28适配](verification/adapters/28-approved-diff.patch) · [#29适配](verification/adapters/29-approved-diff.patch)。原失败/原脚本保持。包级typecheck/lint0，额外两完整old-test noEmit2未伪报通过；范围详见独立报告。

[结果](results.md) · [认证示例](../../../examples/web-auth.md) · [下一任务](next-task.md)。源码/测试/gates停止，本次仅文档收口；下一M5.1-B在fresh后交付React/Vite实际旅程，M5计划不当已实现。
