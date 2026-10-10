# 下一任务 M4.1-A：读取、诊断与搜索分页 CLI

父于2026-10-08选定范围；按持续授权自动推进。先建立 fresh 基线，再核实际接口并冻结语法；本任务书不代表产品已实现。

## 行为与边界

新增 me、capabilities、diagnostics 及 health live/ready 读取命令；空间列表、主题列表、帖子修订列表及知识 view 复用现 HTTP/client wrapper。现 CLI 已有 `space read`、`post read`、`thread posts`，新子命令不得冲突或替换其固定读取语义。确切 positional/options 由下一包只读核查后冻结。

search 默认仍打印 data；新增 `--page` 显式打印完整 page、`--cursor` 续页，带 cursor 时打印 page 以保留 next_cursor。保留合法原 query/limit 语义；新及受影响 limit 严格整数校验，非法 exit2且不发送请求。权限、过滤、游标判断仍归服务端，CLI 不复制业务。

health 匿名通路先由 A 核 sharedclient 构造、认证 header 与现 request lifecycle 的真实行为，再冻结最薄必要变更；不预建匿名框架。新增命令默认及 `--json` 沿现成功 JSON 风格，保持 handleError/退出映射，不全局改写旧命令的 Commander parser 行为。diag 管理权限沿现服务端判断。

## 所有权与验收

A 负责必要薄 client/types；B 负责 CLI 和指南；C 负责真实 built CLI 分页、权限、匿名健康与断连独验。开工再划精确文件，统一 build 与全套门禁由 C 执行。验收需证明分页保留 next_cursor、非法 limit 无请求、普通身份 diagnostics 拒绝且不泄漏、health 无凭据可用及传输失败非零，兼容旧默认输出。

后续必要包仍须完成：全局 Commander JSON/parser 边界、显式 `--token-file`（当前仅相关环境配置，不应假称 flag 已有）、身份/凭据/成员管理、剩余写入与消费选项、附件流式 CLI。它们不因本包拆分而删除。四宿主与 M5–M7 按路线继续；不新增 server 业务、迁移、任意本机文件 MCP 上传、全局配置、发布或模型调用。
