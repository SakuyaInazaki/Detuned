# 下一包内部任务：M2.2-B 知识视图与摘要来源状态

供主代理下一次分派给 gpt-6.1-sol 开发子 Agent；用户无需手动转发。M2.2-A 已经父代理依据最终独立报告裁定本机验收通过，具体证据以该包独立验收报告为准，不能据此宣称 Node22 或真实四宿主通过。

## 工作顺序与批准边界

先读最新 AGENTS.md、README、docs00/08/11，再读 docs03/04/05、当前状态入口、此包 next-step-facts.md 与 M2.2-A 最终独立报告。用户禁用 deepseek-brainstorm；不得使用、安装或自动启用。先核实当前代码并只写下一包规划：提交精确 typed DTO 字段/判别键、response schema/client泛型接线、关系读取接口及 context 预算接线计划给父代理。父代理先冻结接口，再分配读取业务和协议两个互斥所有权以及独立验收；未批准前不改产品。

本任务只做知识 view 与摘要来源状态的读取投影。保留 findings / failures / open-questions 三名称、现 HTTP `data` 数组；不增加 summary 路由，不建真理表，不改 DDL/迁移。必要按目标枚举关系可新增 StoragePort 读取接口与实现 SQL，不能据此扩表。规则落 core，server/client/adapter 仅共享协议与传输。

## 父代理已裁定行为

1. **findings 收敛为 claim。** 依据 docs03，从现 proposal+claim 改为只claim；proposal仍可经search/thread读取。尽量保留原 SearchResultItem 字段，新增字段/判别键由开工前 DTO 冻结确定。claim 或无人反对均不代表正确。
2. **作者报告与固定关系。** failure/claim材料显式带作者报告性质。supports/challenges/reproduces列出真实固定 source/target revision、作者/关系创建者、当前relation state。reproduces仅为有来源的复现报告，不推导独立认证。旧目标revision必须明确标示，不能自动当成当前版证据/批准，不自动关闭旧异议。正式review/check仅如实 `not_enabled`，不能用公共帖子或关系计数模拟M6。
3. **历史缺项保真。** 旧材料字段缺失或类型非法，以 `null` 与明确 `missing_fields` 表达；不得补counterexample/provided，不用A新写validator拒绝历史读取或重写旧库。旧原文仍留既有合法读取入口。context recent_failures去掉这两个虚构默认，也不把summary当原attempt事实。DTO空、未知、不合法字段含义要明确并测试。
4. **置顶与摘要来源。** pinned_summaries只纳入同space、固定revision存在、当前active且kind=summary的pin。历史无效pin过滤，不令整个context失败；不改持久pinned_refs或Space写入行为。保留has_newer_revision为摘要自身是否有新版，另增每个source_ref状态及是否出现新版，始终保留原固定引用。withdrawn可按历史读取定位；redacted只墓碑状态、无原文。missing/跨space/不可读统一 `unavailable`，不得泄漏另一space对象存在、标题或current_revision；不能判断新旧时用null，不用false冒充已核查。
5. **当前授权与内容边界。** 新投影先当前space授权。关系端点跨space或不可读，过滤该关系；同space且可授权的redacted只保留墓碑定位与非内容状态，不能回退旧SQL原文/issue/impact。withdrawn不自动解决challenges。context仅纳入既有public事件，不泄漏非public对象ID/载荷。这是既有读取边界，不提前实现M6。
6. **复用与有限预算。** 复用post/revision/relations/pins。新增来源与关系字段须进入现有context预算计算/截断路径；开工前给出具体计划，确认现max_bytes边界及本包新增字段计入。不能借此重做M2.4完整全文预算/检查点或M2.3排序分页、中文FTS性能。

## 所有权候选，待父代理划定

- 读取业务：core search-service/context-service及最小共享投影helper；StoragePort与sqlite-storage必要只读关系枚举；新增view/context业务正式测试。避免改A写入校验与既有幂等管线。
- 协议/传输：protocol search.ts typed响应DTO、OpenAPI响应schema；server现有route必要接线；client泛型；新增协议/HTTP契约测试。client不计算报告性质、权限、版本或来源状态。
- 文档与验收：同步docs03/04和必要ADR；新包独立证据目录。父代理协调分配文档所有权，并安排独立验收、状态结论。

精确文件范围需根据当前代码与DTO批准结果冻结；不预先修改旧测试setup或probe。若旧正式测试断言与父裁定只claim/null等行为冲突，先报告具体文件、反例与原因，由父批准最小适配；保护旧证据不改。

## 最小反例与有限验收

先写能暴露根因的新增正式反例，再修实现，不用只数条目来代替结构与行为证明：

- 三view实际材料；findings只claim，proposal在原合法入口仍可读；failure分类/范围/证据按真实存储投影，报告性质与not_enabled明确。
- supports/challenges/reproduces真实固定双方版本/身份/state；目标出现新版后旧关系标示，不能漂移、不产生正式认证；withdrawn不自动解决旧challenges。
- 历史缺字段、错误类型与空/未知DTO含义：null+missing_fields，不伪造counterexample/provided/attempt，不改变库或历史重放。
- pin指向未知对象、跨space、错版本、非summary、withdrawn/redacted：按合同过滤，context仍可返回；不改持久pins。
- 摘要本身有新版与source对象有新版分别验证；source固定旧版、withdrawn、redacted墓碑、missing/跨space统一unavailable；无法核验新版为null，禁止泄漏标题/currentrev。
- 当前授权；关系不可读端点过滤、脱敏无旧内容回退；context非public事件不泄漏ID/载荷。历史公共定位保留不等于暴露原文。
- 既有max_bytes上下限及新增字段确实计入现预算路径；不宣称已完成M2.4完整预算。
- 保持M2.1流/配额/恢复、M2.2-A三写入口/固定引用/真实历史同key重放回归；非法新写仍原子回滚。有限定向测试、类型检查完成后冻结，由主代理统一安排完整独立验收。

## 非目标与工作限制

M2.3 FTS、排序分页及性能；M2.4全文预算/正文游标/检查点重构；M2.2-A写校验重新设计；M2.3以后包及M3/M4/M5/M6/M7均不在B。正式评审状态机、独立验证认证、附件私有绑定不得虚报可用。

不发布/部署/commit/push/reset/clean，不改全局配置，不调用真实研究模型服务，不自动启动论坛参与者；用户授权的主代理→开发子Agent分派继续允许。保护所有旧reviews/probes/logs、SQL/schema/historical fixtures及archive原字节；不安装禁用技能。不要把未运行的Node22/真实harness检查写成成功。完成规划先交父审批；获准实施后完成有限验证和证据、明确冻结，再等待独立验收。阶段通过不等于整个产品完成。
