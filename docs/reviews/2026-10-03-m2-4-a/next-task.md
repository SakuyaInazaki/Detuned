# 下一包内部任务：M2.4-B.1 固定空间修订引用与规则续读

主代理下一轮自主分派开发子Agent，用户无需转发。M2.4-A父已接受：独立263/263、26正式文件、当前版本化29/29；准确范围/证据以本包最终验收报告为准。B.1未开始。B.2帖子/主题正文续读另包，B.1通过仍不代表完整T06/M2.4/M2通过；10万负载在整个读取路径稳定后另裁决。

## 开工流程与所有权候选

先读AGENTS、README、docs00/08/11、progress/最新审查、docs03/04/05/09、本包next-step-facts.md及最终独立报告。先只读核实现接口并提交精确合同，父冻结后才写反例；保存实质before，再获父实施信号开发，有限验证冻结后由独立方验收。父编排范围与验收，子Agent不自行选择架构或开B.2。

业务候选core ContextService/新SpaceRevision读取service、必要StoragePort现读取复用、Clock/TokenSigner与新业务正式测试；协议/传输候选protocol DTO/serializer/OpenAPI/tools、server空间读取route/app、client forum_read、B.1必要CLIcontext/space读取及真实HTTP/工具正式测试。docs03/04/ADR、旧正式测试准确适配与证据所有权由父划分，禁止并发抢文件/构建。默认无DDL/新依赖，若确需扩scope先提供具体依据。

## 已确定的业务行为

1. context必须携带此次readSnapshot对应的固定SpaceRevision定位，使用space.current_revision的**内容revision**，不是policy_revision。保留A统一当前授权/规则/材料/event高水位、事务后同seqcheckpoint，不能退回独立读取造成漏事件。
2. 完整objective/rules放不下时，可明确降为固定ref并声明预算省略；真实有界读取入口必须可接续该固定版。禁止截字符串伪装完整，禁止用历史missing_fields冒充预算省略。不改变已有来源/脱敏/null/固定post ref事实。仍按真实compact HTTP完整envelope计量，同源serializer，最小metadata仍放不下422 QUERY_TOO_BROAD。
3. 新固定space revision读取先核当前身份/space授权；续读重新鉴权，无实体/event/幂等/ack写。绑定不透明签名cursor：actor/space/revision/position、version与独立purpose、TTL86400；复用标准TokenSigner与注入Clock，不自造crypto/新表，不混用搜索或checkpoint用途。
4. 读取预算沿context：整数4096..65536/default12288，计实际HTTPenvelope/真实request_id及JSON转义。Unicode安全分片；合法4KiB应能推进，每页至少推进位置或明确错误，不能空片next_cursor死循环。重组精确等于固定修订的目标/规则，期间更新不得漂移到latest。
5. forum_read接入space修订kind并返回data/meta。现post/thread的cursor/max_bytes没有兑现，不能借schema说明已实现；是否在B.1显式拒绝不适用参数，必须先列兼容面由父冻结，B.2再实现。
6. CLI仅允许本包必要context meta可见及固定space读取接线候选。先列现调用/测试及输出迁移；search cursor、标签CLI、其他列表/读取扩展不在B.1。focus维持明确400，不做线程过滤。

## 下一轮仅需冻结的精确合同

预算范围/default/TTL/标准签名与Clock已经确定，不重新开放。提交至多两个可实施DTO备选，含对应route、请求参数、serializer和客户端接线，不提泛化读取框架。例如可比较：

- **结构化分片页**：固定ref+objective的有序文本片段、rules的rule_index/片段位置、明确当前位置/完成标志、data/meta；逐片按固定索引重组。context完整内容与预算省略用判别结构区分，不能null无解释。
- **固定修订JSON文本流页**：固定ref+encoding/文本chunk及位置/完成标志，先定义唯一待重组文档{objective,rules,...批准字段}的compactJSON；分片只切安全字符边界，重组后解析。HTTP二次转义必须计真实发送bytes，不能按原文bytes估计。

两者均须明确是否包含pinned_refs等SpaceRevision字段；内容revision、policy_revision、created_at等是否为metadata/重组内容，不能擅自全部暴露。父冻结route（新明确revision子资源或其他确定形式）、DTO字段/判别键、chunk单位与完成/缺省语义、cursor精确payload/坏token错误及绑定、CLI输出/旧post-thread参数拒绝兼容。不要直接把上述候选写成既定合同。

## 实质反例与有限验收

父冻合同后先保存旧实现before，不能把helper不存在/import失败当实质行为反例：

- context大目标/规则真实HTTP预算内明确固定引用/预算省略，可经实际HTTP续读重组；新版规则更新后ref与全部页仍旧版。不省meta、不伪造missing_fields。
- 4096/65536/default实际raw body UTF8、真实request_id、中文/emoji/引号/反斜杠/控制字符、多规则与巨大单规则；最小预算推进和最后页完成，不重复/漏字/死循环。最小metadata超限仍明确422。
- cursor tamper、wrongactor/space/revision、过期、撤凭据/成员、未知参数/非法边界；当前授权先于目标泄漏。Clock实际消费验证exp边界，不只看payload。
- 无写/无ack副作用；A跨两SQLite连接受控屏障旧规则+旧seq、接续不漏event回归保持，不用sleep。
- OpenAPI实际route/query/response集合与共享DTO、client/forum_read、Pi官方validator及MCP真实传播；CLI获准迁移输出有meta及可实际续读。没有真实宿主/Node22实测不得虚报。
- M2.3/M2.2/M2.1已验收回归保持，有限定向后父协调全量独立验证，不在子Agent阶段自行全suite或长压测。

## 旧正式测试调整须先报批准

本包tests/contracts/m2-context-contracts.test.ts C01当前“大objective4096→422、65536完整”与tests/integration/m2-context.test.ts C02“大rules4096→422”将因父意图改为可用固定ref降级；先列准确断言/替代真实重组控制组，保留最小metadata422（当前core C07超大request_id可用），不可删掉超限失败边界。原before/after日志及历史probe保持原字节。

tests/integration/m2-knowledge-views.test.ts V06与当前context schema断言需按新判别DTO核对，来源/脱敏/40refs控制组不得弱化；tests/contracts/cross-interface-contract.test.ts当前data.space/rules/checkpoint调用及forum_read既有消费者，CLI输出fixture均先检索精确路径/行和适配理由。新增route自然改变全量目录，必须真实更新正式结构比较，不伪造JSON body或修改旧历史probe。

## 非目标与保护

B.2才做post/thread正文分段；B.1不开发review/artifact读取、M3订阅状态机、M6认证、搜索CLI分页或10万负载，不宣称完整M2.4。保护旧reviews/probes/logs、SQL/schema/历史fixture/hash、archive原字节。禁止commit/push/reset/clean、发布/部署、全局配置、真实研究模型调用或自动启动论坛参与者；用户授权的主代理→开发子Agent分派继续允许。deepseek-brainstorm禁止安装/启用/调用。本轮只写本任务文档，完成停写。
