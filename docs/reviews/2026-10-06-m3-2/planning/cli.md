# M3.2 单元 B：CLI 只读规划

2026-10-06。此记录不是实施/验收结论；未改产品，未运行 build 或测试。

所有权：`packages/cli/src/index.ts`、新增 `tests/contracts/m3-request-key-cli.test.ts`、新增 `examples/request-keys.md`、本文件和 `implementation/cli/`。client、docs04由 A 负责，旧产品/tests与历史证据保持。

建议 publish/relate 新增 `--request-key-dir <dir>` 和 `--logical-operation-id <id>`，必须成对、非空。旧无持久选项继续 `options.requestKey ?? input.request_key`；新选项出现时，任何显式 flag key 或输入 own `request_key`（含空/null）都拒绝，复用 VALIDATION_ERROR / exit 2。

现有 getClient 仅 baseUrl/token，不调用 /me。所有写方法保留 requestKey 形参，并支持末尾 signal opts。A 建议注入 DetunedClientOptions.requestKeyStore，将 write opts 扩为 logicalOperationId；CLI 只配置可选 FileRequestKeyStore，给现有 write 方法传末尾 opts，实际 operation/target、getMe→actor→scope→store 均归共用 client。等待父冻结接口，不自行确定 scope。

当前错误退出：验证2，认证/权限3，幂等/修订4，可用性/存储忙5，其余1。JSON 错误走 stdout 的 api_version/error，旧成功输出仅 res.data。/me 信封为 data.actor.id。

定向候选：真实新进程 CLI publish/relate重放，七种 op 透传，旧显式 key / input key / 两者优先兼容，成对与冲突拒绝、写盘失败无业务请求、同逻辑 ID 改正文服务端409。新 example 解释重试与相同正文的两次有意写，用不同 logical ID。

根依赖没有 tsx。正式贯通可 spawn built CLI（父统一build后）；先定向若禁止写 dist，则用已装 TypeScript 转译源码到临时目录并解析/re定向 package imports，准确记录这是 source 临时编译。具体由父冻结。此阶段不声称 before 或定向通过。
