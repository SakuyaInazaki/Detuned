# M2.4-B.2.1：固定帖子修订有界内容续读

2026-10-06，父代理接受本包有限本机工程范围。293/293正式测试、30唯一文件，新core10+contract7共17项含在总数；当前版本化29/29与全部39记录命令exit0，独验无执行期失败或重跑。完整T06/M2.4/M2仍未完成，M5/M6/M7未交付。

新增固定帖子revision GET，按stored title/summary/body/tags/structured五字段唯一compact JSON有界续读。固定旧revision内容不漂移；post_kind、当前lifecycle/has_newer_revision来自同页读快照且不混入拼接文档。每页重查当前身份/空间权限与目标，withdrawn明示可读，redacted持真/坏旧cursor均410；严格cursor绑定、初24h期限沿链、UTF8安全推进和实际完整HTTP正文预算已验证。

新增forum_read kind post_revision与CLI post read返回完整data/meta；旧post/getPost/CLI read合法完整单帖输出保持，仍8工具。旧forum_read thread与CLI read thread目前仅默认首批帖子元数据、不含正文或目录分页；HTTP/client已有limit/cursor目录分页，新增有界/签名目录尚待B.2.2。历史structured额外键与未知旧shape保持，不套新写validator/default，不把已有content_hash当五字段投影hash。

| 本轮独立证据 | 真实结果 |
|---|---|
| 正式与当前命令 | 293/293、30文件；新17计入总数；当前29/29与39记录命令exit0 |
| PR实际HTTP | 105,164stored文档bytes；raw4K/64K/default42/3/13页，same serializer逐字节、UTF8/双转义/非空连续推进及全文精确重组 |
| 真req.id临界 | 1695转义引号→4096实际body bytes，1696→422；无读取写副作用 |
| 当前可见性/TTL/WAL | 当前ACL优先坏cursor，redacted410、withdrawn明示、两非末页首exp不延长/等号+1s、同快照材料与metadata通过 |
| 本机工具 | 安装Pi0.87.1 validator→execute、MCPstdio ListTools/call新旧kind兼容、CLI22页重组/严格数值/旧read完整data |
| 动态目录 | 37routes/20body=19JSON+1multipart、0placeholder；18date-time ignored非值格式验证 |
| 旧回归 | 原B.1四SR、SQ/native、KV与当前命令通过；三真实旧HTTP原夹具持续not_run |

三真实旧HTTP原key夹具的原临时DB/credentials丢失，本轮未运行，旧成功日志独立保留；不能写所有历史HTTP重放本轮保持。仅恢复原DB/凭据或可核验同版构建/归档后可另立真实恢复证据，其它Git版本生成必须有独立provenance，不等同原字节replay。此材料缺口不推翻本包有限验收，也不把已存在幂等/升级功能误称未实现。

[独验](verification/verification.md)、[源码审计](verification/readonly-audit.md)、[覆盖](coverage-audit.md)、[真实计数](verification/coverage.json)、[完整性](verification/integrity.json)为接受依据。执行时126source/config/tests、35docs/material及5mutable状态文档稳定；2344旧材料含B.1、4SQL/archive、2schema全原hash保持。统一build正常改27tracked dist，208总数保持；新postservice四产物，untracked40→44，无删除。验收后的8文档同步单列，不回写旧运行证据。

[实现交付索引](implementation/README.md) · [剩余功能状态](../../progress.md#当前功能状态与未完成能力) · [下一包B.2.2有界主题帖子目录](next-task.md)。下一包尚未实施，只新增目录接续，不聚合全文。

限制：Node26.3.0/pnpm11.7.0本机；真实四宿主模型/Node22/干净安装/远程CI/100k未测。本地SDK不是真宿主实测；成功compact HTTP cap不含headers/status/error/CLI/Pi/MCP pretty外包装，每请求O(document)，不是SQL VM/CPU/常数内存预算。stored TEXT孤立surrogate已丢失字符不恢复，只精确重组stored值。聚焦context、完整M3恢复运维/M4 CLI与四宿主/M5 Web/M6封存评审/M7外验仍有缺口；M8效果实验独立研究验证。无发布、部署、commit/push或全局配置变更。
