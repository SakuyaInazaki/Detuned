# M5 首个 Web 纵向片段：有限事实与候选

2026-10-09。M4.5-A 规划输入，独立只读核查；不代表 M5 已实现或验收。仅写本文件，没有运行 build、测试、安装、浏览器、模型或用户配置。A/B 的 Codex/Claude 宿主核查不在此范围。

## 已决定的要求

- `docs/01-product-requirements.md:27,65`：FR-10 是 P0/v0.1；空间概览、按创建顺序的主题阅读与发布、失败索引、搜索、证据、修订页面属于 M5。正文安全 Markdown/代码/普通数学文本即可；键盘、焦点、文字状态必需。复杂公式不是门槛。
- `docs/02-architecture.md:19,36,49,62`：单服务提供 Fastify API 和 Web 静态文件；计划 `packages/web/`、React/Vite；Web 复用 HTTP client，权限业务留在 core；页面关键流程使用 Playwright。首版不需要 Redis/WebSocket/SSE。
- `docs/04-protocol.md:3,8`：Web 仍为规划；API `/api/v1`、Bearer 身份已实现，Web 使用同源 cookie 转换到同一 actor；不能从规划表推断 UI 可用。
- `docs/07-security-operations.md:30–34`：专用 human token 经 `POST /auth/session` 换短期 HttpOnly/SameSite cookie，生产 HTTPS 设置 Secure，明确区分 loopback 开发；会话服务端可撤销；变更请求校验 Origin 与 CSRF，严格 CORS/Host allowlist；token 不存 localStorage。首版不做邮箱、密码、SSO。
- `docs/08-roadmap.md:76–83`：M5.1 页面与会话、M5.2 状态/键盘/窄屏、M5.3 单服务交付、M5.4 并发与干净安装分别验收；不能把第一片段称完整 M5。正式评审未启用应明确显示。
- `docs/09-validation.md:21` T11：恶意 Markdown、私有对象、长正文和键盘访问，核心浏览与发布可完成且不越权、不执行脚本。`docs/11-development-standards.md:42` 要求测关键旅程及内容隔离，不铺大量截图测试。

**规范尚未决定的具体协议**：cookie 名称/Path/SameSite 的具体值/TTL，持久或进程内会话存储，CSRF 算法/头名/获取方式，会话查询与注销端点/schema，Bearer 与 cookie 同时出现的优先级，human 管理凭据是否允许换 Web 会话。现有 actor.kind 区分 human/agent/service，并没有独立的“Web token” capability。应由主代理冻结协议与数据库策略；不要把下面候选写成既成决定。

## 实际代码落点与缺口

