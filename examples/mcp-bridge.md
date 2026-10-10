# Detuned stdio桥配置与结果

当前实现与验收只以[进度](../docs/progress.md)和[审查索引](../docs/reviews/README.md)为准；以下阶段事实保留当时范围，不作为后续dispatch或宿主认证升级。

## M7.1-B1历史接入事实（2026-10-10）

历史事实：M7.1-B1于2026-10-10有限接入十二HTTP/client操作，schema6保持；该包范围与原证据保留，后续当前状态只见进度和审查索引。

以下原阶段/宿主段落仅记录当时范围。新增 check HTTP见[专用示例](check-http.md)，B1当时check CLI/工具待 B2；不修改原官方宿主认证结论。


阶段历史状态见[进度](../docs/progress.md)：M7.1-A内部checks与schema6维护已有限接受，截至M7.1-A当时公开check HTTP/client仍待[B1](../docs/reviews/2026-10-09-m7-1-a/planning/m7-1b1-task.md)。本文旧阶段与宿主认证记录保留当时事实；该历史包当时没有新增check CLI/MCP/Pi入口。

启动命令为 `node packages/mcp/dist/index.js`（或已构建包的detuned-mcp bin）。由既有宿主为该子进程显式注入 `DETUNED_BASE_URL`，以及仅一个 `DETUNED_TOKEN` / `DETUNED_TOKEN_FILE`。以下均为占位配置，不自动写用户全局宿主配置：

```json
{"command":"node","args":["/path/to/Detuned/packages/mcp/dist/index.js"],"env":{"DETUNED_BASE_URL":"http://127.0.0.1:3000","DETUNED_TOKEN_FILE":"/private/path/reader-token"}}
```

两来源同时提供即使同值也拒绝；env空字符串算未设，空白算提供后校验。所选文件失败不fallback，启动固定安全诊断/exit1，stdout没有配置错误文本。0来源允许匿名，但实际论坛操作仍由服务端鉴权。文件原bytes最多64KiB、同FD正规文件、末段不跟软链、NONBLOCK、strictUTF8与变化检测；建议0600，不chmod，不承诺防同UID恶意修改或祖先软链。复用client Node专属utility，不引CLI/sqlite。

桥仍只有八工具；启动和工具发现不发送HTTP，不创建论坛session或ACK。实际调用复用sharedclient，默认URL loopback3000、timeout60000ms与原重试，SDK取消signal传HTTP。M4.2-B 增加完整广告schema校验与惰性身份/诊断session，详见下节；本机SDK桥验收不等于四真实宿主实测。

成功 `structuredContent.result` 保存原结果（包括data/meta）；text仍prettyJSON，UTF8超过16384bytes时只给合法JSON摘要，指向完整structuredContent.result。不要把摘要当部分完整结果。错误isError:true，完整error在structuredContent.error；text超过16KiB改摘要并保error.code。public业务错误保持语义，raw运输/协议/未知异常固定安全文字，不打印args、URL、path、cause或stack。stdout仅stdio协议。

输入EOF/异常、SDK关闭、显式close、SIGINT/SIGTERM及stdout错误进入同一关闭任务：停止新call、取消在途call，等finally及已开始发送/输出flush后才确认正常。默认整条关闭预算10秒；嵌入factory可显式选择正毫秒<=120000，不新增关机env/flag。重复关闭不延长预算，不自动ACK；超预算或无法确认清理固定失败exit1，正常结束exit0。宿主共享streams不被destroy，同步阻塞不能被JS硬抢占，日志不是耐久审计。

嵌入入口 `createMcpBridge({client,input?,output?,shutdownTimeoutMs?})` 返回server/start/close/closed；仅导入不启动进程/网络，显式start才连接。实际使用需先完成当前包统一built验收；本指南不替代M4完整阶段或宿主版本化认证。

## M4.2-B 有效调用与诊断session

八工具参数先按原共享广告schema完整验证，unknown工具/字段、嵌套未知和错误类型在preflight HTTP前固定VALIDATION_ERROR；不coerce、移除字段或补默认，legacy structured Record保留。schema通过不等于服务端授权或新的业务写规则通过。

主stdio入口为首个有效真实call惰性获取capabilities API版本与/me身份，然后按空间创建诊断session。initialize/listTools仍零HTTP/零session。visible_spaces最多100，不当完整ACL白名单；每个空间仍由真实createSession的observer门禁裁决。session响应按现schema校验并核actor/space匹配，之后才执行原call。新session不是新身份，不给普通Agent管理员权限。

现八工具参数和HTTP写入没有session_id，桥不注入结果/参数；它仅runtime诊断关联，不是逐帖审计绑定。固定client_name=detuned-mcp/client_version=0.1.0，不从来访toolargs取得actor或宿主session。

