# M4.2-B 父冻结契约

前包已接受，范围以[任务书](../../2026-10-08-m4-2-a/next-task.md)为准；fresh baseline SHA ccb2011d4a52d9df51fcd89871a2e68849cacdcd1b9663919b9afbfa7a9e324a。无依赖/SQL/工具字段改变。

MCP使用已装SDK默认Ajv validator，先完整校验DETUNED_TOOLS，含实际anyOf组合与共享allOf（不冒称存在oneOf keyword），invalid/unknown固定VALIDATION_ERROR且0HTTP，不coerce/remove/default，不回显Ajv输入。B独占tool-validation及正式schema测试/公共指南，导出validateMcpToolArguments/parseMcpMe/parseMcpSession。legacy structured规则与core幂等顺序不变。

A独占bridge.ts/index.ts/session-binding.ts、新m4-mcp-session.test.ts及本包author/session。factory原client.callTool注入兼容；仅新增sessionBinding可选配置{client:Pick<DetunedClient,'getCapabilities'|'getMe'|'createSession'>,clientName,clientVersion}。main同一client、detuned-mcp/实际包0.1.0。import/construct/start/initialize/listTools零HTTP，只有合法实际call准备。

global单flight依次capabilities→me：局部EXPECTED_API_VERSION='1'为父批准当前wire契约（现无公开常量）；MeResponseSchema验证actor，visible_spaces不当全量ACL。per-space单flight调用真实createSession（observer门禁），SessionSchema验证actor/space匹配后dispatch。不改args/result、不注session_id；session仅runtime诊断关联，非逐帖审计，新session非新身份。

每flight真实pending登记、自有controller、waiter引用计数；单waiter取消脱离不扰其他，最后取消abort共享工作，已abortedflight不被新call误复用。global失败/全取消在真实finally后清flight，新的显式call可重启，无原call循环重启；global成功缓存。未开始session的global失败不锁space；createSession一旦开始可能提交，失败永久缓存到runtime重连，无第二次创建，不猜回滚。成功session缓存，同space复用/跨space独立。

close同步closing并abort所有flights，等其finally纳入既有10s单预算/同关闭Promise，不新timer/destroy/后台初始化/ACK。读取内部已有retry不变，createSession singleattempt不变；关闭后不得重启。非合作native/Promise仍有限失败，不假claimclean。

A五组正式：发现懒初始化与复用/跨space；单/全waiter取消与global再显式call；session已发送取消/响应丢失永久失败及晚响应无dispatch；响应身份错/空间错failclosed；关闭global/session真实finally及非合作deadline。可控屏障，无sleep猜时序。C独立真实SDK/native HTTP及统一build/full兼容，作者仅source定向/noEmit；首失败保留，旧tests fixture不私改。
