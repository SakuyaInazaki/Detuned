# M5.1-A 独立功能验收

结论：本包同源 Web 认证协议、进程内认证会话、共享客户端与显式 CLI 配置可以接受。独立发现的根认证输入契约漏项已经作者修复并真实复验。最终核心 **670/670，98/98 文件**，current29 合成 **29/29**。此结论仅是 Node HTTP 协议与现有业务授权验收；尚未实现或验收 Web UI、真实浏览器 cookie 执行、DOM/XSS 旅程、生产 TLS/反代，也不改变 M4 跨宿主与真实模型认证的未完成范围。

独验者只写新增 `tests/contracts/m5-web-auth-independent.test.ts` 及本目录证据、获准历史探针适配。产品与作者测试由各作者负责，未由独验者修补。基线 [baseline.json](baseline.json) SHA `c56ed20b8dfbc5dcca55588b13a0e0d3613565c68c5d8fd7c9c8eba35ff8439f`，HEAD 为 `b8dacd56779a007a2e7045b682bca0c036fdfc44`。

## 实际 gates 与版本覆盖

| 检查 | 退出码 / 数量 | 实际时长 | 证据 |
|---|---|---:|---|
| 首次根 `pnpm build`（A v1/B v2） | 0 | 5.192s | [receipt](gates/build.receipt.json) |
| 最终 B v3 protocol 必要增量 build | 0 | 0.985s | [receipt](gates/build-protocol-fixed.receipt.json) |
| 最终 A v2 server 必要增量 build | 0 | 0.917s | [receipt](gates/build-server-fixed.receipt.json) |
| 最终新独立文件 source noEmit | 0 | 1.441s | [receipt](gates/independent-noemit-final.receipt.json) |
| 最终独立真实 HTTP 定向 | 0，7/7 | 2.383s | [stdout](gates/independent-root-fixed.stdout)、[receipt](gates/independent-root-fixed.receipt.json) |
| 首次最终 `pnpm typecheck` | 0 | 4.941s | [receipt](gates/typecheck.receipt.json) |
| 首次最终 `pnpm lint` | 0 | 4.687s | [receipt](gates/lint.receipt.json) |
| 首次默认 `pnpm test` | 1，667 通过 / 3 失败，98 文件 | 42.500s | [完整 stdout](gates/full.stdout)、[stderr](gates/full.stderr)、[review](full-first-failure-review.json) |
| 获准旧 fixture 修正的独立定向 | 0，3 通过 / 27 未选 | 1.394s | [receipt](gates/route-fixture-fixed.receipt.json) |
| 唯一必要默认 full 复验 | 0，670/98 全通过 | 47.961s | [完整 stdout](gates/full-fixture-fixed.stdout)、[stderr](gates/full-fixture-fixed.stderr)、[receipt](gates/full-fixture-fixed.receipt.json)、[完整输出核查](full-final-output-review.json) |
| 最终 25 个保留探针组合 | 全部 0 | 各命令合计 15.504s | [results](current25-results.json)、[完整 JSON 输出核查](current25-output-review.json) |
| `git diff --check` | 0 | 0.207s | [receipt](gates/diffcheck.receipt.json) |

build 的最终版本覆盖是首次根构建加 protocol/server 增量构建，不能称为最终全部源码一次全量 build。后两次冻结只改变 protocol 和 server；client/CLI 字节未变，运行时导入最终构建的 protocol/server，未重复构建其他包。最终独立测试所验字节在两次 full 前记录 [freeze](independent-test-freeze.json)，与最终定向/noEmit 版本一致；最终 full 包含 B 获准的两份旧 fixture 修正。完整 98 个文件结果与 stderr 均核查；最终 stderr 仅 `$ vitest run`，无失败或 unhandled error。caffeinate 仅附着两次本轮 full 进程，未修改全局设置。

正式包级 typecheck/lint 实际执行包级 `tsc --noEmit`（storage lint 同时核 schema 同步），不涵盖根 tests；独立新文件另做 source alias noEmit。B 额外两个完整旧文件 noEmit **exit2**，完整诊断位于 [作者原文](../author/client/fixture-repair-noemit.stdout.txt)。诊断未指向新增 helper 或改动枚举行，包含根 Fastify 类型解析及其他文件区域；不能据此声称两旧文件类型检查成功，也不能未经基线复现称所有错误 pre-existing。本包没有泛改这些旧类型。

父接受后补充核查 [有限归因](../author/client/fixture-repair-noemit-attribution.md)：只在额外 standalone 配置中映射已安装的 server Fastify 类型，无安装/源码修改。修正上下文后仍 exit2，[完整输出](../author/client/fixture-repair-noemit-resolved.stdout.txt) 有42项诊断；原未解析 Fastify 消除后其余错误仍在，不能把失败全部归为执行上下文。未保存可哈希核对的原 fixture 字节，未用猜测重建作为 compiler 输入，因此剩余42项仍未证明 pre-existing。它与正式 package type/lint0、本包新独立 test noEmit0 分开记录，没有重复功能 gates。

