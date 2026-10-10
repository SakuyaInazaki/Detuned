# M2.4-B.1 协议、HTTP、client 与 CLI 交付

2026-10-06 恢复收尾。复用 2026-10-03 已实现内容与首次证据；本记录是开发交付，最终接受由父代理依据独立验证裁定，不宣称整个 M2/T06 完成。

## 完成行为

- 固定空间修订 GET、严格 revision/query、共享 compact 文档编码与实际 request_id 的完整 HTTP envelope 计量；分页 DTO/schema 关联 complete、truncated 与 next_cursor。
- context 增加固定 space_revision_ref 与 included/omitted_for_budget 判别；schema 拒绝半省略或省略但 truncated=false。省略后的目标/规则可通过 HTTP 固定版本真实重组。
- client 保留完整空间页；forum_read 使用严格 root object + anyOf/UnionKind 分支，space 无 id 且 revision 必需，旧 post/thread 合法输入保留原返回；不再默默忽略未实现的分页参数，artifact/review 不在发现 schema 中。
- CLI 新增 space read 固定修订读取并打印完整页；context 迁移为 `{data,meta}`，help 明示 focus 未支持。原合法 post/thread 和 search 输出保持。
- docs04、space-rules-read 示例与当前 context 示例说明预算、固定引用、重组和 CLI 迁移。本次恢复只修改 context 示例，未修改产品或正式测试。

## 验证证据

2026-10-03 首次日志原字节保留：before.log 实跑两条，观测到大目标 context 返回 422（错误正文无固定 ref）和固定 revision route 返回 404；before.json 仅为范围文件哈希。旧 CLI context 只打印 data、丢失 meta 是当时源码事实，没有运行 CLI before；targeted-first.log 为 4 个正式文件 15/15（space-read 5、context 4、cross-interface 2、knowledge-view 4），types-first.log 是 source paths 定向 TypeScript 检查的空诊断输出，contract-tsconfig.json 包含 CLI；protocol-build.log 与 protocol-build-final.log 为当时 protocol 单包构建输出。旧日志不包含单独结构化 exit 元数据，不能将空文件单独当作完整执行证明。

本轮 `2026-10-06-resume-audit.json` 保存 15 个当前范围文件 SHA-256、7 份旧日志/配置 SHA-256 与 5 项示例一致性检查，检查全部通过。它是读取源码与文案核证，不是重跑构建或测试，也不证明当前源码与首次测试时源码完全相同。

恢复阅读核对了冻结接口、路由/client/CLI/schema 与正式专项。没有发现需要追加产品修复的问题，因此没有机械重跑已经通过的定向测试或修改正式断言。统一 build/typecheck/lint、全正式套件、当前 29 命令和实际 Pi/MCP/CLI 路径由独立验证单元运行；本单元没有运行或宣称这些检查通过。

## 范围与限制

核心权限、快照、Clock、签名游标、固定版本分页和 context 预算选择由 core 单元交付，route/client 不复制业务。规则投影只含 objective/rules；拼接所有 chunk 后才能 JSON.parse。HTTP 正文预算不包括错误、头或工具/CLI pretty 包装；最低 metadata 仍可 422。帖子/主题正文分页、focus、artifact/review 工具读取、真实四宿主模型认证、Node22/干净安装/远程 CI/10万负载均未在本单元验证或实现。

没有依赖/DDL/全局配置/发布/部署/提交/推送变更，没有改写历史审查。下一步等待独验与父代理接受；根 README、progress、审查索引由父代理另行授权同步。
