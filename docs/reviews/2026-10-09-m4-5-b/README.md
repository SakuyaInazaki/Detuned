# M4.5-B：显式 wrapped MCP 输入宿主适配

状态：2026-10-09父已接受本包有限范围，文档末核由D完成；以[独立报告](verification/independent-report.md)为准。默认flat保持，wrapped八完整canonical严格校验后解包，无client/core/SQL/依赖变更。

- core647/94，新9（作者4+独验5）；build/type/lint/current25均0，current29=四gate+23原+既有#11/#27适配。
- full启动后D仅补新test fresh nullable guard，随后D5/5与noEmit0；产品未变，不称所有结果来自同一test快照。作者首noEmit数组存在性失败与D首listen EPERM/nullable失败均保留。
- Claude2.1.282原生受保护exact8，context/read(space rev1)/note publish三成功，outer/inner非法零额外HTTP。SQLite身份/空间/thread/revision/key及count+1对照，EOF自然0/owned退净；不计入647core、不代表完整CLI/profile/模型认证。

[作者实现](author/implementation/README.md) · [Claude材料](author/claude/README.md) · [结果](final-results.md) · [下一任务](next-task.md)。宿主指南/compat/examples由B冻结，旧前包反例未改。下一M5.1-A先认证/sharedclient，M5.1-B随后实际UI；目前均未实施。
