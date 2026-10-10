# C.2 seed单元对verify-session与新formal只读复核

2026-10-06，父授权full生成期间窄静态阅读，不改verify所有权、不运行其测试。未发现指定信息边界/闭环的具体偏差。本审查不是规模性能结果。

scripts/scale/verify-session.mjs:1–4只import node:assert，运行以HTTP fetch为唯一论坛来源；:19–20 child入口严格只接baseURL/query/space_id/token四字段，无manifest/oracle/数据库路径，:12规则ref、:13search线程、:16目录metadata当前revision及summary.source_refs都从前一个HTTP响应发现。:8–9测真实compact budget、UTF8 offset/完整meta、固定ref拼接并记录输入材料，未用seed答案替代搜索结果。输出session_inputs仅space/query，Authorization/token不进入记录。此处源码确认，不等于强OS沙箱/模型会话认证。

scripts/scale/verify.mjs:5–7启动新Node子进程，仅PATH环境和stdin连接字段；:20–24 child退出后才打开oracle，并对failure结构字段逐项深比、summary与source固定refs可得、代表文档hash/bytes比较，公开记录对checkpoint作hash。verify-gate.mjs把live config中的普通client0 token与discovery传child，前后全表fingerprints核纯读；不将manifest refs/答案放进child。

tests/integration/m2-context-session-chain.test.ts:20–24显式ordinary actor/contributor/read+write凭据无admin给新child；:26纯读取DB.serialize不变，:27–31退出后父oracle核失败条件与固定规则/source材料；:32–39独立context checkpoint→新consumer→HTTP来源revision屏障→poll重投→实际batch ack→无pending与context更新状态→旧fixed正文深比。来源作者是controller fixture的admin，普通reader不借admin发起操作，不能把该小formal称20客户端负载验证。

当前只读代码展示child保固定读取文档，parent做后验oracle；实际规模预算/零丢失账本、窗外来源更新与ACL探针尚依verify自身执行。代表文档hash是已发现样本核验，不声称全100k正文网络遍历。没有泛化目录全集/性能/四宿主认证声明；未改源码或运行产品。完成停写此审查。


## 自动wrapper追加窄审与清理候选关闭（2026-10-06）

原静态发现：只SIGTERM并无期限等runner退出，owned进程卡住/忽略TERM时可能挂住。父批准仅新wrapper有界修复；原发现保留，不称正常smoke已覆盖强制清理。

只读最终run-verified.mjs：固定run/verify-gate仓库入口，没有论坛/config命令执行；私有clone隔离verifier自己的ok，只有固定子进程exit0后原子发布成功哨兵。公开阶段仅metadata/hash/audit，不公开token/raw私有报告。stopOwned限本wrapper记录且safeint>1 PGID，5秒TERM后KILL、2秒观察；finally等待经8秒within，timer清理；EPERM等未知探测保守记alive，不抛exit callback、不伪称消失。

已核[freeze-v4](../load/freeze-manifest-v4.json)全部实际hash及四原测量mjs与v2一致。[清理报告](../load/cleanup-report.md)/[故障复验](../load/fault-experiment-v2.json)：真实SIGSTOP已核自有runner组→TERMwrapper，5036.250ms wrapper预期exit1且完整flush，外部ps证明所有自有PID已消失、监听ECONNREFUSED、无成功gate release/ok、测量窗口未起。首EPERM/metadata遗漏失败原记录仍保留。此实证关闭唯一清理候选；没有重跑正常负载/600秒，未由我执行故障或测试，范围限此受控进程与读到的代码/证据。