| 范围 | 已存在的事实 | 最小缺口/准确落点 |
|---|---|---|
| 包与页面 | `packages/` 实际为 adapter-pi、cli、client、core、mcp、protocol、server、storage-sqlite；没有 web/frontend 包 | 按计划新增有实际页面和构建产物的 `packages/web/`，不要先造空路由包 |
| HTTP 认证 | `packages/server/src/app.ts:252` 全局 preHandler 只认 Bearer；`packages/protocol/src/request-policies.ts:29` 仅 capabilities/live/ready 匿名 | 加明确认证入口和 cookie 解析；静态入口匿名范围须独立且明确，不能令 `/api/v1/*` 意外匿名；现无 `/auth/session` 实现 |
| 同源保护 | `packages/server/src/app.ts` 注册 `cors`，未传严格 allowlist；未注册 cookie/static，也未发现 Origin/Host/CSRF 检查 | server 组合根显式注入部署 origin/host/dev 配置；入口做 Origin/Host/CSRF，并保既有 Bearer 客户端契约；不在业务层读取 env |
| 身份/ACL | `packages/core/src/services/auth-service.ts:33,80,103` 验 token hash/撤销/过期/actor，refreshContext 重载 credential；requireSpaceAccess 校验凭据空间、成员、role/capability并掩蔽无权对象 | cookie 恢复原 actor **及原 credential**，每次检查当前有效性；不得只返回 actor 或新造全空间/全能力 credential，Web 不复制 ACL |
| human 识别 | `packages/protocol/src/actors.ts:3` 有 human/agent/service；credential capability 仅 read/write/admin | 登录明确检查 human 与授权策略；不得把 agent/admin 配置分发给普通页面用户 |
| 读写业务 | `packages/server/src/routes/spaces.ts`、`threads.ts`、`posts.ts` 已有空间/主题/帖子读写及正文续读；`routes/meta.ts` 有 `/me` | 第一片段复用这些路由与 core，不另造 Web 发帖业务。保分页/固定修订/容量预算、写入幂等及现有错误语义 |
| browser client | `packages/client/package.json` 主出口独立于 `./node`；`src/client.ts:182,300` 使用 fetch/Headers/AbortController，token 可省略；主路径及 artifact/export helper 检查未见 Node 专用 import | 同源 fetch 未显式 credentials，使用同源默认语义可发送 cookie；不据此声称已过浏览器打包。缺 CSRF transport 配置/认证动作；不得 import `@detuned/client/node`。宜显式同源策略避免未来跨源误配置 |
| client 复用 | `packages/client/src/client.ts:660–739` getMe/listSpaces/listThreads/getThreadPosts/getThread/createPost；现有重试、signal、请求键机制 | Web 用同 origin、无 Bearer 的 client；为 cookie 写请求增加显式 CSRF 支持，而非全局改写 fetch。auth `/auth/*` 与固定 `/api/v1` client 前缀需明确处理；读写业务继续用 client |
| 当前 session | `packages/core/src/ports/storage.ts:98` createSession/findSession；`packages/storage-sqlite/src/schema.sql:60` session 是 actor+space+client/version/harness metadata | 这是接入诊断 session，没有 cookie hash/过期/撤销信息；不可将其直接冒称浏览器认证 session |
| SQLite 演进 | `packages/storage-sqlite/src/bootstrap.ts:26,48,521,586` 当前 v2、分类/迁移/原子 bootstrap；`schema.sql` → 生成 `schema.ts` 与版本结构 profile | 若持久会话，明确新版本、迁移、旧库分类和 schema 生成契约。检查 `src/offline-upgrade.ts` 当前 v1→v2、`src/offline-backup.ts:267` restore 撤销原 credentials，以及 `src/logical-import.ts` 的新实例导入；不要只向 v2 加表假称已兼容 |
| 浏览器测试 | 根 `vitest.config.ts` 是 node 环境，既有 tests/scripts/packages 文件盘点未见 Web/Playwright/e2e 入口 | 增加独立关键浏览器旅程，后端真实临时 SQLite；不能用 node fetch/mock DOM 冒称 cookie/CSRF/XSS 实际浏览器通过 |

以上为源码检查；未执行 client browser bundle 或浏览器安全测试。服务中已有通用认证/限额不等于登录暴力尝试和会话容量已受专用预算保护，新入口需要有界输入、会话数量/过期清理与安全错误。

## 本地依赖事实

核查 workspace manifest、`pnpm-lock.yaml` 和本地 installed package.json，没有安装或查在线版本：

| 依赖 | workspace 声明 | 本地实际 |
|---|---|---|
| fastify（server） | ^5.2.1 | 5.12.5 |
| @fastify/cookie（server） | ^11.0.2 | 11.1.2，尚未接入 app |
| @fastify/static（server） | ^8.1.1 | 8.3.0，尚未接入 app |
| @fastify/cors（server） | ^10.1.0 | 10.1.0 |
| Vitest（root） | ^3.0.7 | 3.2.7，当前 node 测试配置 |
| Vite | 未见 workspace 直接声明 | lock/store 中 7.3.6 为测试栈传递依赖；root 无直接链接，不等于已有 Web build |
| React/react-dom/@vitejs/plugin-react/Playwright | workspace manifest/lock 未发现声明 | root 无 React/react-dom/@playwright/test/playwright 直接安装链接；没有已配置浏览器测试能力 |

最小前端实际需要 React/react-dom、TS 类型及明确的 Vite build 依赖；React Vite 插件可按构建需要决定，不因模板自动全引入。关键浏览器验收需明确 Playwright 与浏览器运行条件。cookie/static 复用现有依赖；不需 ORM、Redis、路由框架或全局状态库才能开始。新增依赖仍须按开发规范记录用途、许可和锁定版本；本文件不替实施阶段核定其兼容性或许可。

## 首个可运行片段（建议的有限范围，未实现）

真实 human token 输入 → 同源会话交换 → 本人/空间列表 → 空间主题列表 → 按顺序读主题帖子及必要正文续读 → 发布 note 或回复并看到服务器返回的作者与固定版本 → 可靠退出登录。页面有加载/空态/401/无权/429/断线提示、键盘焦点和窄屏基础布局；M6 未启用文字明确。失败/搜索/证据/差异等完整 M5 页面后续衔接。

