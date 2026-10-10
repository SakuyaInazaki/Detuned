# M2.4-C.1 核心交付（待独验）

2026-10-06，父冻结行为与fresh baseline后执行。产品/正式tests/规范已冻结，精确七路径SHA256见freeze-manifest.json。实现三个产品文件ContextService、StoragePort、SQLite；新增focus业务9项，迁移旧context C03精确标题/foreign404/空白400，旧其余断言保持；docs03与ADR031同步。无SQL/schema/DDL/migration/索引export变化、无无关service变化、无build/fullsuite/安装/commit/push/global/模型。

## 实质before与首失败保留

before.mjs使用已验收B2.2 dist、真实app.inject与memory SQLite：合法ownthread存在但focus400 VALIDATION_ERROR，无focus200且不出focus_thread；命令exit0，before.json/stdout/stderr保留，无凭据落仓库。before-formal新增F01在源代码上真实执行，exit1、1failed/7skipped，明确旧ContextService unsupported400，不以缺import/API计反例。

after-first真实新8+旧7共12pass/3fail，exit1：F04/F08夹具误写ids.uuid（实际generateId），F06全库fingerprint误用rowid遇WITHOUT ROWID表。仅修新夹具为generateId与SELECT全行，无删除任何表/字段比较；after-second15/15、两文件exit0。

追加F09尾裁与实际escaped request_id边界：after-expanded15pass/1fail、exit1，+1未422因为empty新Thread已有thread.created可选activity，正确裁尾可fit。修新夹具隔离最小条件：删除该测试empty Thread对应事件并将空间规则改大使必需规则降级已发生，focus候选四数组确实为空；4K等号返回4096正文、+1必需metadata422。after-expanded-second16/16（新9+旧7）、两文件exit0。首失败与扩展失败均原字节保留，非产品错误，不弱化预算/尾裁断言。

typecheck-first sourcealias noEmit曾包括旧context正式文件，exit2：新专项两unchecked数组索引，以及旧tests/integration/m2-context.test.ts:69/:117 unchecked索引、:105/:106/:110 createPost夹具省body。旧错误在此次发现，未做baseline静态复测，不能声称已证baseline typecheck失败；这些行不在本次批准C03 focus迁移区段，未修改它们。新测试索引明确non-null后，配置收窄为实际core/SQLite源码+新专项（sourcealias含protocol），typecheck-second exit0，不含旧context静态成功声明。独验按原workspace脚本检查另行执行，不隐式build。

每个阶段*.command.json保存精确命令/exit，对应*.stdout.log/*.stderr.log保存真实输出；before.json为实证摘要，source-typecheck-config.json是最终实际配置（首次包含旧context的范围已在本说明披露，命令相同不冒称配置原字节相同）。whitespace窄git diff --check七路径exit0。

## 覆盖与范围

F01同space archived当前Thread metadata/no-focus无key/space ref+checkpoint；F02干扰failure SQL thread过滤前id DESC5，pins固定ref原序重复及跨thread withdrawn source；F03干扰challenge、任一端thread/双端同space/created_at+id排序前10/双端匹配不重复；F04public thread/post/relation归属SQL过滤前最新5与seq上界，输出ASC，space高水位包括无关/非public事件；F05固定revision失效不补满、redacted敏感材料null；F06成功/400/404/401全库表指纹无写，跨space目标与当前credential优先；F07规则省略仍保optional pins、完整escaped envelope<=4K及巨大focus422；F08同步WAL屏障Thread/material/空间高水位同页旧、次页新；F09实际request_id临界/必需422与先activity尾裁后其它保留。原context7继续空间规则WAL/checkpoint真实消费/TTL/规则ref续读等既有行为，正式项不与独验探针累加。

LIMIT窗口非完整历史、SQL VM/CPU硬限；pins/source数组现无cap；focus空间checkpoint不变线程consumer，不调用poll/ack。成功预算不含headers/errors/SDK包装。MCP/Pi/CLI与真实HTTP合同由协议/独验单元负责；未运行四宿主模型/Node22/100k。三遗失原历史fixture仍not_run，与另H-R1真实版本历史线不混为原字节重放。本包实现不等于完整T06/M2.4/M2。冻结停写，独验判定由父统一。
