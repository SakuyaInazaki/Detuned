# 下一任务：M4.2-A stdio桥安全配置、结果与关闭生命周期

[M4.1-E](README.md)已获父接受有限本机范围，585项/82文件、current29通过；首次582/585及精确修复见[独立报告](verification/verification.md)。M4.2-A自动衔接，但必须先由C保存fresh baseline，随后按本任务书实施。

## 目标和边界

落实stdio桥安全配置、兼容结果与可确认关闭。保现八工具、shared callTool、默认URL、60000ms client timeout和extra.signal传播；启动/discovery严格零HTTP、无业务写、无session、无ACK。factory可导入无进程/网络副作用，显式start才连接stdio。

完整广告schema校验、capabilities/me及惰性论坛session绑定留M4.2-B。本A不新增工具或握手HTTP，不改变服务业务/SQL/schema/模型/宿主全局配置/依赖，不宣称完成整个M4或四宿主实测。

## 文件所有权

| 作者 | 范围 |
| --- | --- |
| A | packages/mcp/src/index.ts及必要新factory/runtime/结果错误模块、tests/contracts/m4-mcp-runtime.test.ts、新包author/bridge和planning/frozen-contract。 |
| B | client Node专属凭据模块及现@detuned/client/node导出、CLI token-source薄wrapper、tests/contracts/m4-node-credentials.test.ts、docs04/docs06/ADR049、examples/mcp-bridge.md及现CLIguide必要一句。 |
| C | tests/contracts/m4-mcp-lifecycle-independent.test.ts、必要fixed helper、verification/README与统一门禁。 |

不跨owner写；旧review/SQL/schema/archive/HEAD和用户dirty保护。仅私有fixture，禁止真实账号/模型/配置读取、发布或安装。

## 共享Node凭据接口

`resolveLocalToken(sources:{token?:string;tokenFile?:string;environmentToken?:string;environmentTokenFile?:string}):string|undefined`。将已验收CLI算法原语义迁入client Node入口；CLI resolveCliToken仍保持两参数薄映射。main browser入口不得引node FS；utility不读process.env、不引CLI/sqlite、不增deps/lock。

保E四来源选择/空值区别、冲突拒绝、selected无fallback、64KiB原bytes、有界+1、strictUTF8、同FD NOFOLLOW/NONBLOCK/regular/前后stat/finally和固定安全VALIDATION_ERROR。MCP组合根只传environment两来源，不加flag。零来源匿名；冲突/坏file启动安全失败、零HTTP/零stdout/exit1。建议0600但不强制owner/mode；同UID恶意变化/祖先alias边界不扩大。

## 结果与安全错误

- 成功增加 `structuredContent:{result:原result}`，完整保data/meta等形状。旧pretty JSON text若UTF8<=16384bytes则保留，超限改固定valid JSON摘要 `{truncated:true,full_result:'structuredContent.result',text_limit_bytes:16384}`，不伪造部分完整结果。
- 错误isError:true、`structuredContent:{error:{code,message,details?}}`；text保原错误JSON至16KiB，超限摘要保error.code并指向 `full_error:'structuredContent.error'`。
- public DetunedError保服务语义；Transport/Protocol/Timeout/UserAbort按真实类型固定安全文字；未知/raw错误、malformedname不回显argv/args/URL/path/cause/stack。未知工具固定VALIDATION_ERROR且零HTTP。
- stderr不裸打印SDK解析异常、工具名或body，仅固定启动/fatal诊断；stdout只SDK协议。成功敏感内容只沿显式业务返回，不新增日志/凭据自动保存。

## 关闭生命周期

runtime拥有inflight登记；stdin正常EOF/输入异常、SDKonclose/显式close、SIGINT/SIGTERM、stdout错误均进入同一close状态与Promise。先停新call、同步取消所有已入call，再等handler finally以及已开始transport发送/输出flush，之后才确认clean。

默认整条预算10秒，factory可显式选正毫秒<=120000供嵌入/有限验收；不加env/CLI关机flag。重复signal/close不重置deadline、不新发HTTP/ACK。不合作或输出背压超预算，main固定诊断exit1；确认正常关闭exit0。不得以process.exit0截断在途回复；必要send跟踪/有界flush由A实现。

不destroy宿主共享streams，不把SDKclose单独视为完成清理，不承诺JS硬抢占同步阻塞。所有fault仅测试接口替身/fixed helper，不加生产testflag。

## 验收与执行

1. C fresh先于实现。A有限验证factory导入零副作用、结果16KiB边界、重复close、超时negative；B验证新Node入口/composition必要边界并回归E七组，不镜像重写七组测试。
2. 保旧stdio A05/A06与E07取消；C真实SDKstdio discovery零HTTP、发布/data-meta/large摘要/isError、双进程凭据隔离。
3. C核pending poll取消/EOF/signal释放、不ACK，重启仍取得同未确认batch；坏凭据启动不泄露/不fallback；真实loopback与私有fixture，无真实宿主全局配置。
4. A/B源定向/noEmit后freeze；C sourcecheck、唯一build、必要targeted、四gate与current29（24原probe+已批准A.1第11适配+四gate）。首次失败不覆盖，只在真实改动/归因后必要复验。
5. 使用已安装官方SDK1.30.1，协议版本依据E SDK事实记录，不改依赖或将本地SDK测试称为四真实宿主认证。下一M4.2-B仍需另冻结，M5–M7未完成范围保持。
