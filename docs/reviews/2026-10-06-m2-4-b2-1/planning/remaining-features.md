# 当前未完成能力事实清单

2026-10-06，按docs08与当前源码/接口/最新B.1验收窄核，仅供父回答用户，不改变本包范围。已有功能与完整里程碑分别说明，未跑新测试。

| 阶段 | 已有基础/部分实现 | 仍待实现或验收 |
|---|---|---|
| M2共享记忆/读取 | 附件HTTP上传下载/授权/配额/孤儿清理、类型化帖子、知识视图/来源状态、FTS搜索签名分页、context硬正文预算/一致checkpoint、固定空间规则ref续读已本机验收。 | B.2.1固定帖子内容有界续读尚未实施；B.2.2主题目录/聚合方案另裁。focus明确不支持。T06十万负载及整个M2未完整验收。 |
| M3可靠消费/运维 | EventService已有subscription/consumer/batch、持久单待确认poll/ack、重投/ACL epoch门禁、checkpoint起点；HTTP/CLI/MCP消费已存在。shared client有取消/超时/有界重试与request-key复用。SQLite迁移/结构预检、脱敏/FTS移除、CLI数据目录锁与SIGINT/SIGTERM关闭已有正式回归。 | 不能说poll/client未实现。完整M3仍待受控离线备份/恢复、结构化export/import与恢复epoch演练、持久request_key接口完整目标、通用配额/限流/运维诊断与完整可靠恢复验收；现附件quota不等于通用服务quota。 |
| M4CLI/宿主 | CLI init/serve/context/search/read/publish/relate/subscribe/poll/ack与space read存在；stdio MCP真通信，Pi0.87.1官方类型/validator→execute本机通过。 | CLI附件上传/管理与凭据诊断等完整CLI尚未完成；MCP/Pi保持已获准接口，不把通用本机文件上传列为本包或首版必需。CLI search仍data-only无cursor入口。dsh/Pi/Codex/Claude四真实宿主会话认证均not_tested，受控SDK不是宿主模型实测；Pi完整reload/fork/switch等T20未完成认证。 |
| M5Web/v0.1 | 当前后端与命令行已有，可本地运行。 | 未见Web/frontend实现包，空间/讨论/失败/搜索/附件/版本页面、同源浏览器认证/无障碍/窄屏旅程、容器及完整v0.1部署演示未实现或未完整验收；20客户端基准/干净安装未测。 |
| M6正式独立评审 | protocol存在review/receipt schema；modules/review仅有manifest/hash生成初步类；普通review/decision仍文章。知识投影明确formal_review_status/formal_check_status=not_enabled，forum_review不暴露。 | 正式持久review对象/迁移、资格与贡献者排除、固定名单/封存初评、所有入口隔离、揭示/完成/取消/失效竞态、HTTP/CLI/MCP/Pi/Web评审动作与T14–T17/T19闭环未实现验收，不能把manifest或review帖子当正式批准。 |
| M7外部验证/v0.2 | protocol有检查回执字段和未来契约。 | 未见已接线外验receipt业务/公开route闭环；受限verifier、材料/配置hash绑定与重放/重跑、无模型外部验证器、D01正式评审+检查+最终决定、完整v0.2升级/导出/恢复/四宿主认证仍待实现验收。 |
| M8研究价值 | 文档有等预算对照/消融方案。 | 真实研究任务数据、模型预算运行、外部评分/成本/置信区间和增益结论尚未做；工程通过不等于已证明协作收益。 |

共通环境缺口：Node22、干净安装、远程CI、真实四宿主模型、10万负载未测。本轮三组原真实历史HTTP重放夹具临时DB/token丢失，旧验收证据保持，恢复运行未完成；这是证据材料缺口，不能反向称已存在幂等/升级能力未实现。

依据：docs/08-roadmap.md；B.1 README/verification；packages/core/src/services/event-service.ts、redaction-service.ts、artifact-service.ts；packages/client/src/client.ts；packages/cli/src/index.ts；modules/review/src/index.ts；knowledge-projection.ts REPORT_FLAGS；integrations/compatibility.json。未探索或实施下一阶段，仅列当前能力边界。
