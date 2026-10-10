# M7.4-E：固定 Codex launcher 入口修复与安全诊断

状态：root已选择的下一包规划；仅文档准备，未实施/运行。当前D实现与runtime优先。D接受封存 → E独立新fresh → root source dispatch → B实际冻结静审 → D合法外层require_escalated且strict child保持 → root单独释放至多一次新增normal。每步只接受真实证据，不用本计划自动授权运行。

## 具体问题与边界

C.1唯一normal固定Codex0.144.6已initialize/thread响应，独立MCP组confirmed1/ACKtrue、资源清退已证，但status/list40后tools为空、ERR_ASSERTION，零工具调用。已核固定337 protocol与现filter吻合；C.1原收据未区分原因；后续发现入口遗漏。nextCursor未消费仅静态遗漏，不能归因当前只有detuned的结果。root已接受实际控制流证实的launcher缺陷：ACK后仅dynamic import built MCP，argv[1]仍为launcher，built入口guard因此跳过main/bridge.start。修此确切遗漏并保留白名单诊断；不把它当所有宿主失败唯一根因，不先修分页、延时或自动重试，不创建通用harness executor。

A只改scripts/integrations/codex-check-probe.mjs：在ownership/ACK成功后、dynamic import前，自有launcher内仅设置process.argv[1]=可信built MCP绝对路径，保其它argv/env/策略；不spawn额外进程，不改product入口。可窄export实际生产使用的launcher生成函数供真实回归，禁止test-only镜像。另保白名单诊断与必要安全输出，所有权证明helper保持字节。C.1测试保持字节，不复制业务/权限规则。D新增tests/contracts/m7-codex-launcher.test.ts，使用实际production launcher，在真实自有有界Node/stdio进程中验证ACK前无stdio、ACK后MCP initialize/tools-list及actual close/absence；不需要native宿主/模型账户，清退只自有资源，保持默认测试预算。D重用已接受C.1 capture的实现与绑定方式，E新capture须绑定E实际source；仅按根批准作最小证据参数绑定/输出隔离，清退/确认/权限逻辑不变。不得覆盖旧封存C/C.1/D证据。无产品/core/schema/HTTP/client/CLI/MCP/adapter/正常文档变更。

固定binary/version/size/SHA、child policy与minenv、五control方法、九工具exact断言保持；原40 polls、每请求deadline、75秒work/90秒total/95秒outer不增加，原worker边界同样保持。0新增control/HTTP调用，不发送prompt/turn/model，不扩大network/账号/config读取、安装或process signal权限。诊断不授予任何authority，不改变confirmed/ACK/import/cancel/清退顺序。

## 诊断白名单

status/list每个既有响应仅记录形状enum、data条目count、精确detuned匹配count、tools对象形状enum/count、固定九expected名字的presence或missing集合、unexpected count、nextCursor boolean。只允许固定knownexpected名字进入公共输出，不输出服务/工具未知名字、threadID、cursor、raw response/error/stderr、私有路径/token。若既有路径曾复制未知工具名，诊断拒绝前也不得泄露原names；成功工具列表只能固定九名断言之后输出。

startup notification只用repo固定337 protocol白名单schema：starting/ready/failed/cancelled及failureReason enum。必须精确匹配owned thread与detuned server；只输出白名单枚举和计数，未知值安全归类，不输出未知名字/原字段。不能仅凭看似相关notification归因工具失败。记录有界：保last或计数，处理/记录最多40；不得积累无界历史，也不得新增调用来补notification。

## 验证与唯一运行门禁

A冻结actual source/diff及protected helper字节和真实production launcher入口修复，D冻结新launcher测试与绑定capture/gate-plan，B核真实schema映射、白名单输出、0新增调用/authority及原预算。必要syntax、source noEmit与精确相关验证由root按实际差分选择；不跑full、安装、性能、最低Node/Linux/模型认证，无新风险不堆重复测试。

D仅在root批准门禁后运行有界自有流程；必要外层权限通过require_escalated自动审核，严格native child policy不变。至多一次新增normal由root独立释放。拒绝/unknown/present仍保留登记和证据；所有candidate/confirmed组、actual owned child close、root/control absence须独立确认，不用空集合证明全局清退。每组失败后仍尝试其余已授权清退，原失败优先。

唯一normal结束后依据实际phase决定窄修或正式记录真实外部阻塞；任何后续修复/验证须root明确新边界，不自动retry或增加时间。不把host内部未测量行为、模型收益、完整四宿主会话或工具认证从诊断外推。保留旧失败及未排除变体/重试条件。若失败只说明环境/启动阶段，不能否定论坛路线。

禁止前端/Web/视觉/浏览器专项、deepseek-brainstorm、VM/Colima/Docker管理/清理、全局配置/账户/keys、模型调用、安装/锁变更、推送/发布，以及foreign process/tmp扫描。当前计划不占D runtime窗口。
