# M3.3-B 空间 NDJSON 导出：只读事实

2026-10-06。仅盘点，不授权实现，不选择最终路线；M3.3-A仍待验收。依据docs04接口表与docs07§8，逻辑导出和物理备份不同。

契约已写GET `S/export`（format=ndjson、附件选项）：出站按调用者当前权限过滤，包含版本标头、稳定ID、修订、关系、公开评审/决定、附件清单、脱敏墓碑；排除凭据/session密钥/cookie、其他空间及封存初评。附件单独按manifest下载。逻辑导入另有仅管理员/新空实例、身份默认禁用与imported状态规则，不应随首导出一并扩做。

当前 packages/server/src/routes 未发现/export或/import路由，core无exportSpace/importSpace服务，client/CLI无NDJSON导出命令/方法；物理backupOffline只是本地当前schema快照，不能替代权限过滤导出。正式M6封存评审对象尚未实现，普通review/decision帖子不能冒称正式评审或已实现封存导出认证。

现有 StoragePort 有同步readSnapshot、findSpace/getSpaceRevision、帖子固定修订、关系/附件/事件读取与身份授权复用点；SQLite schema2持久actors/credentials/memberships/sessions、spaces/space_revisions、threads/thread_versions、posts/post_revisions、relations/relation_resolutions、artifacts及消费/幂等材料。不能直接按全库表dump作为空间导出：credential和instance token_secret必须排除，跨空间关联/不可读关系端点与public事件投影需沿服务端规则。现docs03/context明确redacted只墓碑，不泄露正文；withdrawn固定历史仍可读。备份可保留redacted物理bytes，逻辑导出不能沿用该物理语义。

潜在最小改动点（非冻结方案）：core新增受AuthService与readSnapshot约束的export服务/必要StoragePort有界目录方法；protocol定义NDJSON版本标头/记录/错误与附件manifest；server新增空间export路由及严格query校验；共用client与CLI复用HTTP传输。需父决定记录范围、顺序与一致snapshot、分页/有界流、敏感字段白名单、失败时部分stream语义，以及导出附件只清单还是现授权下载链接；不得先写未来空接口。

必要验收候选：普通可读actor/管理员输出范围、跨空间与撤权、redacted墓碑与不可读关系过滤、无credential/secret/session密钥、稳定ID与旧固定修订、附件授权manifest与NDJSON每行parse、大小/取消及失败边界。当前未运行这些检查，不把未来规划能力报告可用。
