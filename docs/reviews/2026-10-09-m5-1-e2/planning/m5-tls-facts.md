# 原生 TLS 接点事实（2026-10-09，只读）

E2 B6 继续冻结；本轮没有生成证书、读取现有证书、启动 TLS、安装或运行容器。以下是决策输入，不是公网 TLS 验收。

## 官方 API 与安装事实

- 已安装 Fastify **5.12.5**，从 `packages/server/node_modules/fastify/package.json` 核定；根 node_modules 无 Fastify 直连，首读取失败后改从实际依赖包读取。其 `fastify.d.ts:67–71` 的 HTTPS overload 接受 `https.ServerOptions | null`。
- [Fastify 官方 Factory](https://fastify.dev/docs/latest/Reference/Server/#https)（查阅 2026-10-09，页面 latest=5.12.5）：`https` 配置交给 Node TLS socket，省略/null 保持 HTTP；设置 https 后 `http` 配置被忽略。因此现 `http:{maxHeaderSize:65536}` 不能在新增 TLS 分支时丢失，HTTPS options 也需保同 header 上限。无需 HTTP2/serverFactory/trustProxy。
- [Node 22 官方 TLS createSecureContext](https://nodejs.org/docs/latest-v22.x/api/tls.html#tlscreatesecurecontextoptions)（同日）：PEM cert/key 支持 Buffer；cert 链含 leaf 与按顺序 intermediate，不把 root 放进服务链。可在监听前用 `createSecureContext({cert,key})` 验 PEM/匹配；这不证明 SAN、有效期、信任链或公网可达。encrypted key/passphrase、自动续期/热换证书均需另裁，不能暗加密码来源。
- 本机 `/opt/homebrew/bin/openssl` 仅公开 `--version` 输出 OpenSSL 3.6.4（25 Aug 2026）；没有读证书或执行生成命令。

## 现实现与最小接点

- `packages/server/src/app.ts:63–82,129–145` 已有 Web config/assets 前置解析，Fastify 未配置 https，logger=false/requestIdHeader=false；可选显式 cert/key Buffer 可在同 factory 根添加，旧调用无 TLS 时保持 HTTP API。Fastify raw server/request 类型随 HTTPS overload 的推断需实际 source noEmit 确认，不能靠任意 cast 绕过。
- `packages/cli/src/index.ts:315–356` 的 serve try 前半解析 web/assets/shutdown/quota；到 `dataDir/ assertDataDirReady/mkdir` 才开始目录操作，随后 acquire lock/open DB。新 TLS flags 配对、私有文件读取及 secure-context 预检可以放在这段配置解析内、mkdir 前；不得拖到 buildApp/listen 后才报错。启动 URL 当前是 http，TLS 分支需准确 scheme，不输出 cert/key 内容或 raw FS/OpenSSL cause。
- `packages/server/src/web-auth.ts:5–12,22–26,38` 已严格 origin、exact Host/Origin、Https origin 的 Secure cookie；无需放松为 forwarded headers。当前 `allowInsecureLoopback:true` 与 HTTPS origin并未互斥，HTTP origin仅允许显式 loopback；CLI还拒 HTTP Web 配非loopback监听。父需决定新 TLS 与 insecure flag 的明确互斥、TLS Web 要求 https origin、以及 TLS 仅Bearer API无Web是否允许；避免TLS listener与HTTP cookie配置混搭。无TLS+HTTPS origin目前可为外部终止预留，是否保此兼容不能由本任务自动删除。

## 文件与安全复用边界

- 候选：server app.ts/新窄 TLS-config helper+index、CLI serve flags/配置接线、专用契约测试与部署指南；无 protocol/SQL/客户端证书旁路需求。具体所有权由父定。
- `client/src/local-token.ts` 有同FD O_NOFOLLOW|O_NONBLOCK、regular、max+1有限读取、前后 stat、finally close 与固定错误的可参考模式；其 UTF8 trim/内部空白规则专属 token，**不能直接拿 token resolver 读 PEM**。TLS helper需独立二进制有限读取，证书/私钥大小上限待裁；建议私钥0600但不擅改用户权限/owner策略，也不声称祖先alias/同UID恶意修改被解决。
- CLI已有真实 `DetunedError(VALIDATION_ERROR,固定文本,400)` → exit2 与 `CliSafeError` 安全 renderer；所有加载/crypto失败在本地转换固定消息，不能透传 Error.message/path/key/stack。TLS handshake错误也不能把原始native诊断当请求日志。无自动 trustProxy、X-Forwarded、TLS verification disable 或系统信任库操作。

## 后续有限验收候选（未执行）

自有私有临时 CA + SAN localhost/127.0.0.1 leaf/key；仅受控子进程显式 CA 与独立浏览器私有信任机制，先确认该机制实际验证链/hostname，不能用 ignoreHTTPSErrors 冒称信任通过，不写系统/用户信任库。验 HTTPS health/API/Web登录与 Secure/HttpOnly/SameSite/CSRF、Host/Origin正反例、证书错误/不配对/缺文件/软链/FIFO/超限在mkdir前安全拒绝、旧HTTP loopback/Bearer兼容与标准SIGTERM释放。浏览器信任注入具体接口、最小TLS版本、证书期限/SAN前置检查、encrypted key支持与公网运维/续期由父另选；当前未验证。

## 追加：未形成 HTTP 的连接与关闭类型（同日只读）

- Detuned 自有 RuntimeResources 只登记 route/流资源，`app.ts:146–148` beginDraining→beginClosing，preClose 等 waitForIdle；未见 raw `connection` socket Set 或 `secureConnection`/未完成 handshake 登记。不能把 route idle 等同所有 TCP/TLS 已退净。
- installed Fastify `lib/server.js:127–140` 在支持 Node closeIdleConnections 时默认 forceCloseConnections='idle'；`fastify.js:384–416` 先跑全部 preClose，默认原生 factory 再调用 server.close。只有显式 forceCloseConnections=true 才调用 closeAllConnections；当前 Detuned 没有设置它，也没有自行强销 socket。其 keepAlive Set 在当前 Node 的 closeAllConnections 存在时不是全 raw TCP 跟踪。
- [Node HTTP 官方 close/closeAllConnections](https://nodejs.org/api/http.html#servercloseallconnections)、[HTTPS 相应 API](https://nodejs.org/api/https.html#servercloseallconnections)（2026-10-09查阅）：close 停接新连接并收 HTTP idle；closeAll 是强制关闭已建立 HTTP(S)，不含升级协议。API文案不承诺未完成 TLS 握手 socket 已进入 HTTP tracker；因此不能据此声称 raw TCP→TLS 无字节握手已被覆盖。首次尝试 Node22 HTTP/HTTPS文档 URL 读取工具失败，改当前官方文档核API，未改变产品。
- CLI `index.ts:387–404`/`serve-shutdown.ts:19–28` 的 referenced 整体 deadline 涵盖 await app.close→db.close→releaseStrict；重复signal复用任务不重设预算。若 raw socket 拖住 app.close，计时到期固定诊断 exit1，**不进入 DB close/锁 release**，故有界非零退出安全性仍在，但不能宣称TLS加入后所有正常raw连接都可exit0退净。同步native不能被timer硬抢占；库宿主仍须自有预算。
- 必要真实测试：net.connect到TLS端口但不发任何ClientHello，确认connect后SIGTERM；并测完成TLS但不发HTTP、HTTP半头、正常在途poll/upload。记录exitcode/耗时/socketclose以及DB/lock阶段顺序，测试client不得提前close掩盖server缺口。现任务未执行这些实验。
- 若目标要求上述raw连接正常清退，候选窄增 server app.ts 或专用 socket-lifecycle.ts：从原生server connection开始记录、close时删除，停止接入后的未进入业务socket可销毁并等待真正close；须避免在route finally完成前强销所有业务连接，也要处理preClose期间新接入竞态。不是把forceCloseConnections=true当未握手覆盖的无证保证；实际实验后父裁最小实现。CLI预算与既有DB/锁顺序不能提前放宽。
- 工厂类型：`buildApp():FastifyInstance` 当前默认raw类型为HTTP，HTTPS overload真实raw为 https.Server；应显式提供 HTTP|HTTPS 的可见raw类型/合理重载与对应 route/plugin类型，而非把HTTPS cast回HTTP。CLI当前 `let app:any` 也掩盖该检查，应在新任务列明确typed返回/接线。是否统一 union泛型可由source noEmit判定；本轮不造类型代码。两种factory都须明确maxHeaderSize65536（HTTPS分支不能只保被忽略的http字段）。
