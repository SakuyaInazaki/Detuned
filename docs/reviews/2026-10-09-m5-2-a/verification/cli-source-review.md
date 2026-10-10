# CLI TLS 独立源码审阅

结论：本包限定差分中未发现可行动阻断。仅源码阅读，不运行测试、build 或进程；不是 TLS/CLI 行为通过证明。

- 对照 verification/before-files/packages/cli/src/index.ts 的本包差分：新增两旗标、共享 loader、真实返回类型、tls 注入与 scheme；shutdown 控制流没有修改。
- packages/cli/src/index.ts:303–321：按 presence 拒单旗标，await 唯一 loadServerTlsOptions；证书/密钥及 TLS+HTTP Web 配置错误均发生于 dataDir 检查/创建(358–365)、锁取得(367–369)、数据库打开(381)之前。错误不含所传文件路径；进入原 handleError，VALIDATION_ERROR 保 exit2。
- index.ts:313,387–408：app 使用 ReturnType<typeof buildApp>，无新增 any/伪 HTTPS cast；tls 原样传组合根，日志依据实际 tls 选择 scheme，并采用监听后实际端口。
- 不传 TLS 时 tls=undefined，原 HTTP 与外部 HTTPS-origin 组合不受新增条件拒绝；新增 HTTPS-origin 限制仅 tls && webConfig 分支。这里是控制流兼容结论，非运行认证。
- index.ts:391–427：继续原 shutdown 所有权：app.close 完成后 DB.close、releaseStrict、日志释放；listen 失败进入同一个 shutdown(1)。TLS transport drain 由服务组合根负责，CLI 不插入提前关库/释放锁路径。
- tests/contracts/cli-tls.test.ts:10,16–36：三组均 built-only，分别断言早拒且目标未创建/敏感路径不回显、TLS+HTTP-origin 早拒、真实 trusted HTTPS health+SIGTERM exit0。源码 skip 不能计为这些行为通过；最终 build 执行由独验统一确认。子进程 watchdog 强杀不满足 exit0 正常退净断言，finally 尝试清退私有子进程/目录。

边界：不审核全部历史 CLI；不据测试声明推断实际已运行。未新增行为反例，未修改产品、测试、作者 freeze 或旧 E2 材料。两个读取文件 SHA 与 B freeze 一致，审阅末再次核对相同。
