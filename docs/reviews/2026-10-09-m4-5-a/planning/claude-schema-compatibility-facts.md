# Claude 2.1.282 schema compatibility facts（只读，2026-10-09）

本包不改广告、校验、权限或宿主设置；以下区分真实观察与静态因果推断。

| connected 中缺少的工具 | 真实 SDK listTools root.type | root.keys |
|---|---|---|
| forum_read | object | type, anyOf |
| forum_publish | object | type, anyOf |
| forum_relate | object | type, anyOf |
| forum_subscribe | object | type, properties, required, additionalProperties, allOf |

来源：[同真实 built bridge 的 SDK 快照](../author/claude/bridge-list-snapshot.json)。该 SDK 快照八工具、零 HTTP；Claude connected 实际只有 context/search/poll/ack 四工具，不能称“四只读”。所有八 schema 都已有 root.type=object。

安装 native 的有限静态片段见 [normalization-source-static.json](../author/claude/normalization-source-static.json) 与 [schema-filter-static.json](../author/claude/schema-filter-static.json)。nwt（byte offset 206840427）先调用 Sfo：root 组合存在时合并根/分支 properties，allOf 的 required 并入，构造 object 并返回 normalized。然后 normalized 且 !normalizeEnabled 直接 drop/normalize_gated；之后才检查 API schema，apiValidateEnabled 只影响 API-invalid 分支。因此 type:object+anyOf 同样进入归一化门禁，type 本身不能消除组合。

真实 fetchTools 路径 Fr（207015167）将 _i(config) 传作 normalizeEnabled；_i（206963835）调用 Qt('tengu_mcp_normalize_root_combinators',config)。Qt（206963356）读取配置 x(key,[])：非数组/空数组 false，包含 '*' true，否则要求 config.url 并匹配主机/域名。实际私有 stdio config 无 url；可见默认值为 []。未捕获运行时远程 flag 值或 drop 日志，所以这仍是与“四缺项恰为根组合”吻合的最强静态解释，不能写成日志证明。

[MCP 2025-06-18 tools 规范](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) 要求 JSON Schema 输入；[该版本 schema.ts Tool.inputSchema](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-06-18/schema/2025-06-18/schema.ts) 要求 type:'object'。当前满足此要求，anyOf/allOf 为正常 JSON Schema 组合，规范未禁止它们；本轮未运行通用 meta-schema 全面审计。问题不是缺必需 type。

[Claude 官方 MCP 文档](https://code.claude.com/docs/en/mcp) 明确根 anyOf/oneOf/allOf 不被 Claude API 接受，嵌套在 properties 下的组合可原样传递；宿主可归一化根组合，合并 properties/allOf required，anyOf/oneOf 的组约束转为描述而非同等 schema 强制；部署未收到开启重写的远程配置时可能跳过工具。未找到文档化的本地用户开关来开启该内部门禁，不能注入内部 flags 或放宽 permissions。

父需裁定：保现扁平八工具并将宿主缺项作为有限支持，或另包设计正常适配表达。例如 properties 内嵌 canonical payload 可保组合语义，但改变参数 envelope，需要显式兼容与 unwrap，且仍须原 canonical runtime/server 校验；尚未实现或验证。不能只删 anyOf/allOf、不能用 not/not 技巧；官方宿主扁平化也不等于精确广告语义保留。没有已证的保持现扁平参数、八工具与全部约束的无根组合等价方案。
