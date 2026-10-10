# C.1 + H-R1 最终只读签收

2026-10-06。按父授权，在文档作者停写后以 [stable-after.json](stable-after.json) 为验收终点基准，只读枚举/hash、核既有执行记录与本地文件链接。本次只新增本报告与 [finalization.json](finalization.json)，没有运行产品 tests/build；原 stable-before/after、首失败、freeze、旧来源记录均未覆盖。

| 保护范围 | 最终事实 |
|---|---|
| source/config/tests | 138 个，全保持，无新增、删除或未归属源码；含生成器、持久 fixture 与 .gitignore |
| current docs | 36 个，其中其余 34 个保持；docs11/docs12 为获准验收后 delta |
| mutable 状态文档 | 5 个均为获准验收后更新，逐文件前后 hash 单列于 JSON |
| 既有不可变 reviews/probes/logs | 2677 个全保持，无新增/删除 |
| SQL/archive 与 schema | 4 / 2 个全保持 |
| dist | 208 tracked + 48 untracked，全保持验收终点 hash |
| HEAD | b8dacd56779a007a2e7045b682bca0c036fdfc44，未变 |
| H-R1 持久材料 | legacy.db / expected / provenance / recipe 四 hash 全保持 |

验收数字与 [commands.json](commands.json)、[coverage.json](coverage.json)、正式原 stdout 和独立历史 command 对齐：唯一 333/333、35 文件；current29 29/29；49 条独验命令中 47 零退出、2 次自有 probe 首失败已归因并保留，修正版通过；一次产品 build；AD 38 operations/routes、20 body（19 JSON + 1 multipart）、44 条 date-time ignored，不称日期格式认证。H-R1 正式 7 项属实施自验及全套回归，core 自有独立 probe 首跑 exit 0 单列，不混为同作者独立验收。

11 份当前交付文档共 **212/212** 个本地 Markdown 文件链接存在：根 README 34、progress 98、reviews 根 README 36、examples README 11、本包 README 19、coverage-audit 4、implementation README 8、next-task 2；AGENTS/docs11/docs12 无此类链接。此为文件目标存在性，不验证远程 URL 或 anchors。协议作者先前 10 文档 210/210 与本次增加任务书 2 链接的范围不同。

当前状态明确 focus 已可用、H-R1 三类可持续历史覆盖已闭合；新的真实 b8 来源不冒称原失落 DB 恢复。C.2 任务书已批准但尚未开工，任务书 hash 仅观察快照，不是规模验收结论。docs11 已明确持久脱密归档、版本/请求/结果 hash 与配方、依赖版本、运行时凭据、新进程重放、普通回归无旧 tmp/Git/网络依赖及精确 ignore 例外；docs12 ADR032 与此一致。

5 mutable 与 docs11/docs12 的收尾发生在已完成稳定窗口之后，不属于独验期间漂移；本包 README/coverage-audit/implementation README 与新任务书为获准包内交付文档。没有发现产品/历史保护异常或当前结论数字歧义。已有 Node22、干净安装、远程 CI、四真实宿主模型及规模/长压测未测限制继续成立。完成停写。
