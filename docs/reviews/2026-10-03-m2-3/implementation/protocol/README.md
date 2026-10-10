# M2.3 单元 B 交付

主代理批准接口与文件边界，GPT-6.1-sol 子 Agent 实现协议、HTTP、client 和工具接线。论坛产品不启动参与者 Agent。本记录是定向交付，整体验收由主代理与独立验证方决定。

共享 `SEARCH_LIMITS`、查询 schemas、纯 `normalizeSearchQuery` 和 cursor payload guard 已导出并独占构建，核心单元消费相同定义。q trim 后按 Unicode 码点检查；JSON tags 保留空格、逗号与大小写，原数组 JSON 字节数先计量再去重。HTTP 增加互斥 `tags_json` carrier，CSV 旧行为保留。原生 HTTP 上限固定64 KiB，app 注入现有 signer/持久 secret/clock/hasher。

client search 返回静态 `SearchPage`，没有新增运行时响应验证。`forum_search` 改返回 `{data,meta}`；MCP 与 Pi 封装完整保留 meta。OpenAPI 使用共享 q、cursor 和响应定义，公开逻辑查询与字节/基数预算，保留35个操作。CLI 不改，search 当前只输出 data、无 cursor 选项。示例：[search.md](../../../../../examples/search.md)；规范：[docs04](../../../../../docs/04-protocol.md)；冻结：[interface-freeze.md](../../planning/interface-freeze.md)。

## 验证

新正式文件 [m2-search-contracts.test.ts](../../../../../tests/contracts/m2-search-contracts.test.ts) 有5个条目，不与机制探针数量相加：

- S01：真实 client.callTool 两页与必需 meta，无损标签传输。
- S02：真实 app/client 原生长编码 URL 与256 emoji、8191字节逻辑 tags 成功。
- S03：精确 ALL/case 标签、JSON 空字符串/空数组/重复、CSV兼容、互斥/重复/坏 JSON/超字节/101个不同值、旧 cursor/条件变化拒绝。
- S04：安装版 Pi 校验器256/257 emoji正反例、注册 executor 真实服务；MCP stdio 共享 schema 与真实两页 meta。
- S05：TypeBox/AJV 带和不带 Unicode flag 的 ASCII/emoji/外空白/换行/组合字符边界、有限8192空白反例；纯归一不修改输入、cursor guard、SearchPage静态编译与OpenAPI响应。

最终 [frozen-targeted.log](frozen-targeted.log) 为5/5；[frozen-types.log](frozen-types.log) 源码定向 tsc 通过，覆盖 protocol/client/server/core/storage 与本正式文件。[protocol-build.log](protocol-build.log)、[client-build.log](client-build.log)、[protocol-types.log](protocol-types.log)、[client-types.log](client-types.log) 为定向构建/类型检查通过。未执行全仓 build、全 suite 或29命令。

[q机制结果](validator-final.json) 保留有限输入与耗时，不作无界性能保证；旧 planning 机制记录未改。date-time 格式值没有因此得到验证。本机模型、真实四宿主、Node22、干净安装、远程CI均未测。

## 反例与夹具记录

[initial-baseline-corrected.log](initial-baseline-corrected.log) 使用无 source alias 的原 compiled server/client，实际复现旧工具数组缺 meta、原生长URL431；当时 protocol 已导出，核心和server/client compiled行为仍为原交付。这是修复前行为证据，不宣称全部dist仍有原基线哈希。

[initial-test.log](initial-test.log) 被全局Vitest source alias 引入并行核心中间态缺共享exports；[initial-baseline-test.log](initial-baseline-test.log) 是沙箱EPERM；[initial-baseline-loopback.log](initial-baseline-loopback.log) 是测试baseUrl重复/api/v1导致404。三者不是产品故障。修正后实际反例另存，不覆盖日志。

[targeted-first.log](targeted-first.log) 的唯一失败是测试把MCP JSON序列化后的schema与含TypeBox Symbol的对象深比较；改为JSON语义比较后通过。[targeted-final.log](targeted-final.log)、[final-targeted.log](final-targeted.log) 均保留，最终增加安装版Pi边界断言见 frozen 日志。

产品/新测试/规范文件哈希见 [frozen-files.json](frozen-files.json)。所有旧证据、SQL/schema/archive与旧正式测试未改。本单元冻结后等待独立验收；候选/items预算不是CPU/VM或整个envelope硬限，context硬预算仍待M2.4。
