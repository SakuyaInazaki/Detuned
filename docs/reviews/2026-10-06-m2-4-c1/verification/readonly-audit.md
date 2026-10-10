# C.1 只读源与delta审计

2026-10-06。当前冻结source审查与实际独验互证，无未关闭产品问题；没有修改core/storage/protocol/接入者产品。

| 源核查 | 实现与独立证据 |
| --- | --- |
| 身份/空间权限→非空focus→同space Thread，metadata/material/highwater同一次同步readSnapshot | context-service getContext；FC HTTP401/403/404/400与真实WAL旧Thread后writer屏障 |
| pins过滤pin自身thread，fixed source_refs保序/重复，不从source归属反推 | context-service pinned loop；HTTP own/other/duplicate跨thread sources+newer/withdrawn/redacted |
| failure复用thread_id参数SQL idDESC/active/current，先过滤再LIMIT5 | existing searchPosts + focused filter；7focus/8其它thread且时间逆序的独立预期 |
| open challenges两端Post同space，OR任一focus，created_at,id排序前10，无重复 | listOpenChallengesForThread参数化JOIN/OR/LIMIT；12早期无关+11匹配+跨space stored corruption |
| public event按现thread/post/relation归属，seq<=snapshot上界，先过滤最新5再反转ASC | listPublicEventsForThread EXISTS/OR，不poll；原行独立JS筛选+upper-bound/space checkpoint/WAL |
| 新focus metadata省略时无key，完整read title不套newwritevalidation | protocol ContextFocusThreadSchema/context page + core mandatory result；工具完整schema与huge stored title422 |
| actualrequest_id整envelope UTF8 bytes，mandatory focus不删、规则ref降级和现尾裁顺序 | serialize/contextEnvelopeBytes；真实4095/422与whole-item预算专项 |
| 接入仍复用client/service，不新增route/tool名或业务缓存 | current38 routes/8tools；真实Pi/MCP/CLI焦点/省略正反 |

初129→冻结138，12个原source/config/tests改变（含.gitignore与授权两旧formal），9个新增source/fixture路径；全部属于core/protocol/H-R1三manifest，不存在未归属source或旧删除，见readonly-delta-audit.json。docs03/04/12/examples context四规范变更，其余currentdocs保持。SQL/archive/schema没有DDL/migration变化。

稳定验收窗口138/36/5/2677/4/2全同，dist唯一build26tracked变化而无新增，正常生成schema输出与原源hash保持。H-R1单DB负ignore例外使持久材料可收集，不全局放开数据库，不gitadd/commit/push；原七H-R1内容hash不动，v2额外收根ignore。

本Agent是H-R1实施者，自验及source复核不当H-R1独立结论；父派core的独立probe与真实新子进程restart/full-table fingerprint为独立证据。原历史source provenance区别保持，三类可持续兼容覆盖已实际恢复，原临时材料不再成为当前工作依赖。
