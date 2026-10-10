# M4.4-A 共享基础接口事实（只读）
1. 限五源/测试文件：mcp/session-binding.ts、tool-validation.ts、client/index.ts、client/node.ts、r4-c-contracts.test.ts的C03局部；复用父pi-next-design，不实现/运行。
2. `session-binding.ts:7–11,23,76–85`现config为client Pick(getCapabilities/getMe/createSession)+clientName/clientVersion；返回prepare(spaceId,signal)/beginClosing()/waitForIdle()，可以原算法移至client/src/session-binding.ts并在browser index薄export。
3. 候选名`createRuntimeSessionBinding`/`RuntimeSessionBindingOptions`；global read单flight成功cache、失败真实finally后清，session一旦started失败terminal，waiter引用取消与pending idle均原样；不新增session_id到写body。
4. `session-binding.ts:63–66`仅cap.data.api_version==='1'，不是ACL缓存；:79–85用me.actor.id检查session.actor_id/space_id；无需MCP SDK维持这些协调规则。
5. 当前parseMe/parseSession仅`tool-validation.ts:14–16,24–31`：SDK AjvJsonSchemaValidator消费protocol的MeResponseSchema/SessionSchema，坏shape抛现ClientProtocolError固定文字。**该实现不能直接搬到browser client**，会带入MCP SDK/AJV。
6. 已有client browser index只export client/request-key，node入口另exportFileStore/resolveLocalToken；Node凭据继续从client/node用，不应从browser index再export。
7. 窄候选：shared binding options接受明确parseMe/parseSession函数，由MCP wrapper提供现已验parser，Pi用其官方validator消费相同protocolschemas；共享协调模块只依赖types/现error，不新SDK/AJV依赖。或父授权protocol新增同schema纯responseguard再让两端复用，当前rg未发现现成Me/Session guard，不能声称已有出口。
8. protocol现isArtifactMetadata/isCreateArtifactMetadata是artifact专用，不可当Me/Session validator；日期format行为此前有单独收口，不能把裸Value.Check一般化或悄悄删format放宽。若选新增guard应另冻必要类型/format契约。
9. MCP最小兼容wrapper保`McpSessionBinding`与createSessionBinding现签名，内部转调shared并传现parse函数；bridge/index既有关闭ownedpending调用不变，现MCP五组binding与native六组可继续作为回归。
10. 固定token snapshot是adapter组合根责任：不可把既有mutable DetunedClient任意setToken后的cache当同身份；Pi新runtime取得resolver结果后固定client，变化显式重建。shared module无法从Pick接口读取或锁token。
11. C03-1 `r4-c-contracts.test.ts:1510–1553`在activate**之前**设URL/token，循环仅换controlled fetch；精确期待每command单HTTP和UI/headless各自输出。并没有在该case断言activate后token切换，不能编造此兼容要求。
12. C03-4 `:1572–1597`activate后direct tool fixture，仅一业务fetch，期待坏JSON为ClientProtocolError及完整409 DetunedError.details；新增惰性preflight会改变此fixture请求序列，必须明示适配，不削弱错误断言。
13. C03-5 `:1602–1637`先设adminURL/token再activate，注册parameters等于DETUNED_TOOLS并使用真实Pi validator/七write分支；固定snapshot本身不冲突，但新增preflight需合法cap/me/sessionfixture，旧成功schemas不能简化。
14. 已读C03片段未发现“每call必须读取最新env token”的显式assert；旧adapter动态setToken事实来自前包已核implementation-gaps:9。不能把行为变化伪称已覆盖；下包需新明确token变化/重建隔离验收。
