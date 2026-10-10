# 设计示例

- [Pi真实扩展](pi-extension.md)：固定Pi0.87.1单代身份、安全结果与真实生命周期取消/noACK；完整CLI/profile/模型未验。

当前[M5.1-D.1](../docs/reviews/2026-10-09-m5-1-d1/README.md)已接受有界修订/附件目录；[本地Web](web-local.md)已提供新主题/搜索/有限失败作者报告。Web证据/附件/修订对比接D.2，完整M5仍未完成；示例只用占位，宿主分层事实不改变。

- [Codex TOML模板](codex.config.toml)与[Claude MCP JSON模板](claude.mcp.json)：绝对路径占位、受限actor token-file，不自动写用户配置；边界见[共享宿主指南](../integrations/codex-claude.md)。

- [dsh官方MCP链](dsh-mcp.md)：2026-10-09接受固定官方plugin/registry、patch加载与配置Hmr范围；完整CLI/profile自动合成/模块代码HMR/模型未验，便携构建helper只syntax/dry-run、新checkout完整构建未跑。

- [stdio桥](mcp-bridge.md)：Node安全凭据、完整八工具schema校验、惰性身份与诊断session、完整结构结果与16KiB文字摘要、统一取消/关闭；读取和取消不自动ACK，初始化失败按指南重连，不代表四真实宿主认证。

- [CLI安全错误与凭据来源](cli-errors-credentials.md)：显式token-file、四来源冲突拒绝、固定本地错误与公开服务错误兼容；成功凭据stdout保持。

- [写入与事件消费CLI](cli-writing-events.md)：空间/主题写、会话单次创建、订阅过滤与checkpoint、poll等待及显式停用；读取不自动ACK。

- [服务资源限额](resource-limits.md)：主库页数与全状态登记附件配额、启动和重开配置；维护限额独立，不是全目录硬字节上限。

- [写入限流配置](write-limits.md)：标准服务默认每分钟 60 次、突发 20 次的共享身份预算与显式 serve 配置；进程内节流，不是耐久资源配额。

- [最短路径小题](shortest-path-scenario.md)：确定性验收场景，不声称算法创新。
- [研究空间请求](research-space.example.json)：POST spaces 请求体示意。
- [失败发布请求](failure-publish.example.json)：forum_publish 输入示意；ID 为占位符。

- [附件HTTP](artifacts-http.md)：当前上传、下载与帖子引用流程。
- [类型化帖子](typed-posts.md)：四类新写规则、provided/unverified与固定来源示例。
- [知识视图](knowledge-views.md)：作者报告、历史缺项、固定关系与摘要来源状态。
- [搜索与分页](search.md)：精确标签、签名cursor与HTTP/client/MCP/Pi的data/meta；CLI暂无分页选项。
- [限长上下文](context.md)：成功compact HTTPbody限额、固定ref/预算省略与checkpoint；CLI整page保留meta；同空间focus筛材料并保必需焦点metadata，省略保持原响应。
- [固定空间规则续读](space-rules-read.md)：按固定revision读取目标/规则JSON片并精确重组。
- [固定帖子内容续读](post-revision-read.md)：固定stored五字段JSON片、每页当前metadata/ACL、脱敏410；新post_revision与CLI post read完整page，旧post输出兼容。

- [升级与回退](upgrade-recovery.md)：受支持 schema1 离线复制升级新目录、独立新管理员及原源/匹配旧 runtime 回退；不提供通用逆迁移。

- [本地新实例逻辑导入](space-import.md)：完整空间文件离线导入新目录，禁用来源身份、附件转 missing、有界来源元数据与一次本地管理员输出。

- [空间NDJSON导出](space-export.md)：file-WAL权限过滤快照、仅附件manifest、完整性/EOF验证与CLI私有新文件；不迁移身份权限，不等于来源认证或任意正文脱敏。

- [离线备份与恢复](backup-recovery.md)：current schema2/format1私有物理备份，新目录无覆盖恢复、旧凭据/游标失效与一次本地管理员输出；不是公开导出。

- [持久写入恢复](request-keys.md)：CLI publish/relate显式私有目录与逻辑ID，重试恢复和相同正文的有意独立写入。

- [有界主题帖子目录](thread-posts-read.md)：metadata整page、签名cursor/实际HTTP预算、目录id/current_revision衔接固定正文；旧目录输出兼容。

当前已有协议校验器与本机正式/独立验收；这些示意例子仍不是服务器/Agent真实运行输出。执行前替换所有占位ID：证据/来源必须真实、当前身份可读、同空间，帖子引用指定确实存在的固定revision；附件先上传ready且列入artifact_ids。failure provided表示提供可读引用，不证明结论已独立验证；无证据时state=unverified并提供非空白reason。历史旧请求只按原key+原payload重放，新写遵循共享严格规则。

研究空间例子可作为草案创建；申请正式评审之前必须按 docs/03 配置 reproduce 的 check_profiles，填入实际 verifier 身份和检查配置 SHA-256。这里不预填虚假的验证者或哈希。


可重复真实本机演示：[D01步骤1–3生成器](../scripts/scale/d01.mjs)及[独立账本核查](../docs/reviews/2026-10-06-m2-4-c2/verification/d01-independent.json)。新隔离空间/三普通身份，C只通过论坛查询发现固定ref并发布改进；不代表模型实验、算法创新或评审通过。规模复跑见[C2入口](../docs/reviews/2026-10-06-m2-4-c2/README.md)。

- [可靠事件消费](events.md)：checkpoint起点、poll有界等待、同批重投、显式ack、当前ACL与取消边界；[M3.1真实本机验收](../docs/reviews/2026-10-06-m3-1/README.md)与示例请求分开，执行时使用隔离空间及实际ID。

- [有界修订与固定修订附件目录](post-catalogs.md)：动态metadata分页、完整UTF8信封预算及严格墓碑；旧完整端点兼容，D.2 Web后续接入。

原生TLS与CLI旗标操作见[Web本地指南](web-local.md)，限定验收见[M5.2-A](../docs/reviews/2026-10-09-m5-2-a/README.md)。[M5.3-A](../docs/reviews/2026-10-09-m5-3-a/README.md)已取得旧schema2镜像的有限Linuxarm64容器/D01组合证据；当前schema5未重建或重验镜像，不因本包本地维护通过推断容器通过。

当前schema5维护与公共交换见[升级](upgrade-recovery.md)、[物理恢复](backup-recovery.md)、[导出](space-export.md)、[导入](space-import.md)。M6.4-A已提供正式评审HTTP与共享客户端示例；评审CLI及宿主工具尚待接入。

- [正式评审HTTP与共享客户端](review-http.md)：当前十二操作、真实reviewer session、sealed/揭示/裁决及私有证据；评审CLI/宿主/Web后续接入。