current29 是四项 gates 加 25 探针，精确版本组合见 [results](current29-results.json) 和 [命令清单](current29-manifest.json)。25 个中 **21 个原脚本、2 个既有批准适配（#11/#27）、2 个本包批准适配（#28/#29）**。#28 原脚本 exit1/0.264s，AD02 operation-set mismatch；#29 原脚本 exit1/0.441s，AE03 route_sets_equal=false，其他各四组均通过，原 stdout/stderr 全保留。新适配各一次 exit0/0.433s、0.444s，AD/AE 各 5/5。适配只移动相对 package URL 并按 operation→path→document 有效 servers 选择 API v1、枚举八个标准 HTTP verb，不硬编码排除 auth，不删 schema/参数/media/取消/错误断言。精确差分见 [28](adapters/28-approved-diff.patch)、[29](adapters/29-approved-diff.patch)。旧原件字节不变。#28 保留 5596 bytes 的既有 AJV `unknown format date-time ignored` 警告，不借此旧探针声称日期格式验收。

## 独立真实正反例

七例均使用自有私有磁盘 SQLite、真实 Fastify loopback HTTP、受控 Clock；管理凭据只用于 fixture seed，普通业务使用限定一个空间、read/write 的 human contributor 或 observer。既有写桶保持启用，seed 以受控时钟补充预算，没有关闭 rate/quota。原生 HTTP 原始 header 对支持真实重复 Cookie 行；HTTP 观察与错误输出均不记录私有凭据。测试 finally 关闭 app/proxy/DB 并移除自有 temp，内建 CLI 子进程有界等待。

1. human 无 body 登录实际 201，认证 Cookie 有 HttpOnly/Strict/Path=/、生产配置 Secure、无 Domain，成功及恢复 no-store。原 actor、capabilities、allowed_space_ids 保留；普通身份不能 mint actor，observer 无写权，另一个空间真实 context 返回隐藏存在的 NOT_FOUND；agent/service 登录 403 且无 Cookie。合法 contributor 发帖 201，DB author 为原普通身份。登录/恢复/拒绝均不创建论坛 diagnostic session、post、event 或幂等记录。
2. 已发 Cookie 随当前持久权限失效：管理员 HTTP 撤 credential 后 401；私有 DB 到期 fault 加受控时钟后 401；HTTP 撤会员后真实 context 404，认证恢复仍 200 且 visible_spaces 为空；随后私有 DB actor disable fault 使 Cookie 401。没有伪造新身份或诊断 session。
3. 无效替换 token 保旧 Cookie 可用；目标 credential 的八个活会话满时，跨 credential 替换 429/Retry-After=1，无 Set-Cookie，旧与八个目标 Cookie 均保持。绝对 TTL 的 deadline−1ms 可用、deadline 不可用，读取未续期；重建 app 后 Cookie 401，而同原 Bearer 仍 200，业务 DB 数量不变。
4. Host/Origin 错误或重复、畸形/重复/超长 Cookie、缺/错/重复 CSRF、Bearer+Cookie 双身份，真实业务写均 400/403 且业务 DB 无变化；无权限 Cookie 请求不能借 CORS/SameSite 绕过 ACL。失败注销保 Cookie 可用。修复后根 POST/GET/DELETE 未知 query 均 400，DELETE 非空 body 400 且原 Cookie 随后 GET 200；合法注销 204/no-store/Max-Age=0，旧 Cookie 401。捕获日志不含 token、cookie secret、CSRF 或畸形 cookie marker。
5. 实际 sharedclient 经私有 HTTP proxy 访问真实服务。登录 Authorization 仅本次 human token，GET/DELETE 不发 constructor 默认 Bearer，DELETE CSRF 取当前 resolver。代理先让上游提交，再返回 503：POST 和 DELETE 各只一次，DELETE 响应丢失后真实恢复 GET 401 证明注销已生效；不因 maxRetries=3 重做 mutation。另一次在已进入 proxy 的 POST 挂起 barrier 后取消，返回安全 UserAbortError，连接 close barrier 到达且无额外业务提交。代理显式注入 Node 不具有的 Cookie/Origin/Host，属于测试载体，不冒充浏览器 cookie jar。
6. Web disabled 时旧 Bearer 读取/实际发帖成功，根认证不可用且无 Cookie。显式 http loopback 模式的响应仅去除 Secure，保 HttpOnly 等属性。实际 built CLI 对 external HTTP、未 opt-in loopback、非根 path、userinfo、insecure origin 配非 loopback bind host 五种配置均自然非零退出；未 kill 当完成，没有创建目标目录，也不输出私有配置 marker/目录。
7. 登录独立预算：22 个不可信 Origin 不扣款；可信缺凭据、非法正文及失败 token 共20次均计费。合法请求随后 429/Retry-After=1、无 Cookie/DB业务变更；受控 +499ms 仍429，+1ms只放行一次201，再次429。原 Bearer 读取仍可用。没有睡眠猜测 refill。

