# B：M4.1-A CLI 读取与分页

源码实现已冻结，真实 built CLI 三项正式场景待 C 统一 build 后运行；不得将待项写成通过。新增读取复用现 sharedclient，health 两薄 wrapper 由 A 提供。没有新增 HTTP/core 业务。

所有权：CLI index.ts、新 read-options.ts、新 tests/contracts/m4-read-cli-contract.test.ts、examples/cli-reading.md、docs04追加映射、docs12追加 ADR044。本包报告与 source noEmit 配置/日志另保存。旧命令组只追加子命令；默认 search data 保持，--page 或 cursor !== undefined 输出 wholepage，--thread 映射 thread_id。新及受影响 limit 固定安全错误、strict1..100，本地校验先于 client 请求。state/view 固定枚举错误不回显输入。

唯一作者 source 定向 exit0：4项正式中1通过、3明确 built skip（DETUNED_SOURCE_ONLY=1），见 source-first.log。唯一 source-alias noEmit（含CLI/client/server依赖）exit0，见 source-noemit-first.log；未 build/fullsuite。现 dist 尚未统一更新，不用缺新命令的旧入口包装成功或产品失败。

正式 built 场景：B02真实HTTP客户端预期与命令结果/目录meta比较，保原thread posts；B03search legacy/page/cursor/thread与同服务预期，非法参数无HTTP；B04匿名health、管理员诊断、普通actor拒绝、401及ready503现退出码。子进程10秒门禁，case60/90秒；stdout/stderr流设置UTF8，真实token只内存、不归档。固定服务Clock防游标签名TTL跨秒造成不同合法cursor的错误oracle。C负责真实built及独验。

源码检查：sharedclient.query仅undefined省略，显式空cursor实际URL为cursor=而不丢弃；CLI以!==undefined选择wholepage，不猜opaque绑定。health仍原getClient optional token和环境文件fallback；没有--token-file flag。CLI无业务授权分叉，server拒diag后沿既有exit3；SERVICE_NOT_READY/QUOTA沿exit1。全局Commander parser/action JSON尚不统一，附件与身份管理等另包继续。

A只读互审无产品finding；父批准唯一指南精度修正：目录沿各接口已有游标/授权规则，不泛称旧列表均签名；搜索签名绑定说明保持。仅指南hash刷新，无产品/tests/ADR变化，无重跑检查。

C首专项4/8中B三built均在CLI命令前createSpace500：固定Clock缺mandatory nowIso，是作者fixture错误，非CLI功能结果。原 verification/observed-new-targeted-2026-10-08 输出保留。父授权只补now/nowIso同instant并satisfies ClockPort，所有命令/比较/权限断言保持。新增test纳入fixture noEmit首次exit2仅暴露既有operationsService静态装饰类型缺口，日志保留；Clock必需方法类型已核。产品无需重建，C将必要重跑原三built。

父批准仅真实 operationsService decorator 的明确 OperationsService 交叉类型（保Fastify原类型、无any、无运行变化）。修后必要fixture noEmit含本新test exit0，见 fixture-noemit-second.log；原 source-noemit-first 仅产品源、不含测试，不能据此前0声称旧fixture已检查。Clock与此类型变化共用更新testhash，其余五文件hash保持，B停写。
