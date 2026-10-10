# M4.1-E CLI 错误与凭据选项：只读事实

当前 D 源码/检查保持冻结；没有执行 CLI/测试，没有读用户配置、env值或真实凭据。这里只核仓库和安装包源码，候选未实施。

## Commander 与解析边界

- cli/package.json commander ^13.1.0，安装 package.json 实际13.1.0。index.ts尾部 program.parse(process.argv)，无 parseAsync/exitOverride/configureOutput；action内部各自catch handleError。
- 安装 lib/command.js:60–64 默认 writeOut stdout、writeErr stderr；error():1902先 outputError(message,writeErr)，再 _exit（默认1），所以仅 exitOverride 不会阻止原parser文本先泄到stderr。
- exitOverride():492接 CommanderError，可抛后在统一解析边界捕获；configureOutput():239可换 outputError/writeErr/writeOut。子命令 _copyInheritedSettings():94–98继承output配置与exitCallback；应在创建group之前设置或核既建对象，不猜继承时机。
- version():2164写stdout、exit0 code commander.version；help():2373/2577正常stdout/exit0 commander.helpDisplayed（错误help可stderr）。父需冻结 --json 与显式help/version的优先语义，不能把成功help当错误JSON。
- 当前 --json 仅action读取program.opts().json，未知命令/选项、缺必填/参数等parser先走Commander stderr原文/exit1，没有同形JSON保证；raw parser message可包含未知参数/option/建议，不可直接用于安全JSON。
- 最小候选：解析前仅识别真实全局 --json（需明确 -- 边界、值位置规则），配置禁止parser错误raw输出，exitOverride捕获；固定VALIDATION_ERROR安全文字经既有handleError→stdout同形JSON/exit2，非JSON保持或固定安全文本由父裁定。帮助/版本成功路径单列。不是新增完整HTTP成功/错误envelope框架。

## 现action兼容形状/类别

- index.ts:62 JSON stdout为 {api_version:'1',error:{code,message,details}}，没有request_id/retryable；undefined details被JSON省略。非JSON stderr为[Detuned Error] (code): message，可另打印details；exit由mapExitCode，不改变成功data/page输出。
- mapExitCode:19–51：validation/payload/exportlimit=2；unauthenticated/forbidden=3；revision/idem/ACK/resync/snapshot/openobjections/exportinvalidated=4；exportunavailable/temp/storagebusy/rate=5；quota507、未知/传输/timeout/abort默认1。Maintenance/Import/Upgrade invalidoptions以及offline-required规定2，其他1；RequestKey INVALID_OPTIONS2。
- init/serve/长期shutdown还有独立固定stderr诊断（index:387,402,413），不是全部action error都同形；非JSON serve启动显式写host/port/dataDir/限额，JSON serve关闭失败stderr小error形状。下包是否纳入这些已验收运维输出应父限定，不能宣称一次全替。
- handleError本身无脱敏，直接err.message/details。新readAdminInput捕获JSON/FS错误用固定safe VALIDATION_ERROR；artifact-io同样固定safe。旧publish/relate仍readInputJson直接fs.readFileSync/JSON.parse，FS错误可能含路径，JSON SyntaxError可能含正文片段；未知publish/relate op文字含用户op。这里只确认控制流可能，不将任意出现模式称已复现秘密泄露。
- ClientTransportError/TimeoutError/UserAbortError既有类别/退出1保留；DetunedError server message/details本来直接输出，整体删改会破兼容。token无默认打印路径，但创建credential成功data含本次token（已明确一次stdout），init/recovery/adminToken成功亦敏感输出，不应全局去除合法成功token。

## 凭据现来源与本地文件候选

- getClient():89：token=cmdOpts.token ?? DETUNED_TOKEN；只有falsey时尝试DETUNED_TOKEN_FILE，readFileSync utf8.trim，任何读错误忽略。显式空string抑制env token但可回退env文件；whitespace token truthy不回退；无token仍client并由protectedHTTP401裁决，匿名health正常。
- env文件当前无size/regularfile/symlink/owner/mode校验，同步读取可能FIFO阻塞；不报告实际用户文件是否存在。显式 --token-file尚未实现；其与 --token/envtoken/envfile冲突或优先及匿名行为由父冻结。
- artifact-io.ts:12–39已有局部 sameFD O_RDONLY|O_NOFOLLOW|O_NONBLOCK→fstat regular→有界chunk读取→再次stat→finallyclose；本代码固定25MiB且返回Blob，不应拿该上限/Blob语义当凭据接口。可窄抽/独立同模式较小bytes上限、严格UTF8、trim/空拒和固定safe错误；权限/同uid/祖先alias范围由父裁定，不读全局配置，不自动chmod。
- baseURL/token来自参数与env，handleError可能输出URL/FS path相关底层错误，process argv可被本机工具观察（--token现既有）；本包不宣称解决进程表/恶意同UID/全局secret管理。

## 已有兼容检查与下一包边界

- tests/contracts/m4-admin-cli.test.ts AC B03依赖safe input exit2/error.code VALIDATION_ERROR、unsupported key option只要求非零/零HTTP/无PRIVATE；B04冲突exit4 IDEMPOTENCY_CONFLICT。
- tests/contracts/m4-artifact-cli.test.ts依赖无token exit3 UNAUTHENTICATED、existing output exit1保持目标、输入拒exit2；m4-write-consume-cli WD B04依赖非法数字/JSON exit2且固定安全/零HTTP、checkpoint组合400→exit2。不能为parser改造统一全部退出为1。
- current29兼容入口沿A.1#11 adapters/check-unfinished-contracts.mjs及manifest保留；其是服务/core/client probe（含错误信封与旧行为）而非整套Commander parse契约。有限核未找到该adapter固定parser help/version格式断言，不把这视为全部29无相关依赖证明；C下一gate仍复用既有固定入口。
- 最小owner候选CLI新小parser-error/token-source模块+index和对应合同测试/指南；client重试/服务鉴权/SQL/schema/宿主不动。父先冻显式文件选项优先、权限/大小/UTF8、parserJSON与help/version、raw未知错误安全文字的兼容边界，再实现。
