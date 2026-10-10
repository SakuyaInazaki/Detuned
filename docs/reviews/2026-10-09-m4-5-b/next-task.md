# 下一任务：M5.1-A 同源 Web 认证与 sharedclient 基础

父已确定下一包范围：FR-10/T11，先交付真实Web可消费的认证协议和共用客户端；紧接M5.1-B实现React/Vite实际登录、空间、主题、阅读、发布与退出。当前M4.5-B已由父接受，证据以本包README/verification最终结论为准，不复制计数，也不以有限宿主证据冒称完整模型认证。下一包fresh完成前不实施，不新增SQLite版本/迁移/依赖或锁变更。

## 业务会话与身份

- core业务层持有进程内有界opaque Web认证会话：30分钟绝对TTL、不滑动，实例最多1000、每credential最多8。清理过期；容量满429，不静默踢活会话；重启须重新登录，shutdown清空。
- cookie secret由32随机bytes base64url生成，仅存其SHA256；关联原actor/credential，每请求重新核credential撤销/到期、actor禁用。原空间ACL继续core判断，human保原read/write/admin范围但不得扩权；agent/service拒。
- 这是Web认证状态，不是论坛诊断session，不伪造SQLite行/event或新身份。注销阻止后续准入，已准入/已提交业务不承诺回滚。

## HTTP 唯一契约

路径在 `/api/v1` 之外；标准success/error与现公共错误语义复用。

- `POST /auth/session`：仅human Bearer登录；无body或空对象，未知属性拒。可信Host与精确Origin必需。201 success data=`{me:现GET /me的data,csrf_token,expires_at}`。设置 `detuned_session` cookie：HttpOnly、SameSite=Strict、Path=/、无Domain，生产Secure。先成功验证新token才撤旧cookie关联会话；无效登录不能撤旧。
- `GET /auth/session`：有效cookie查询，同形200，用于刷新恢复CSRF。旧cookie被撤后401。
- `DELETE /auth/session`：有效cookie、精确Origin与 `X-Detuned-CSRF`；204撤销并清cookie。重复/畸形/超长Cookie或CSRF有界拒，不默选冲突。
- 正常API同时带Bearer和detuned_session则400；没有cookie的原Bearer调用兼容。GET类cookie请求可没有Origin；若有则精确匹配。cookie变更必须Origin+会话CSRF，缺/错403，不只依赖SameSite。
- Host严格比较配置webOrigin的authority，不信X-Forwarded；开启Web时入口应用Host白名单与明确同源CORS，任意browser origin（含匿名/无效cookie）都不能进入业务。无Origin的Bearer CLI/MCP保持。
- auth端点及cookie响应 `Cache-Control:no-store`。日志不得含cookie/session secret/CSRF/token；CSRF只需JS内存，不落持久客户端存储。

## 显式配置与登录节流

Web默认disabled。composition root显式 `webOrigin` / `allowInsecureLoopback`，CLI `--web-origin` / `--web-allow-insecure-loopback`；core业务不读env。

origin须是单个完整origin，无userinfo、非根path、query、hash。HTTPS正常；HTTP仅显式开启且hostname严格localhost/127.0.0.1/[::1]。不自动trust proxy；反代外层须保持可信Host，本包不新增代理支持。Web未开启时原Bearer契约保持。

登录另有全实例有界120次/分钟、burst20预算，失败也计费；429标准Retry-After。不建无限IP map，不假称匿名登录已被actor写桶保护。若复用当前整数桶须核清准确计费/ClockPort/容量语义，不改变已接受actor节流。

## sharedclient

独立显式browser session API与CSRF transport选项，复用原错误信封/timeout/abort；不全局改fetch，不引Node。Bearer默认行为不变；token登录只放本次Authorization，不写client常驻token/defaultheaders。复用executor访问 `/auth/session`，不要复制整套网络框架。

登录POST与注销DELETE均single attempt，不自动重试：创建会话无幂等key，复用transport不等于继承mutation重试。cookie业务请求默认credentials same-origin，写入携当前CSRF。后续UI以generation+abort防止logout后的晚响应回填；此包协议不承诺回滚已提交写入。

## 文件与角色

父继续编排/验收，gpt-6.1-sol子Agent实现。实施前核一次当前实际组合根/鉴权入口并冻结精确文件清单：

- A：core Web会话/鉴权业务、server同源cookie/Host/CSRF接线、CLI显式配置与新规则测试；不得把业务复制到HTTP/CLI。
- B：protocol唯一DTO/schema/OpenAPI、client browser API/transport与新合同测试；无Node进入browser。
- D：独立真实HTTP安全矩阵、完整门禁与旧证据保护；父最终验收。
- docs04/07与新ADR同步当前契约；SQLite schema2、SQL/archive/旧审查/历史fixture保持。机械新增模块不造未来空框架。

## 必要验收与边界

1. 真实SQLite普通human contributor/observer和不可访问空间；human登录不扩权，agent/service拒，credential撤销/到期、actor禁用、成员撤权在后续请求立即生效。
2. 会话更换先验证新token；失败保旧；TTL/实例和credential容量/重启/关闭清空。标准429/Retry-After与失败登录计费，Clock受控不sleep猜时序。
3. Host/Origin/CSRF、Bearer+cookie混身份、重复/畸形/超长cookie/header、安全日志探针；不以CORS/SameSite替代core授权。
4. sharedclient真实HTTP正反、取消/timeout/错误、只本次登录Bearer与cookie写CSRF；旧CLI/MCP无Origin Bearer回归保持。
5. Node真实HTTP足以验证本包协议。真实浏览器cookie/DOM/XSS旅程留紧接M5.1-B，不把本包叫完整Web完成。

复用统一4 gates与必要旧current探针/现已批准适配入口；不默认关闭已有rate/quota来抹平seed，不运行模型。每次先fresh、保首失败、作者有限source checks，统一build/full由D独立窗口；不得推送、部署公网或写用户全局配置。具体已有契约冲突向父列事实裁定，不自行改冻结路线。

## M4.5-B 后的开工落点补充

父已冻结M5.1-A，fresh之后实施；当前实现状态以本包README与父接受结论为准，不预填M5通过。事实见[落点报告](planning/m5-auth-implementation-facts.md)。直接复用AuthService.authenticateToken/refreshContext；现GET/me只读data窄提共享供GET/me、POST/GET auth session三入口，保持原展示/权限语义。匿名login用新service私有独立单bucket整数120/min burst20，不伪造actor、不重构旧WriteRateLimiter。auth endpoints OpenAPI path-level servers根 `/` override，旧/api/v1与旧policy不变；auth路由策略不能统称anonymous。POST/login与DELETE/logout singleattempt，不因复用transport获得mutation自动retry。新安全错误仅普通信息，不含ID/token。

A拟core/server/CLI，B protocol/client，D独立安全与统一gate；父一次冻结精确文件接口后执行。M5.1-A仅Node真实HTTP协议，随后立即M5.1-B React/Vite登录/空间/主题/阅读/发布/退出与真实浏览器cookie/DOM旅程。M5计划尚未实施，不当当前Web可用。