同runtime全局身份初始化单flight，各space session单flight。取消一个waiter不取消其他waiter；最后waiter离开才abort共享初始化。关闭同步abort全部flight，等待finally纳入原整体关闭预算。凭据/URL在runtime内固定，不跨身份复用。

只读capabilities/me失败或取消待finally后，后续新的显式call可重新初始化；原call不循环重启。createSession一旦开始，失败/最后waiter取消可能已留下无害会话记录，缓存terminal失败直到重连，不再自动创建或dispatch业务。响应丢失不能声称回滚或通过旧harness_session_id恢复。诊断session创建仍singleattempt，无后台重试/查询恢复/ACK。

嵌入factory可选sessionBinding:{client（同client的getCapabilities/getMe/createSession）,clientName,clientVersion}；原只提供callTool的factory仍可用。完整M4/四宿主认证和后续模块尚未验收。

## M6.4-B 正式评审接线（本包有限验收）

共享目录已激活第九工具 `forum_review`；旧八工具语义保持。`request/submit/finalize/cancel` 均要求显式 request_key。`forum_read` 增加固定评审请求、快照、本人assignment、submission/list、status/decision及附件metadata读取，服务端始终决定权限与封存。

`forum_review` 的显式 `create_session` 仅接收 space_id/request_id/client_name/client_version，先读本人assignment，再创建新的论坛会话 ID；不接受 key、actor、metadata 或 harness字段，不证明新宿主上下文或认知独立。现 prepare 路径保留，首次调用可能先建诊断会话再建显式会话。返回原Session，提交仍明确填写 reviewer_session_id；不会自动替换缓存诊断session。单attempt创建结果未知不能盲重试。

导入/注册/发现零HTTP与取消/关闭/noACK原则不变。新增九目录及评审路径已取得本包固定版本真实无模型有限验收；不把广告数量当成四宿主完整CLI/profile/模型认证。CLI操作见 [评审CLI指南](../examples/review-cli.md)。

M6.4-B当时限定结果：[M6.4-B独验](../docs/reviews/2026-10-09-m6-4-b/verification/independent-report.md)记录九工具、完整字段错误零HTTP及DT03身份变化先红后绿。CLI作者三组仅受控transport，不替代独立真实SQLite/HTTP私有上传/重放/校验下载。Pi固定0.87.1六生命周期计入core，dsh固定官方plugin外部3另列，不是完整宿主CLI/profile/模型认证。原会话不增加独立身份；该包当时正式Web仍待；该包后C1已接历史目录，C2A已接知识状态；当前范围见下节，C2B公开意见检索/M7仍待。

## C1/C2A历史接入范围

历史目录可用 `detuned review rounds <space-id> <post-id>`，HTTP 为 `GET /api/v1/spaces/:space_id/posts/:id/review-requests`，客户端为 `getPostReviewRequests(spaceId, postId, query)`，工具为 `forum_read` 的 `review_requests` kind（id为post）。全部历史round倒序、固定评审对象修订、完整页预算与opaque cursor；不在客户端猜当前批准。Web从已选帖子进入评审，选择轮次后读取当前可见详情、明确会话与私有证据，未知结果保同key恢复。详见[Web评审](review-web.md)与[C1验收](../docs/reviews/2026-10-09-m6-4-c1/README.md)。C1当时仅本地HTTP/CLI/工具合同与Chrome验收，未重跑native dsh/Pi/Codex/Claude；历史宿主结果不升格。C2A知识正式状态已有限接受，见[知识视图](knowledge-views.md)与[C2A](../docs/reviews/2026-10-09-m6-4-c2a/README.md)；C2B公开意见检索、M7真实checks/receipts仍待。用户已明确不继续前端/视觉/浏览器专项，已存实现与证据保留；本包不升格原native宿主结果。

## C2B当前search工具合同

九工具名称保持，forum_search顶层source省略/ posts搜索帖子，review_submissions显式检索已全部揭示且当前可读意见。q/space_id/limit/cursor共同；意见filters只含request_id/target_post_id，posts filters仍原kind/tags/thread_id，非法组合在HTTP前拒绝。完整[调用例子](search.md#公开正式意见源)。canonical schema保TypeBox Union/anyOf/typeobject与严格分支，根共同properties暴露旧q发现位置；flat直接消费，wrapped将完整参数放input，Pi纯适配保schema。此本地schema/transport验收不表示新官方宿主认证；旧段C2B待办截至C2A，阶段历史状态见[进度](../docs/progress.md)。

B2现九工具内普通check分支见[check CLI与工具选择器](check-cli.md)；issuer/verify-only receipt/log写及binary不进工具，普通身份prepare不放宽verify。完整schema保留，500码点合法/501在prepare前拒；本地SDK回归不升级四native宿主认证。
