# M2.4-B.1：固定空间修订引用与规则续读

2026-10-06，父代理接受本包有限本机工程范围；目录保留原2026-10-03任务日期。独立276/276正式测试、28文件，新增core8+contracts5已含总数；当前版本化29/29通过。整个M2.4/T06/M2与M5/M6/M7仍未完成。

context始终带固定space_revision_ref；目标/规则必需内联超预算时整体null并标omitted_for_budget，保留可容纳的可选材料。新增固定空间revision GET以UTF8安全JSON片续读，拼接后精确恢复stored objective/rules，当前空间更新不漂移。每页当前鉴权、签名绑定、首次24h期限沿链继承、严格位置与实际HTTP完整正文预算已验证。CLI context和space read打印完整data/meta；forum_read严格按space/post/thread分支校验，未实现参数不再默默忽略。

| 验证 | 本轮结果 |
|---|---|
| 正式与当前命令 | 276/276、28文件；当前29/29（含一次统一build） |
| 独立HTTP | 实际rawbody、真实request_id临界、Unicode/二次JSON转义、固定旧版重组及最小进展通过 |
| 权限与一致性 | 首exp延续、等号/+1秒、每页当前ACL、WAL旧ref/seq与checkpoint实际poll通过 |
| 本地工具/CLI | 安装Pi0.87.1 validator→execute、MCPstdio发现/调用、CLI完整page与5页规则重组通过 |
| 目录合同 | ADv2实际36routes/20body=19JSON+1multipart，18条date-time ignored不构成值格式验证 |
| 旧脚本 | SQ/native、KV、AC/ADv2/AE通过；三真实旧HTTP原夹具回放未完成 |

三组真实旧HTTP原夹具因重启丢失私有temporary DB/credential而ENOENT，未进入产品回放。本轮不能称历史HTTP回放通过或所有旧回归保持；A原成功记录独立保留。原M2.1未提交构建无法从HEAD同版重建，不能用新合成夹具替代原rawhash/原键证据。这是父代理已接受的本包证据限制；仅恢复原DB/对应凭据或发现用户另存副本后可重试。

[独立验证](verification/verification.md)、[真实计数与SR映射](verification/coverage-2026-10-06.json)、[完整性](verification/integrity-2026-10-06.json)为依据。执行时125source/config/tests与36docs稳定，2207旧证据、4SQL/archive、2schema保持原字节；19个tracked dist正常变化及新service四构建产物单列。原JSON-only历史28/29和首EPERM/旧夹具ENOENT证据均保留。新增正式计数与独立探针不相加。

[覆盖核对](coverage-audit.md) · [开发交付](implementation/README.md) · [下一包M2.4-B.2.1固定帖子修订正文](next-task.md)。下一包尚未开始实现。

限制：本机Node26.3.0/pnpm11.7.0；真实四宿主模型/Node22/干净安装/远程CI/10万负载未测。Pi/MCP本地SDK路径不等于宿主模型认证。成功compact HTTP正文cap不含headers/status/error/toolwrapper；每页完整文档读取/编码O(document)，不是CPU或常数内存硬预算。SQLite TEXT已替换的objective孤立surrogate无法恢复，续读精确以stored值为准。focus、帖子/主题正文分页、artifact/review工具读取仍未实现；没有发布、部署、commit/push或全局配置变更。
