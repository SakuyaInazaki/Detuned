# M2.2-A protocol / HTTP / tool 契约规划

2026-10-03；仅只读调查与接口建议，尚未实施、尚未运行产品测试。父 Agent 负责方案与验收；本单元只执行批准后的 protocol / HTTP schema / tool / OpenAPI 与专项契约测试，不改 core、storage、SQL、archive 或历史证据。

## 已确定的兼容边界

旧成功请求的原 payload + 原幂等 key 必须仍可重放；不能升级历史 request_hash/resultRef，也不能在 hash 前增加默认字段。HTTP Fastify body schema 和 Pi 宿主工具 schema 都在 core 幂等查找前执行，因而无状态 JSON Schema 无法判断某个请求是否是已成功的历史请求。严格四类 schema 直接替换 wire schema 会违反这个边界。

父 Agent 已接受：保留现有兼容 wire envelope / structured Record fallback；独立导出四类严格新写 schema；只在 core executeIdempotent 的新 action 内调用共享校验。重放依然执行现有身份、权限、脱敏与结果重建规则，不能靠跳过它们获得兼容。修订按数据库已存 kind 检查，不能从修订 payload 推断 kind。

## 当前事实

- `packages/protocol/src/posts.ts`：proposal/claim 的 statement 1–5000、scope 1–1000、falsification_plan 1–2000，assumptions 数组元素最长1000；数组允许空且元素没有 minLength。failure 的 attempt/expected/observed/ruled_out 1–2000、tested_scope 1–1000；六个 category 枚举；assumptions/not_ruled_out/retry_when 元素最长1000；evidence_refs 为 EvidenceRef 数组。evidence_state 是显式必填 provided/unverified，**没有默认值**；evidence_missing_reason 可省且最长1000。summary.source_refs 至少1个固定 PostRef。四类对象均禁止未知键。
- StructuredContentSchema 最后的 Record fallback 允许上述规则被绕过；structured 在 create/revision 中可省。顶层 envelope 禁止额外属性；tags 可省；不存在应补写到原请求中的类型默认。
- `protocol/tools.ts` publish 手工复用 structured 定义，但 tags 限制比 HTTP 宽。此包不顺带收紧既有 tags，避免扩展兼容范围。thread.initial_post 使用兼容 create envelope；revision 没有 kind。
- `server/routes/posts.ts` / `threads.ts` 使用上述 body schema。app AJV 配置 removeAdditional=false、useDefaults=true、coerceTypes=false；不得给兼容 wire 增加新 default。MCP 向宿主公开工具 schema；Pi 采用该 schema 并先校验后 execute，本包无需修改 Pi 转换或升级 SDK。
- core post create 与 thread initial_post 现有结构检查发生在 executeIdempotent 前；revision 的检查已在新 action 内。前两处需由 core 单元迁入新 action。IdempotencyService 对原 payload canonicalJson 后 hash；共享解析函数不得原地改请求。

## 待父 Agent 最终批准的精确导出

`NEW_TYPED_STRUCTURED_SCHEMAS`：以 proposal/claim/failure/summary 为键的 TypeBox schema map，proposal/claim 共用定义。保留历史兼容读取 schema；严格 map 是唯一新写来源。

`NewTypedStructured`：四类 map 对应的静态类型联合。

`parseNewTypedStructured(kind: PostKind, structured: unknown): NewTypedStructured | undefined`：纯结构检查、不访问 DB、不变更输入、不注入默认。四类成功返回对应 typed 内容；缺失/类型/长度/枚举/未知字段/条件错误抛既有 DetunedError VALIDATION_ERROR 400；其他 kind 返回 undefined，交由原规则处理。使用已安装 TypeBox 的 value 检查入口，不新增依赖。必需文本沿用 core 非空白要求；没有现行元素 minLength 的数组不新增元素非空规则。

failure 新写 provided 要求 evidence_refs 至少1条；unverified 要求非空白 evidence_missing_reason，evidence_state 仍显式必填。条件应由同一严格 schema + 纯解析函数表达，不由 route 或工具复制。引用的存在、指定修订、同空间、ACL、脱敏与 artifact ready 属于 core：missing/unreadable 404、redacted 410；协议结构检查不冒充业务可读性证明。环境/预算文字不得新增关键词分类器。

OpenAPI 为三个写操作保留兼容 requestBody，同时在 description 与 `x-new-write-policy` 标明：新 action 必须符合独立严格 component；历史同 key 同 hash 重放使用兼容 envelope。component 引用严格 map 的实际 schema。工具参数继续兼容 envelope；描述明确新写规则及历史重放边界。不能把宽松 Record 宣称为完整 typed enforcement，也不能用 strict-or-Record 联合宣称强校验。响应/历史读取继续保真。

## 夹具调查与专项验收

当前正式测试与历史可执行 .mjs/.js/.ts 的全文检索未发现成功的 failure + provided + 空 evidence_refs 夹具；这不是对所有序列化历史材料的证明。`tests/integration/m1-discussion.test.ts:150` 空 evidence_refs 属于 objection，非本包四类，不应修改；M2.1 artifact tests 的 evidence_refs 属于 note，也不纳入四类严格规则。`tests/integration/m0-m1-r2-regression.test.ts:321`、历史 `2026-09-28-m0-m1-r2/check-remaining.mjs:128` 是坏 failure 拒绝反例，不是合法成功样本。历史 `2026-09-28-m0-m1/check-behavior.mjs:77` 缺 structured claim 同样是拒绝反例。旧 probe 全部保持原字节。

拟新增 `tests/contracts/m2-typed-write-contracts.test.ts`：严格 map 字段/数组元素/长度/枚举/unknown 与 failure 条件正反例；兼容 envelope 仍接纳历史宽请求而严格 map 拒绝；HTTP/thread/tool 三入口引用共享定义、OpenAPI 诚实声明双层契约；证明无默认注入/输入不变。真实三入口新写/修订事务回滚、引用/权限、旧成功原 key 重放由 core 单元负责，并覆盖共享函数调用顺序。不会通过放宽新规则或修改历史 probe 凑绿。

实施文件所有权：protocol/src/posts.ts、threads.ts、tools.ts、openapi.ts（必要导出 index.ts）；必要 server routes/posts.ts、threads.ts 的 schema 描述接线；上述新契约测试及本包 implementation/protocol 证据。实际 OpenAPI 文件路径与最终测试文件名在开工前核对、报父 Agent；无业务中间件、无新的工具、无知识视图、无真实宿主认证。
