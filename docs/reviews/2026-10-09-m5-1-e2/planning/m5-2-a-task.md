# M5.2-A：单服务原生 TLS

状态：父已冻结方向，**待 E2 验收、文档闭合及下一包 fresh baseline 后实施**。事实输入：[TLS 接点](m5-tls-facts.md)、[部署现状](m5-deployment-facts.md)。本任务书不声明 TLS 或部署已完成。

## 行为与兼容

server 增加可选显式 TLS 配置（cert/key PEM bytes）；CLI `serve --tls-cert-file FILE --tls-key-file FILE` 必须成对，API-only TLS 允许。无 TLS 时保现 HTTP，现 HTTPS-origin 的外部 TLS 终止路径也保持。TLS 配 Web 时要求 https origin；不自动 trustProxy、信任 X-Forwarded、跳转 HTTP 或引入代理。https 下已有 allowInsecureLoopback 即使冗余也不降低 Secure cookie，不能为它破坏兼容；HTTP origin/监听的 loopback 限制保留。

独立有限二进制 loader 每文件最多 1 MiB：sameFD O_NOFOLLOW/O_NONBLOCK、正规文件、max+1 有界读取、前后 stat、finally close。不能用 token trim/UTF8凭据规则解析 PEM，不 chmod、不选默认用户证书。CLI 在 mkdir/lock/DB/listen 前加载并 createSecureContext 验证 pair；App 直接接 bytes 也前置验证并复制受信快照。所有失败固定安全文案，不透传路径/native诊断/key。仅支持未加密 PEM，不加 passphrase 来源、自动续期或热换；预检不是 SAN/expiry/公开信任认证。

HTTPS factory 保 `maxHeaderSize:65536`（不能只留会被忽略的 http 配置），最小 TLS 1.2。HTTP/HTTPS raw server、返回值、routes 与 shutdown 类型须真实表达，不新增 any 或把 HTTPS 伪 cast 成 HTTP；启动诊断 scheme 正确。出现其它 route 类型文件必须改时先报具体路径/原因，经父批准才扩。

## 关闭生命周期

TLS 纳既有默认 10 秒/可配整体 shutdown budget。允许 app 或私有 helper 内 TLS 专属窄 socket tracking/drain：从原生 connection 覆盖未完成握手，close 后去登记；停止接入与已有连接清退的准确次序先核真实源码。raw TCP 只 connect、不发 ClientHello，正常 SIGTERM 不能等 native 120 秒握手超时。业务仍先同步 cancel 全部，再等待 route finally/显式资源释放，app.close 完成后才 DB close、严格锁释放；不能为销 socket 提早破坏业务 finally。超时/阶段失败非零，不把预算退出记作 clean。旧 HTTP shutdown、listenfail、重复 signal 同一任务/不重设 deadline 保持。

## 初始所有权与实施窗口

- A：server app/config helper、TLS socket helper及真实 raw 类型、必要新 server 正式契约测试。初始真实路径以 `packages/server/src/app.ts`、新窄 TLS helper、必要 `server/index.ts` 导出为候选；不任意改全 routes。
- B：`packages/cli/src/index.ts` 的 flags/前置 binary loader/安全诊断接线与新 CLI 契约测试；必要 helper 和具体测试文件名在 fresh 后由父最终列明。安全 loader 可由 A/B 选唯一 owner，不重复实现。
- D：独立真实 TLS/浏览器/关闭反例、单一相关 build/type/lint/test/current gate 窗口与最终核验；不与作者并跑全量。
- fresh 先于实施，保 exact-before、所有首失败与最小修复。作者仅必要源定向/noEmit，最终 freeze 后交 D。无新运行依赖、SQL/schema、客户端策略、模型或全局配置变化。

## 有限真实验收

1. owned 私有临时 CA + SAN localhost/127.0.0.1 leaf/key；Node 受控子进程显式信任此 CA，同时验证 hostname，错误 CA/错误 hostname 必须失败。所有证书/key 仅临时、不提交、不读用户 key。
2. 浏览器不改系统/用户信任库；可仅对自有 leaf SPKI 使用启动 allowlist，记录这是测试信任例外，不能用 ignoreHTTPSErrors 全豁免或声称系统 PKI 已认证。HTTPS 普通 human 登录/读取/写入/退出，Secure/HttpOnly/SameSite cookie、精确 Host/Origin/CSRF、静态资源与 headercap 正反例。
3. raw net 仅 connect 后 SIGTERM，以及有效长 poll/stream 在途关闭：核真实 socket close、finally 完成、DB/严格锁顺序、实际 exit/耗时；测试端不得预先关闭连接制造假通过。重复 signal/listenfail 保原清理语义。
4. 缺一 flag、不可读/非正规/软链/FIFO/超限/非法或不匹配 PEM 的安全前置失败，不创建 data-dir、不回显 key/path/native异常；旧 HTTP API/loopback Web 与外部终止兼容保持。清理所有 child/临时文件，不开放公网。

冻结前发现真实 API/类型/关闭冲突立即报父，不偷偷削弱校验或更换路线。后续仍需单服务容器、教程、干净安装/恢复、D01 v0.1 出口与 M6/M7；本包通过不等于完整生产部署或真实公网 TLS 运维认证。
