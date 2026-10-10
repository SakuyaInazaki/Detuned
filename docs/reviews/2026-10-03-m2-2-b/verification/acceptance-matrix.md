# M2.2-B 独立验收准备矩阵

准备状态：只读取规范与当前源码，尚未运行产品检查。精确 DTO 已由父代理批准（planning/contracts.md + 最终补充消息）；探针已准备但未执行。上包全部未提交实现与构建产物是本轮真实基线，禁止 reset/还原。

| 编号 | 有限场景 | 独立可观察断言 |
|---|---|---|
| KV01 | findings / failures / open-questions 三 HTTP view | 名称、data 数组不变；findings 只 claim，proposal 原 search/thread 仍可读；报告性质与正式模块 not_enabled 明确，claim/无人异议不等于正确。 |
| KV02 | supports/challenges/reproduces 对固定旧版目标；目标后来新版 | 双方准确 revision、作者/创建者、当前 relation state；旧目标标示不漂移；reproduces 只是有来源报告，无独立认证；withdrawn 不自动 resolve challenge。 |
| KV03 | 历史字段缺失、错类型、未知枚举与合法空数组 | null + missing_fields，不能伪造 counterexample/provided/attempt；读取不跑 A 新写 validator、不写库、不改变历史重放。空与非法按批准 DTO 区分。 |
| KV04 | pin 为正常 summary 固定旧版，另含未知/错版/跨空间/non-summary/withdrawn/redacted | 只 active 同空间 summary 合法固定版纳入；无效 pin 过滤，context 返回，不修改持久 pinned_refs。 |
| KV05 | summary 自身新版、source 新版、withdrawn/redacted/missing/跨空间 | 摘要自身 has_newer_revision 与各来源分别表达；固定 source 原引用保留。redacted 只墓碑状态；不可用统一 unavailable，无法判断 newer 为 null，无标题/current_revision 泄漏。 |
| KV06 | 当前成员/credential/space scope 门禁与关系不可读端点 | 请求先授权；跨空间/不可读关系过滤；同空间 redacted 无 issue/impact/旧正文回退，公开定位不扩张原文可见性。 |
| KV07 | context 中 public 与 nonpublic 事件混合 | 仅 public 纳入；private object ID/载荷均不泄漏；不把未实现 M6 私密模型作为必要新功能。 |
| KV08 | 4096/65536 max_bytes 边界，新增来源/关系字段造成已有预算超限 | 输入边界保持；新增字段进入实际字节计量与现有截断路径，非仅文档声明。原已有完整正文/envelope/检查点预算缺口标为 M2.4，不自行扩大本包。 |
| KV09 | M2.1 / M2.2-A / 幂等及历史稳定回归 | 当前 versioned 29 与全套 formal；A 的三新写/固定证据/历史原键重放及附件回归保持。SQL/schema/profile/archive 与先前所有审查证据原字节。 |

最小独立反例方案（已写 check-knowledge-http.mjs，稳定冻结后执行）：

1. 一项 proposal + claim，三 view 实际请求证明 findings 收敛但原 proposal 读取未丢。
2. 支持/挑战/复现各一条指向目标 revision 1，目标推进 revision 2、作者撤回；核对固定引用及状态，不以条数伪造认证。
3. 真实历史缺 category/state/attempt 与错类型材料，检查 null/missing_fields 以及全 DB/event/idempotency 快照无变化。
4. 一个固定 summary pin 加几种无效 pin；source 分别新修订、撤回、脱敏、跨空间/缺失，检查保真/统一 unavailable 与机密 sentinel 缺席。
5. public/nonpublic 事件和不可读关系端点，用 ID/正文 sentinel 检查视图与 context 返回无泄漏。
6. 现有合法小预算下，增加已批准来源字段明显增长数据；测新增字段被纳入计量并触发既有截断，不扩展全文检查点实现。

执行等待：父代理 DTO 批准与所有实现者明确冻结后，先统一 build，再 current-commands.json、全正式与有限新探针；stdout/stderr 分列、UTC/真实 exit/失败快照全保存。只修改自有 probe 夹具并保留失败，具体产品问题上报父裁决。

基准事实：M2.2-A current versioned 29/29 成功（含 M2.1 ADv2），原 R21 JSON-only 历史命令 28/29 属保留诊断；不能改旧脚本或把原旧结果写成全绿。Node 22、干净安装、远程 CI、真实宿主/模型未运行。M2.3/2.4/M3/M6 后包未实现能力不作为本包新增需求。

批准补充：context 任一关系端点 redacted 则 issue/impact 均 null+missing；redacted newer=null。unverified 的缺失/空白/非法 reason 均 null+missing；provided 合法省略 reason=null 且不 missing。预算只把新增字段计入一次既有 JSON 测量/trim，不承诺硬上限或二次测量。
