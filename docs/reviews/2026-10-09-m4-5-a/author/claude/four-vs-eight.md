# 四工具 status 与八工具原广告：有限诊断

没有启动新一轮Claude或改变权限。`discovery-receipt.json`实际raw名单仍为四个；原exact_eight:false与namespace预设都保留。该断言同时误用了namespaced期望，但实际数量确为4，因此单改namespace也不能变成8。

## 真实桥比较

`bridge-list-snapshot.mjs/json`使用官方SDK、相同built bridge入口及独立真实SQLite/普通agent contributor、空间read/write credential与token-file配置。只connect/listTools/close，不执行业务。真实原广告8；HTTP0，SDK/app/DB/temp均关闭。首次生成脚本文本拼接选错nested catch，syntax和启动exit1，未执行fixture；纠正后exit0，证据保留。此SDK快照仅诊断桥广告，不能作为Claude宿主通过。

snapshot runner沿用header里的Claude版本/环境标签是模板元数据，不代表运行Claude或用了guard：实际只运行Node SDK，bridge env仅PATH/DETUNED_BASE_URL/DETUNED_TOKEN_FILE；凭据不写证据。创建权限如runner真实代码，非read-only模式。MCP入口无只读env或条件广告，listTools直接返回DETUNED_TOOLS。

## 安装宿主可核过滤与调用字段

`schema-filter-static.json`提供固定binary byte offsets：

- mcp_status→hBt(mcpConnections)，hBt返回当前loaded tools并以`mcpInfo.toolName`作raw name。没有在此函数见按read-only筛掉写工具。
- fetchToolsForClient→Fr调用nwt(inputSchema,{normalizeEnabled,apiValidateEnabled})；nwt遇top-level组合需normalized且normalize未开时返回drop/normalize_gated；Fr跳过drop工具并留内部诊断。没有用allowedTools作为此drop判断。
- 真实八广告中read/publish/relate根anyOf、subscribe根allOf；恰好这四个未进入Claude status。已进入的poll/ack会改变投递操作状态，因此不能称其“仅四个只读工具”。最强当前解释是宿主top-level组合schema适配/gating，尚未取得当前运行的具体drop reason，所以不把推断标成已直接观测runtime日志。
- mcp_call真实分派检查fully-qualified；`$s`要求`mcp__<server>__<tool>`，否则拒。status的raw forum_context和call使用`mcp__detuned__forum_context`是两个正确不同表示，不可把raw用于控制tool参数。

[官方 CLI reference](https://code.claude.com/docs/en/cli-reference)区分allowedTools为免提示执行，tools限制可用集合；当前argv/private{}settings未传任何allowedTools/tools/disallowedTools或permission-mode。没有依据通过bypass来解决schema广告drop。

精准候选：若父最后批准，只沿原完全隔离、普通凭据、相同控制argv，connected后用已存在的context完整名字一次正例与unknown参数一次反例；广告缺四作为独立未完成项。不增加normalize内部feature flag、不改八单源schema或权限、不提供providerkey。此处不作产品修复或完整宿主认证决定。
