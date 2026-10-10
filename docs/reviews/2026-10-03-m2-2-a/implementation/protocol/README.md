# M2.2-A Unit B：协议新写契约交付

2026-10-03。已按父 Agent 批准范围完成并冻结；不是本包独立验收结论。父 Agent 负责方案、任务分派与验收；GPT-6.1 子 Agent 执行本单元。

## 实现与文件

- `packages/protocol/src/posts.ts:84–125`：新增 NEW_TYPED_STRUCTURED_SCHEMAS、NewTypedStructured、parseNewTypedStructured 与共享政策说明。TypeBox schema 本身表达字段/type/length/enum/unknown-key、proposal/claim 非空白、failure provided 至少1引用 / unverified reason 非空白；parse 只 Check、错误400、返回原对象，非四类返回 undefined。failure普通文本保留原 min/max，无新增空白规则；数组元素沿用既有限制。
- `packages/protocol/src/openapi.ts`：四个 NewWrite…Structured components；三个写操作 description/x-new-write-policy 指明只适用新 action，thread 使用 initial_post.kind、revision 使用 stored post.kind。requestBody、历史读取和宿主 wire schema 保持兼容。
- `packages/protocol/src/tools.ts`：forum_publish 使用同一政策文案，无权限/幂等判断。现有 posts export 已由 index 导出，不需要改 index、threads 或 server routes；route 既有 body 绑定继续准确，避免无意义修改。
- `tests/contracts/m2-typed-write-contracts.test.ts`：5组正式契约测试。
- [docs04](../../../../04-protocol.md) 与 [typed-posts 示例](../../../../../examples/typed-posts.md)：新写/历史重放双层语义、引用错误的授权边界、provided 不证明结论，使用占位 token/ID。示例链接附件上传步骤。

## 验证证据

[initial-tests.log](initial-tests.log)：先新增正式反例，5/5因新导出/政策缺失失败；这是预期新功能反例，不是已部署产品的故障统计。

[intermediate-tests.log](intermediate-tests.log)：实现后4/5通过，唯一失败是新测试误用 TOOL_DEFINITIONS 导出名；修正为既有 DETUNED_TOOLS，未改产品行为。[initial-typecheck.log](initial-typecheck.log)：OpenAPI 字符串索引在 noUncheckedIndexedAccess 下可能 undefined；改用 charAt(0)，未改变 schema 内容。

[final-tests.log](final-tests.log)：`pnpm exec vitest run tests/contracts/m2-typed-write-contracts.test.ts` **5/5通过**；B01四类正例与其他kind不扩展，B02字段/元素/长度/枚举/未知键，B03条件与固定ref形状，B04三HTTP+三tool兼容分支不注入defaults，B05公开components与适用政策。每个正反输入同时通过安装版 Fastify AJV、TypeBox与parse一致性检查，输入 JSON 前后不变。没有对日期时间格式值作验证声明。

[typecheck.log](typecheck.log)、[build.log](build.log)：protocol typecheck 与仅 protocol build 通过。父 Agent 确认历史成功fixture捕获及232 dist基线保持后才解除构建暂停；本单元未运行全suite/29命令，也未启动真实宿主、模型或远程CI。

[before.json](before.json) / [after.json](after.json) 记录本单元范围文件 SHA256；[document-checks.log](document-checks.log) 为文档本地链接检查。局部 git diff --check 通过。未修改历史证据、旧probe、SQL/archive、Pi、client业务或依赖。

## 局限与后续核验

此处兼容检查证明静态 wire 能容纳旧宽 payload，不替代真实已成功 key 的 HTTP 重放/重新鉴权/脱敏/事务核验；core 单元和独立验收覆盖这些路径。请求hash保持原raw payload的实施由core负责。Node22/干净安装/远程CI/四真实宿主/模型未测；知识视图 M2.2-B 及新工具不在本包。全部产品与正式测试文件现已冻结，等待父 Agent 独立验收。
