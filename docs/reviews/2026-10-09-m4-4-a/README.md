# M4.4-A 共享运行时身份会话与严格响应校验

2026-10-09 父已接受有限本机范围。最终 **627/627 项、90/90 文件、新12项/2文件**（protocol guard3+独立native9），current29组合29/29，明确四gate加24原probe及批准A.1第11适配。功能执行者为 `/root/m44_verify`，C负责fresh和metadata，不重复门禁。

build/typecheck/lint各一次，完整默认测试实际三次，最终exit0、43.732s；首native sandbox EPERM后原fixture获本机loopback权限9/9。首全套核心627/90通过但误收集2review+2dsh-runtime外部spec导致exit1；v2仅排review后第二全套仍2runtime setup失败，核心627/90保持；v3保公开默认exclude并精确加两个外部scope后第三全套通过。初报漏列scripts分类已纠正，全部原失败保留，不能称首全绿。fullsuite自带40MiB实际随三次执行，不额外新大材料。

client browser公开共享RuntimeSessionBinding，仅client/protocol依赖；MCP真实thinwrapper立即消费，不改变global/per-space flight、waiter取消、started session终态与真实finally等待。protocol针对原MeResponse/Session schema严格guards，三个date-time位置复用已锁full validator，其他全部原schema约束保持，不装全局FormatRegistry或修补输入。

真实built MCP/HTTP/SQLite/响应代理9case：合法路径、四Me与四Session反例。Me拒后同runtime可显式恢复；已提交Session坏响应终态阻止再HTTP/业务，新runtime可恢复；marker无泄漏，业务和session实际计数证明，旧MCP五文件27项仍在最终suite。只验共享基础和MCP路径，Pi官方SDK/生命周期下一包，不认证全部响应或四宿主。

[功能报告](verification/verification.md) · [独立原结果](verification/independent-results.json) · [父接受汇总](verification/final-results.json) · [独立静审](verification/independent-static-review.md) · [A交付](author/client/report.md) · [B交付](author/protocol/README.md) · [下一M4.4-B](next-task.md)。最终保护与链接见verification/finalization.json/md。

核心SQL/schema/lock/archive/HEAD与5630旧review保护，源码/config/tests授权九文件。dsh历史外部成功仍原包，不计入core且不重跑；官方source/deps仍有意持有，C不触碰。未用真实模型/凭据或全局修改，不表示完整M4–M7完成。