最小模块：protocol 的会话/CSRF/error schema 与明确路由契约；server 的认证入口、身份解析、同源防护和静态文件组合；core/存储的会话身份引用与有效性检查（范围由候选决定）；client 的显式浏览器 CSRF transport；web 的上述实际页面；真实服务+SQLite+浏览器旅程。新增决策同步 `docs/12-decisions.md`，由主代理分派文件所有权。

安全边界：

- 输入 human token 仅作短暂登录数据；按既有 token 只进 Authorization 的规范交换，不写 URL、帖子正文、日志或浏览器持久存储，交换完成清空输入。cookie 是不可被 JS 读取的随机 opaque session；JS 只持非身份凭据的 CSRF token 和页面状态，不从 cookie 复制 Bearer。
- cookie 绑定原 credential id；原 token 撤销/过期、actor 禁用、成员/空间撤权及时影响 Web。登录不升级 capability，不绕过权限掩蔽；主体 human 身份也不能默认获得 admin。
- logout 必须使服务端旧 cookie 再请求失败，并清 cookie，不能只清 UI。前端取消在途请求并清本人缓存/CSRF/草稿关联；旧响应不能把退出后 UI 再填回。是否要求阻止注销前已准入写在注销后提交，是需冻结的并发语义；不能声称取消请求可以撤销已提交业务。
- CSRF 校验覆盖 cookie 认证的变更及注销；登录亦校验可信 Origin/Host，防登录 CSRF。明确无 Origin 的 Bearer CLI/MCP 路径，不能无差别破坏既有接入。服务端 allowlist/生产 Secure/loopback 限制都由可信启动配置决定。
- Markdown 禁 raw HTML 或严格净化，禁可执行 URL/SVG，远程图片默认不加载；附件不作为同源可执行文档嵌入。第一片段可先安全纯文本/代码展示，再引入有实际需要的 Markdown 渲染器；不能 `dangerouslySetInnerHTML` 直出帖子。
- 发帖显式复用同一逻辑提交的 Idempotency-Key，断线重试不重复；保服务端事务/ACL/限额。普通页面阅读不自动 poll/ACK，不把浏览器阅读称模型已确认。

## 两个实现候选（交主代理选择）

| 项目 | 候选 A：SQLite 持久 opaque 会话 | 候选 B：进程内有界 opaque 会话 |
|---|---|---|
| 共同协议/UI | 同源 HttpOnly/SameSite cookie，随机会话秘密仅 hash 保存，credential id 关联、短 TTL、可撤销；会话绑定 synchronizer CSRF，可信 Origin/Host；同一 React/Vite 片段与共享 client | 同左；不改业务 ACL/发帖协议 |
| 最小存储落点 | 新独立认证会话表/StoragePort 与 service；新增 schema 版本及迁移/profile，过期/撤销/容量处理 | server 显式注入有界会话仓库，core 通过接口取身份并重载原 credential；数量上限/过期清理，关服清空，不增加 SQL 表 |
| 重启行为 | 可续用未过期会话；恢复/凭据撤销时不能复活登录。backup/restore/upgrade 需要明确是否清认证会话 | 全部会话失效，重新登录；安全关闭。单实例部署可用，但不能称耐久会话或多进程共享 |
| 成本/风险 | 更完整日常使用体验；迁移与维护回归范围较大，必须保护旧研究数据库与离线恢复 | 最快形成真实登录/读写/退出闭环；牺牲重启续登录，未来持久化需明确迁移，无静默替换 |
| 必验差异 | 真实 SQLite 重启、v2 迁移、撤销、restore 后原 session 无效 | 重启前旧 cookie 有效、重启后无效；会话容量到顶有界失败 |

两候选均符合文档“服务端可撤销短期会话”；文档尚未要求登录跨重启持久。不同 cookie/CSRF 方案不是本报告引入的第三路线。主代理应先明确候选、上述未定协议及 logout 并发保证，再实现第一个片段。

建议首次验收（尚未运行）：普通 human contributor 的真实读取/发帖+作者一致+同 key 重试；observer 可读但不可写；无权空间无泄漏；非法 Origin/Host/CSRF 与旧/过期/注销 cookie 拒绝；实际浏览器 HttpOnly/安全渲染/远程资源阻断；退出时旧响应不回填；候选专有重启条件。无需模型账户，未安装 M4 客户端不妨碍这些 M5 工程任务。
