# M4.1-E 错误输出只读事实

2026-10-08；仅源码阅读，无测试、产品修改或真实凭据/配置读取。以下为候选策略，待父冻结。

| 可达出口/类别 | 当前来源与最小安全策略候选 |
| --- | --- |
| `index.ts:62–86` handleError | 当前直接打印任意 err.code/message/details；JSON 为 `{api_version:'1',error:{code,message,details?}}`，文本写 stderr。不可把 duck-typed code/message 当安全证明。 |
| DetunedError | 类本身允许任意 message/details（protocol/errors.ts:76–96）。本地固定验证文本可保留；真实服务 public 错误应保留其有意义 message/details，不能一刀切抹掉。client.ts:465–474 从 HTTP error 信封取值，class/已知 code 并不能证明任意外部响应内容安全。需父明确可信服务 public 契约边界，或按 code 的已知 details 字段验证，不遍历输出任意对象。 |
| ClientTransportError | client.ts:79–96 和318–340、386–410 可带底层 fetch/body message 与 cause；底层文本可能含地址等。固定运输失败文案；保已知 TRANSPORT_ERROR/ABORT_ERROR，不输出 cause、stack 或未知 code。 |
| TimeoutError/UserAbortError | client.ts:55–69 默认固定文案，内部 timeout 会插入配置毫秒；构造允许任意 message。按已知类型输出固定超时/取消文案即可，exit 沿原1。 |
| ClientProtocolError | client.ts:440–451 有响应 api_version 插值；其他正文验证文案多固定。不能裸输出其全部 message；固定协议响应错误文案，exit1。 |
| MaintenanceError/ImportError/UpgradeError | 当前内部多数固定安全诊断；import/upgrade 转换 MaintenanceError.message 保留发布持久性/门禁失败的重要区别。允许已审固定诊断（尤其完整 final 保留、不要启动/另新目录），不输出 cause/raw SQLite/FS error。仅凭公开 constructor 可接任意 message，仍需明确 allowlist 或固定按 code 分类。 |
| RequestKeyError | request-key.ts、file-request-key-store.ts 当前固定 message，底层异常放 cause；保固定 INVALID_OPTIONS/STORE_ERROR/IDENTITY_CHANGED 文案，不输出 cause 或持久目录。 |
| artifact IO | artifact-io.ts 已将打开/读取/关闭/发布异常固定化，保 post-link 完整成品保留诊断。它抛普通 Error，需窄 typed 标记或明确已知固定文案 allowlist，否则通用未知错误固定文案会丢失重要诊断。 |
| export 文件发布 | index.ts:125–157 的 realpath/open/write/link 可直接抛 raw FS；fsync 和取消则固定且区分成品保留。应局部安全包装并保发布阶段，不允许输出 raw path/syscall。 |
| readInputJson | index.ts:101–110 直接 readFileSync/JSON.parse；publish/relate 原样调用（约725/765），会泄露 FS 输入路径或 JSON SyntaxError 片段；null/原始值还可产生 raw TypeError。候选复用 admin-input.ts 的局部固定可读 JSON object 错误，不打印原输入。 |
| publish/relate unknown op | index.ts:747/798 插值 options.op，可回显误贴秘密；改固定合法操作提示，保 VALIDATION_ERROR/exit2。缺 post_id/thread_id/relation_id 当前固定文案。 |
| 其余未知/raw错误 | 包括 SQLite、FS、SyntaxError、TypeError、任意自定义 Error：固定 UNKNOWN_ERROR 与安全文案，不输出输入路径、SQL、正文、details、stack/cause。现 code?? fallback 不能当 allowlist。 |

exit 映射必须保留 `index.ts:19–51`：本地参数/VALIDATION/PAYLOAD/EXPORT_LIMIT→2，身份权限→3，列明冲突→4，列明暂时不可用/限流→5，其余→1；Import/Upgrade/Maintenance/RequestKey 各自局部映射不变，QUOTA/SERVICE_NOT_READY仍1。
成功输出独立：credential 明文 token、init/restore/import/migrate 的 adminToken 仍只在合法成功 stdout 输出，不混入错误净化，也不新增自动文件/日志。init/serve 的长期启动/关闭运维诊断不在此候选策略中全局重写。
Commander scanner 由 A 负责；本表不重复其 argv/parser 事实，也不改变全局 JSON 格式或调用重试策略。