## 首失败、根因与修复

所有首失败保留，未把环境/fixture 错误写成产品失败，也未用重试抹平真实反例。

- 新 test noEmit 首次 exit2/1.377s，唯一 TS2345 为 hostile header 数组推断带 optional undefined；只修独立 fixture 的显式类型，最终 noEmit0。
- 首次7例 exit1/1.467s 全部 seed 400：独立 fixture 漏必需 Idempotency-Key，补 fixture；后续默认沙盒 exit1/1.446s 全部 listen EPERM，业务未开始。获准私有 loopback 后实际首轮 exit1/2.306s、5通过/2失败。
- 该轮一个 fixture 使用不存在的 GET space 路径，改为实际 context；另一例是**真产品漏项**：POST unknown query400，但 GET unknown query200、DELETE 非空 body204。原实测见 [反例](root-auth-first-counterexample.json)；原 Cookie 随 bad DELETE 的状态当轮未测，不能补称旧401实测。父裁定后 A/B 最小修复共享严格 query/body policy 与 POST absent-body 例外；最终独立7/7真实证明 bad DELETE 不撤 Cookie。
- 首 full 的三失败来自旧 fixtures 只捕捉 Web-disabled `/api/v1/`，却把新增根路径及 `servers` 元数据都枚举为 API operation。B 获准仅修两旧文件的覆盖域与方法枚举，API-v1 双向覆盖和每个原断言保留，root auth 由新协议/server/独验覆盖。原失败与必要复验均保留，未通过放宽产品约束消除失败。

## 独立源码审查与保护项

服务层以随机32bytes base64url Cookie 的 SHA256 为 map key，原 actor/credential 为上下文，TTL/1000/8 配额在 core 判断；Web 会话与 SQLite diagnostic session 分离。成功验证新身份与容量之后才删除旧会话，失败不踢活会话；get/authorize 重新查持久凭据/actor，后续空间访问继续原 core ACL。close 清内存。实例1000界限与配置约束核源码及全套 core 测试，独立真实 HTTP 容量反例选每 credential 的8槽，不冒称发过1000次登录。

HTTP hook 先设置 auth/cookie no-store、核可信 Host/精确 Origin，POST 的独立预算在 parser/schema/credential 前恰扣一次；不可信来源不计费。Cookie/header 解析查 rawHeaders 重复、边界及固定格式；business Cookie mutation 必须 Origin+CSRF，并拒混身份。GET/DELETE root 明确 query guard；DELETE body 拒绝在 logout 前。POST attachValidation 现在仅在 body===undefined、validationContext=body、唯一根 object type 错误时放行，其他错误拒绝，query另先检查；无宽吞验证错误。CLI origin 与实际 insecure bind host 先验在 mkdir/listen 前。library caller 仍需确保实际 listener/反代满足部署边界，不能以本包 Node 内部 listener 冒称生产 HTTPS。

protocol DTO/query schema 与 OpenAPI 唯一共享；OpenAPI 只给有效 HTTP 操作加旧 policies，未污染 path-level servers。client 复用 executor 的 root auth 路径/标准错误/abort，POST/DELETE retryBudget=0、cookie credentials=same-origin；browserSession 阻止默认 Bearer，unsafe 当前 CSRF 从 resolver 获取。artifact upload 沿同 executor，download/export 只追加授权 cookie credentials/headers。未引 Node 到 browser client、持久保存凭据或复制业务 ACL。

最终 [integrity](integrity-before-metadata.json) 核 A11/B10 产品+作者测试冻结及 B2旧fixture 冻结全部匹配，新独立文件冻结未变。基线280项现288项：授权**16处改变、8处新增**，合计24路径精确等于 A11+B10+D1+获准旧fixture2，无删除或额外产品/config/test变化。旧 review **6487/6487**、SQL/archive4、schema/profile2、pnpm lock、HEAD、当前56文档及5mutable入口均不变。dist 因实际 build 变化：tracked34项改变；untracked16项改变、16项新增，精确路径见 integrity；不能声称 dist 字节保持。

未 install、读用户凭据、改全局配置、调用模型、commit/push/publish。当前本机 Node26.3.0 结果不冒称 Node22 或远程 clean CI。下一必要包 **M5.1-B 实际 Web UI** 应复用本包 client 实现登录、空间/主题/帖子读取、发帖与可靠退出，并用 generation+abort 防晚响应回填；真实浏览器再验 Cookie/Secure/SameSite/CSRF、凭据仅暂存内存、内容渲染与 DOM/XSS，不以 Node 代理代替该旅程。当前 metadata 入口尚未改，由父验收后指定收口。
