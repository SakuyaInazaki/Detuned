# M5.2-A CLI TLS 作者交付

源代码冻结，built CLI 验收待 D 统一构建。仅 index.ts + cli-tls.test.ts 两产品/正式文件；未改 serve-shutdown、server、依赖或 E2。

CLI 新成对 tls-cert-file/tls-key-file；共享 loadServerTlsOptions 在任何 data-dir mkdir/readiness/锁/DB/listen 前读取/安全预检。TLS API-only允许，TLS Web只https origin；旧HTTP与外部终止路径保留。真实 app 返回类型通过 ReturnType<typeof buildApp>，移除该 serve 局部 any；URL依据 TLS 显示https。未伪cast、未复制binaryloader。关闭算法原样。

作者检查：noemit-first exit0，source aliases 覆盖 CLI 与本新测试及真实 A ServerApp HTTP|HTTPS 返回类型。targeted-source exit0，**三测试全部显式 skipped，零行为通过**；未使用旧dist证明新TLS。三built场景待D：前置成对/不可读文件安全拒绝且不mkdir；有效PEM配HTTP Web origin前置拒；API-only自签SAN证书、Node显式CA健康与实际SIGTERM0。没有作者build/full/browser/current29。

测试openssl仅自有临时目录生成，凭据 init 输出只私有内存不日志，证书/key不入仓库，child finally reaped；有限启动/请求/清退watchdog。D负责独立raw未握手、完整CA/hostname反例及浏览器，本文不把自签trust当系统或公网认证。所有日志保在本目录。

实际A freeze接口核：loadServerTlsOptions两个string→Promise<ServerTlsOptions>；AppOptions.tls同Buffer类型；buildApp返回ServerApp=FastifyInstance<HttpServer|HttpsServer>，Amanifest SHA906422246981e46fe4b13cba4d21b1d43ebf5beec42679e3ff7d1b2d285ba963。
