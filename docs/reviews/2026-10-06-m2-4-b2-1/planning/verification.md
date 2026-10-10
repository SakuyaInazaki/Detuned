# M2.4-B.2.1 独立验证阶段1

2026-10-06。已按AGENTS/README/docs00/08/11/03/04/09及父[B.1 next-task](../../2026-10-03-m2-4-b1/next-task.md)核范围。仅新包verification baseline脚本/JSON与本planning文件，产品尚未实施；不执行产品测试/build，不改旧材料。以下是待父批准/冻结后执行计划，不是通过结果。

新before基线真实枚举：HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44，123源码/config/tests、34currentdocs/material、5mutable状态文档单列；保护2344全部既有reviews/probes/logs含完整B.1，排除可变根reviewsREADME；4SQL/archive、2schema/profile、208tracked/40untracked dist。git dirty完整保存，继承实现不reset。mutable为AGENTS/README/progress/reviews根README/examplesREADME，避免将获准状态收尾误算源码或历史证据篡改。B.1原三真历史临时DB/credentials丢失持续not_run，不再试ENOENT、不重造旧rawhash/成功。

| 编号 | 冻结后独立有限验证 |
|---|---|
| PR01 | 新GET固定post/revision从真实context/post引用定位，只拼接JSON.stringify({title,summary,body,tags,structured})按固定键序；stored历史structured未知字段/旧坏shape保真，不套新写validator/默认、不把content_hash冒充投影hash。 |
| PR02 | 更新head后旧revision全页不漂移；post_kind不可变，当前lifecycle/has_newer_revision每页与同快照匹配；empty body/tags/structured、withdrawn读取明确，document非空。 |
| PR03 | 实际raw compact HTTP 4096/65536/default12288，中文emoji/quotes/backslash/control/双转义与stored孤立surrogate；连续UTF8 byte半开offset、每页进展、末页complete/meta严格相关；拼接精确stored文档。 |
| PR04 | 真实req.id引用号临界，正常cap成功/最小metadata或不能推进422；不只调用helper估量，不把SDK/CLI包装声称HTTPcap。比较共享serializer与raw HTTP逐字节。 |
| PR05 | strict signed v1 post_revision_read actor/space/post/revision/byte_offset/exp；tamper/extra/version/purpose/wrong绑定/零负末尾越界非UTF8位置/过长cursor400非重试。首次24h、至少两非末页推进注入Clock后exp不延长，再改budget；exp等号过/+1秒400，远未来期限拒绝。 |
| PR06 | 每页当前credential/actor/member/read能力/目标归属/生命周期授权先于badcursor；跨空间/不可见不泄漏，途中redaction旧cursor410，撤凭据401/撤成员404，withdrawn合法可读。 |
| PR07 | 成功/错误/422全库指纹无entity/event/idem/ack写；双真实WAL连接受控callback屏障，reader固定材料+当前metadata同snapshot，writer受控修改head/lifecycle，不sleep猜竞态；下一读取观察新状态。 |
| PR08 | installed Pi0.87.1实际validator→execute，MCP stdio ListTools rootobject+anyOf与call；新post_revision需id/revision、合法旧post分支仍完整data，错误参数400；不是宿主模型认证。 |
| PR09 | 实际CLI新post read显式revision/max/cursor完整page与严格数值/错误退出；原read post合法真实正例保持、search/space/context输出不扩。client唯一HTTP复用，route动态目录+OpenAPI全量/纯DTO相关union。 |
| PR10 | 冻结后统一一次build计current29、新正式有限专项→独立PR→原SR/SQ/KV及原current29其余→一次全正式/typecheck/lint，准确计唯一新formal数/旧276，不累计重复项。旧schema/archive全部保护；新source/新docs稳定前后hash。 |

执行前父确认最终export/route/DTO与文件所有权；before至少两实质行为缺口由开发单元执行并保留，独验不以缺import造反例。只读当前代码确认旧PostService已有固定revision、redacted410/withdrawn事实；不代改旧业务或扩大B.2.2目录方案。新probe使用独立存储/屏障/断言，不冒用开发者assertion作为独验。

原SR包括B.1已有HTTP/2026-10-06 boundaries/WAL/toolsCLI（需本机loopback）；原SQ/native与KV同原脚本。current29原M2.1 media-awareADv2动态目录原样运行，不因新增route预先改脚本；实际不兼容先保留失败再向父归因。旧真实历史三组持续明确not_run，恢复原材料才可另立真实重试，不能用synthetic储存夹具顶替。

所有首失败与新执行UTC/exit/stdout/stderr保留；产品失败报父，不自行修产品/tests。fixture错误可修自有新版本，但保留首输出/适用条件/归因。Node22/干净安装/远程CI/真实四宿主模型/100k/CPU常数内存保证都不声明。阶段1到此停止，等待父批准实施后最终freeze与执行授权。
