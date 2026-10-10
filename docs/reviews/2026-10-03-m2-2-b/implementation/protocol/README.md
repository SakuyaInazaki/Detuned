# M2.2-B Unit B 协议/传输交付

2026-10-03；按 [唯一接口冻结](../../planning/interface-freeze.md) 完成，产品与正式测试已冻结。父Agent方案/分派/验收，GPT-6.1子Agent执行；此处不是独立验收结论。

修改范围：`packages/protocol/src/search.ts` typed view/material/source/relation/context DTO与纯基础字段/ref guards；`protocol/src/openapi.ts` response components/envelope挂接；`client/src/client.ts` getView按name泛型、getContext静态类型；新 `tests/contracts/m2-knowledge-view-contracts.test.ts`；[docs04](../../../../04-protocol.md) 与 [knowledge示例](../../../../../examples/knowledge-views.md)。现有index已export search，现route原样返回core data，无需server route修改；没有Fastify serializer/runtimeclient验证。

DTO保留三view的data数组和原SearchResultItem字段；type=claim/failure/question/open_challenge。历史material nullable+missing_fields、作者报告与正式not_enabled；SourceStatus的redacted/unavailable新版必null，relations固定双方ref/作者/creator/state/version与旧版标识，任一端redacted的blocking issue/impact均null+双missing。pin摘要自身has_newer_revision旧语义保持，另source状态；source_refs缺/非法null。client泛型不计算权限、来源或研究认证。

protocol纯guards仅复用既有基础schema：isHistoricalMaterialField、isPostRef、isPostRefArray(min1)。core不新增TypeBox依赖；null/missing、unverified条件/非空白与生命周期由core判定，不重验或迁改历史新写。TypeBox schema属性覆盖用Omit精确表示Object spread替换，避免重复literal交叉导致公开类型变undefined；没有cast核心对象掩盖错误。

## 真实定向证据

- [initial-tests.log](initial-tests.log)：新增4组反例失败，涉及当时尚无新DTO导出及旧HTTP setup；不是4个已部署产品故障。初次HTTP pin缺expected_revision未到达view语义断言，不能假称已经复现只claim业务错误。
- [intermediate-tests.log](intermediate-tests.log)：3/4通过，HTTP pin漏既有expected_revision返回400；只修新夹具，不改产品规则。
- [pre-final-tests.log](pre-final-tests.log)、[diagnostic-tests.log](diagnostic-tests.log)：结构schema里的既有date-time format未在TypeBox登记导致Check false，实际claim HTTP返回结构正常。新测试按安装版AJV忽略该format的结构模式局部登记、finally恢复原registry；不宣称日期值格式已验证。
- [final-tests.log](final-tests.log)：4/4通过。B01 source/flat relation与红删两端null强约束；B02历史nullable材料与基础guard正反例；B03数组map/OpenAPI+client类型；B04真实HTTP创建材料/关系/summary pin并读三view/context，共享TypeBox/AJV/OpenAPI一致、onlyclaim与question/open_challenge异构，未授权401保持。不是真实宿主/模型认证。
- [protocol-typecheck.log](protocol-typecheck.log)、[protocol-build.log](protocol-build.log)、[client-typecheck.log](client-typecheck.log)：对应定向命令通过。先独占protocol构建通知A消费，再各单元检查，未跑全仓build/29。
- [contract-types.log](contract-types.log)：`pnpm exec tsc -p .../contract-tsconfig.json`通过，编译新正式测试的literal/dynamic ViewName泛型与ContextResponseData断言；[配置](contract-tsconfig.json)仅本证据目录。[initial-contract-types.log](initial-contract-types.log)保存首轮专用配置未解析root未声明的Fastify/server/storage模块，补既有workspace路径后通过，未新增依赖。

[before.json](before.json)/[after.json](after.json)为本单元范围SHA256；[document-checks.log](document-checks.log)保存本地链接检查，局部git diff --check通过。初次与最终日志保留，不覆盖旧review/probe/log。未改core/storage/旧正式tests/DDL/schema/archive/全局配置，不commit/push。

## 边界

历史材料业务、当前ACL、固定版本/跨space/redaction与public活动过滤由A负责，独立方统一验收；静态DTO不冒充业务证明。新增关系/来源由A计入原一次result字节测量与既有truncated路径，不承诺完整envelope硬限长/M2.4。Node22/cleaninstall/remoteCI/四真实宿主/模型未测；M2.3/M2.4/M6不在本包。产品/正式测试已停写，等待父Agent独立验收。
