# 下一任务：M5.1-E.2 创建时间目录与安全 Markdown

本任务为父已冻结方案；E1已接受，文档闭合及下一包fresh后实施。现在仅任务书，不代表代码、依赖、性能或浏览器验收已完成。事实依据：[E2 方案事实](planning/m5-1-e2-facts.md)、[SQLite 时间实测](planning/sqlite-time-findings.md)。

## 创建时间排序契约

- 新可选 `sort=created_at_asc`，默认 `id_asc`、旧签名 cursor 及旧 GET thread 语义保持。名称“按创建时间”指服务保存的 canonical UTC 毫秒时间，再以 ID 固定 tie；不宣称事务提交顺序、时钟单调性或导入时间真实性。
- 仅长度24且 `strftime('%Y-%m-%dT%H:%M:%fZ',created_at,'+0 seconds') = created_at` roundtrip 成立时取原时间为 key；其余时间未知，完整展示并置于末尾按 ID 排序，不把坏日期归一成另一天。不更改历史数据、导入验证或迁移。
- SQL 顺序为 valid-before-unknown、key、id；keyset 必须使用完全相同表达式。新增严格 cursor 分支保实际发出末行的 nullable key 与 ID，绑定 actor/space/thread/sort/原 exp；续页必须显式匹配 sort。旧 id 分支不能被改成新格式或接受跨分支 cursor。
- storage 新窄查询分支返回私有 `sort_key`，服务不复制日期判断，不泄漏到原公开 Post 响应。保数量/完整信封 UTF8 预算、最后实际行游标及动态目录语义。浏览器显式选择新 sort，并说明历史未知时间排末尾；不得在客户端只排序当前页冒充全序。
- 新 sort 贯通 protocol/OpenAPI/server/sharedclient `getThreadPosts` 与 `callTool`、CLI `thread posts --sort`。MCP/Pi 沿同 canonical 工具 schema 与 sharedclient 转发，不新增工具；旧调用省略 sort 的行为保持。

## 索引与性能边界

初始不增 DDL/schema/自动索引。D 在隔离真实 HTTP fixture 做一次有界性能验收，覆盖100k总体普通分布和集中 thread 的首/续页；保参数、EXPLAIN、时长、资源和实际退出。旧已接受 benchmark 不改、不借平均100/thread证明集中100k性能。若计算排序实际不足，父再裁精确索引及创建/升级/配额/失败生命周期；任务书不预填合格，不擅自扩大600秒负载。

## 安全 Markdown 契约

- Web 精确直接 pin `react-markdown@10.1.0`（MIT、React19兼容）。无 rehype-raw、HTML注入、sanitizer、highlighter、GFM、math 等新包；不得引入 Node shim。安装与 lock 审计仅下一 fresh 后按父分派执行，不在 E1 安装。
- 仅白名单 CommonMark React 元素与 code/pre；默认 HTML 转义为文本，保研究原文。禁真实 img/media/embed 及自动网络；图片只展示 alt/纯文本来源。链接仅允许显式合法 absolute http/https 且无 URL 凭据，`rel="noopener noreferrer"`、`target="_blank"`；其余呈文本，不发请求。不得把 react-markdown 默认 URL 白名单直接当本任务策略。
- 正文、规则可用同组件；标题/摘要/structured 保持纯文本。每输入 UTF8 ≤128KiB才 Markdown 渲染，超限明确退纯文本；“原文”切换保 exact text。128KiB仅输入预算，不声明 CPU 硬上限，也不执行内容指令。
- 本地只读 AST 预算检查最多 depth64/nodes20000，越界明确原文 fallback；不改研究字符串，不引额外第三方 plugins、HTML 转换或执行能力。局部 React error boundary 承接 Markdown 解析/渲染异常，显示原文及清楚降级说明，source 变化后可恢复，不能使整个论坛白屏；不能将异常判为内容相同或已验证。

## 预分所有权（fresh 后精确冻结）

A 核心/存储/协议/client/CLI及正式测试：`packages/protocol/src/threads.ts`、`tools.ts`必要引用、`openapi.ts`；`packages/core/src/ports/storage.ts`、`services/thread-posts-read-service.ts`；`packages/storage-sqlite/src/sqlite-storage.ts`；`packages/server/src/routes/threads.ts`；`packages/client/src/client.ts`；`packages/cli/src/index.ts`。原 default 方法与旧 GET thread 不重写。作者新回归文件建议 `tests/contracts/m5-thread-post-order.test.ts`，既有 m2 thread-posts tests 保留。

B Web/Markdown：`packages/web/src/app.tsx`、新 `packages/web/src/safe-markdown.tsx` 与必要样式；所有browser由D独占；`packages/web/package.json`、`pnpm-lock.yaml`及真实必要公开安装设置由父划范围，不并改 A 协议/client。现 React/Vite pins 保持，无全局配置变动。

D 独立：专用 Web fixture与新 `scripts/integrations/web/m5-e2.spec.ts`（所有browser独占）、真实 HTTP 排序/游标/安全回归及上述有界性能，统一 build/type/lint/full/current29；具体文件与执行窗口由父定，作者不得并跑旧 dist 或全套。文档/ADR/入口在功能接受后收口。

## 必要验收与保护

- 排序：同 timestamp 的 ID tie；非法/非canonical历史时间完整保留末尾；时钟回拨不伪称提交顺序；首/续页实际末行、字节裁尾无漏页；跨 sort/actor/space/thread、缺省续页拒；当前撤权、纯读取无业务副作用；旧默认/cursor/GET thread 兼容。私有历史 seed 明确是 fixture，不冒称实际 import workflow。
- 浏览器：服务新顺序真实跨页；Markdown HTML/XSS/恶意 URL、图片/media 无执行/无外网；原文切换 exact text、128KiB边界纯文本、深嵌套/depth64/nodes20000超预算与解析/渲染异常的局部降级和source变更恢复、正文与规则固定 ref；键盘/窄屏与 auth/space/logout generation 晚响应保护。只显式点击合法外链，不自动访问。
- 保首失败、真实命令/exit/hash及修正原因。无模型、用户 profile/凭据、全局安装、push；只自有临时 SQLite/HTTP/Chrome context，登记并清退资源。不输出 HAR/trace/storageState/秘密快照；可留无秘密实际视口截图。旧 review/SQL/archive/HEAD 原字节保护。
- 旧 UI 流程按受影响关键旅程选择回归；本包涉及下层，不能仅以 UI 不变复用下层 gate 代替真实检查，也不机械重复无关历史实验。

M5 单服务部署/容器、操作教程、干净安装与恢复及出口验收仍必须推进；E2不代表完整M5完成。M5出口后继续M6/M7，正式评审当前未启用。任何契约或实际性能冲突交父裁，不自行扩大方案。
