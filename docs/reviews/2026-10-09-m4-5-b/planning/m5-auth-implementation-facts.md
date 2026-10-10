# M5.1-A 实现落点事实（只读，未实施）

沿上包 `planning/m5-1-a-task.md` 已冻方案；本报告不增加路线或宣称浏览器验收。

- A拟core：新 `services/web-session-service.ts`（有界opaque session/TTL/credential关联/关闭）；`services/auth-service.ts` 必要窄复用、core index导出。AuthService构造参数为storage/hasher/clock/optional write limiter（:25）；`authenticateToken(rawToken:string):AuthenticatedContext`（:32）检查hash、credential撤销/到期与actor禁用；`refreshContext(auth):AuthenticatedContext`（:80）按credential.id/actor.id重新加载，可直接用于每cookie请求，保core空间ACL。
- 现WriteRateLimiter只公开`admit(actorId)`并维护按actor map（write-rate-limiter.ts:54）；不能把匿名login塞伪actor并称actor写桶。可提取/复用其整数补充算法做独立单bucket（固定120/min、burst20、失败也扣），不共享actor额度、不新增无限IP map；确切helper结构由父开工冻结。
- A拟server：`app.ts`、新`routes/auth.ts`、窄`web-auth.ts`（Host/Origin/cookie/CSRF输入边界）；`routes/meta.ts`把现me data构造提到core服务或窄共享读取函数，避免login自行复制权限规则。当前me(:28–49)用storage.listVisibleSpaces(actor.id,100,undefined,credential.allowed_space_ids)+membership角色；visible_spaces仅100展示，不授权白名单。
- 当前app(:252–270)全局preHandler按ANONYMOUS_HTTP_ROUTES跳过，其他强制Bearer；新/auth/session必须在/api/v1之外注册、由明确auth端点分支处理，不能将POST login当无认证普通业务。cookie业务身份由同hook解析；混Bearer/cookie在此前拒400。请求write query preValidation仍应保持。
- 当前app(:167)裸`register(cors)`；启Web的精确Host/Origin约束应onRequest先于业务与preHandler，CORS改明确同源；Web disabled保原契约。Proxy headers不能替代可信Host。app(:135)draining gate已覆盖新authpath，preClose应清会话但不扩B2资源协议。
- 当前安全日志observability.ts(:14–24)只记route模板/状态/error_code/可信actor id，不记录headers/body/cookies；沿用足够，新增auth不得把token/CSRF/session secret挂可序列化日志字段。no-store/cookie处理属于新route，不修改旧返回。
- A拟CLI：`index.ts` serve flags与buildApp注入（:289、:376）；必要新纯web配置resolver可置server/root，业务不读env。--web-origin/--web-allow-insecure-loopback在mkdir/listen前严格拒无效配置。
- B所需protocol：复用已导出`MeResponseSchema/MeResponse`（actors.ts:42）；新增auth session data/envelope与配置type、OpenAPI之外根auth路径表示；A不自造另一Me schema。现success各route返回{api_version:'1',request_id,data}（meta.ts），POST/GET按此；DELETE204无信封。
- B/client auth transport必须显式root路径（非/api/v1），login/DELETE singleattempt；A不碰client默认Bearer/retry或八工具。
- protocol/request-policies.ts:29现匿名路由仅capabilities/live/ready；新auth应明确区分端点策略而非把GET/POST一概anonymous。OpenAPI rootservers目前/api/v1（openapi.ts:68），新增/auth/session需要准确server override/root路径，不能误广告/api/v1/auth/session。
- 本次有限rg未见固定HTTP operation总数约束；八工具数量是现contract，auth新增不应触及DETUNED_TOOLS。完整operation计数相关测试由下包B/D核，不据本次窄查保证没有。

待父仅冻结具体小模块接口/错误细节/新test所有权；已知冲突为裸CORS、全局Bearer hook和OpenAPI base path，均需按既定Web方案显式接线，不改变业务权限路线。未测试、未安装、未读取用户配置；当前M4.5-B产品freeze保持。
