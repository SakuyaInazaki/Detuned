# M2.2-B Unit A 读取业务交付

本单元只读知识投影，不改SQL/schema/迁移、A写验证、历史hash管线、旧正式测试/证据。最终验收由父代理独立判定。

产品范围：search-service/context-service、新knowledge-projection、StoragePort新增listRelationsByTarget、SqliteStorage只读实现；新tests/integration/m2-knowledge-views.test.ts；docs03与ADR-025。协议导出和DTO由单元B独占。

listRelationsByTarget按created_at ASC,id ASC保留所有目标固定版本，core筛supports/challenges/reproduces。findings只claim、候选上限25；failure/claim作者报告与正式not_enabled明确。历史字段独立检查，null+missing_fields，不伪造category/state/attempt；空数组保留，unverified缺reason标缺项，provided合法可省reason。引用逐固定版同space读取；脱敏墓碑、新旧null、跨space统一unavailable，关系不可读端点过滤。context只合法active summary pin，source状态另列，摘要自身新版原含义保留；任一关系端点脱敏issue/impact null，withdrawn不自动resolved；只public活动。

预算明确保持原单次完整data JSON UTF8计量，再原trim；新增source/关系字段参与计量触发truncated。本单元不宣称最终data/envelope硬限长或M2.4完成。

## 证据说明

- before.log：初始4条因误用CryptoTokenSigner名称而fixture失败，已纠正为实际HmacTokenSigner，不伪称产品反例。
- before-corrected.log：实现前4/4实质失败，覆盖findings混proposal、历史缺项默认、pin/source状态及关系状态缺失。
- after.log：初次新业务7/7通过；后续最终复测结果另列final-targeted.log。
- typecheck.log：首次core编译发现协议DTO泛型重复属性推断type/relation_type为undefined，已交B修真实类型，未通过cast规避。
- core原仅声明protocol，不直接声明TypeBox。父批准protocol导出纯字段/引用shape校验，核心不新增依赖/复制长度枚举表；null/条件/生命周期判断仍core。

新正式V01–V07覆盖：只claim/固定关系/非认证；历史非法类型null；pin-kind过滤与摘要vs来源新版；撤回仍open、任一端脱敏无内容、非public事件过滤；跨space不可见、旧非法source数组null；新增source计入一次预算并触发截断；已知空数组、provided可省reason与unverified空白reason。

本机Node26.3.0/pnpm11.7.0；Node22、真实宿主/模型、干净安装未测。没有修改旧probe，不跑全29、不自行构建全workspace。冻结及最终定向结果见末尾更新。

## 最终定向结果与冻结

单元A源码/测试/本单元文档已冻结，等待父代理独立验收。

- `final-targeted.log`：`pnpm exec vitest run tests/integration/m2-knowledge-views.test.ts tests/integration/m2-typed-writes.test.ts tests/integration/m2-artifacts-core.test.ts`，3文件28/28（7+12+9）通过。
- `final-core-typecheck.log`：`pnpm --filter @detuned/core typecheck` 通过。
- `final-storage-typecheck.log`：`pnpm --filter @detuned/storage-sqlite typecheck` 通过。
- protocol构建由单元B独占完成，本单元未构建core/storage dist或全workspace。统一构建与完整独立验证由父代理协调。

没有已知需要修改旧正式setup的项；没有新表/迁移或范围外产品修改。保留所有中间失败及纠正原因，不将其伪写通过。
