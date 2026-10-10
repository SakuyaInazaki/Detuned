# C.1 核心对协议单元只读交叉审查

2026-10-06，冻结后核对父next-task与interface-freeze及协议十路径源码/交付说明。仅新增本文件，不产品改动、不测试/build；这是协议静态复核，不是核心独验或H-R1历史工作线验收。未发现本次范围的具体产品偏差。

## 冻结关键点对应

- `packages/protocol/src/search.ts:79–84` query仍两项max_bytes/focus_thread_id，预算沿CONTEXT_BYTES，focus非空/非空白，拒extra。:201–215新增ContextFocusThreadSchema/type，以现Thread所有字段读取且title不带新写长度限；optional focus_thread进入included与omitted两分支，原space内容判别/required meta/omitted必须truncated true保持。schema的optional是兼容无focus响应所必需，并非允业务删除focused metadata；焦点是否提供的相关性由服务端实现保证，不新增响应runtime校验。
- `packages/core/src/services/context-service.ts:140–154`只有实际focusThread时spread字段，无focus不插null/key；:165–180必要inline测量、规则省略和尾裁始终spread保留focus_thread，最小无法fit422。`protocol/src/search.ts:227–238`原build/serialize/bytes仍同源compact JSON/TextEncoder，没有对focus单独编码或隐含预算。`server/src/routes/spaces.ts:135–141`实际req.id传service及同源serializer，client/CLI不二次裁事实。
- `server/src/routes/spaces.ts:127–138` whitelist拒unknown；focus字符串parseStringQuery使用allowEmpty:true，所以空/白字符串交core。`core/context-service.ts:32–48`当前身份→space observer/read→focus非空字符串→目标同space；因此权限先于目标及空字符串业务校验，同spaceopen/archived允许，未知/foreign404。重复数组/非字符串由现parseStringQuery传输shape先400符合合同；预算数值解析仍HTTP传输层，不将其声称线程业务授权。
- `protocol/src/tools.ts:13–21`纯结构validator使用同源ContextQuerySchema.properties，direct callTool走它；`client/src/client.ts:785–790`validator后透传focus/max_bytes、完整page及Signal。纯tool参数结构拒绝不替代server权限，合法目标业务只在server。tools.ts:261–300仍8个原工具名，没有focus新工具或host Agent启动。
- `client/src/client.ts:536–544`原getContext保持HTTP入口/静态返回ContextPage，query可省，AbortSignal沿现；不注入focusmetadata/default/null、不新增runtime响应validator。`cli/src/index.ts:302–317`沿context/--focus-thread，max-bytes现严格positive safeint函数，输出完整res，帮助明确省略时空间上下文，不复制权限/候选筛选。
- `protocol/src/openapi.ts:199–218`原GET操作更新focus意义/404/预算窗口说明，不增加route；:652–655最终参数归一化到现NONBLANK_STRING_SCHEMA使focus空白约束实际输出一致，响应仍ContextEnvelopeSchema。规则/policy/checkpoint仍space级，无新context分页承诺。
- `tests/contracts/m2-context-contracts.test.ts:72–82`旧C03仅父授权区段：missing focus从400循环拆为404/tool404，空/预算/unknown400保持，加入ownthread工具/HTTP200；其前无focus信封/正文预算断言保持，未趁迁移改其它正式区段。integration C03由核心负责已精确迁移，不重复越权编辑。正式新focused文件覆盖null/partial/extra metadata schema与两内容状态，但本次未执行它。

## 证据与未运行边界

协议README既有记录为新focused6+旧context4=10/10与sourcealias noEmit0；本审查只读，不把它写作再次独立通过。实际Pi/MCP/CLI/全suite/current29与真实授权WAL/无写由独验统一执行，same8工具此处仅源码确认。历史A missingfocus400 probe需新归因版本，原脚本/evidence不能改，本报告未执行或修改历史probe。H-R1须后续独立核实际真实旧版本fixture，不混同三遗失原fixture的not_run。

仅本文件whitespace窄检查，不能当产品验证。无新具体缺陷，无额外架构/性能/全M2或宿主认证声明。完成停写。
