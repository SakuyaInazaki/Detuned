# 下一任务：M2.4-C.1 主题聚焦上下文

2026-10-06，父已审阅批准的下一包任务书。**这是下一包范围与行为决策，不是实施许可；当前M2.4-B.2.2限定本机工程交付已被父接受并继续冻结，C.1尚未开工。** 本文件不声称C.1已开始实现、通过验收或完整M2/T06完成。大负载仍后续。当前能力事实见[focus查询核对](planning/focus-query-facts.md)，事实核对不替代本任务书的父决策。

## 入口与目标元数据

复用现GET context、forum_context、client与CLI已有focus_thread_id/--focus-thread参数，不增加新入口。省略focus时现响应形状与行为保持，不加null占位或新字段。显式非空有效focus在同一个同步readSnapshot内：刷新当前身份→空间read权限→查Thread且所属同space→读取材料及空间高水位。不存在或跨space返回404，open/archived均可。focus为空（包括纯空白）/非字符串继续400，duplicate/unknown仍transport400。

仅聚焦成功响应新增data.focus_thread，为当前Thread完整只读metadata；title不套新写上限。目标metadata、材料、checkpoint高水位同snapshot，编码后不读DB。空间规则/ref/policy仍空间级，checkpoint沿现space high-water用途与TTL，不变成thread消费者，不改poll/ack。

## 父已决定的材料筛选

- pinned_summaries只保原已合格summary固定ref且pinned Post自身属于focus，保stored顺序与重复。sources可跨thread，完整保现安全投影；不从source thread反推pin归属，不自动摘要。
- recent_failures复用内部searchPosts(spaceId,'',{kind:'failure',thread_id:focusId},5)，按现id DESC候选窗口，继续active/current安全投影。明确不是created_at排序。
- blocking_objections选open challenges，source与target两个Post都须同space，其中任一属于focus。SQL中关联过滤在LIMIT之前，按created_at ASC,id ASC取确定性前10候选，每relation仅一次。随后沿原安全投影；withdrawn/redacted/ref不可用规则不改，不为补满扫描全库。
- recent_activity选public的thread.*本体、post.*所属thread、relation.*任一端点thread。归属规则与现subscription相同，不能调用poll。SQL内先过滤，seq不超过同snapshot space high-water；取最新5候选，输出再按seq ASC。space/artifact/review/check事件不混入focus。禁止空间先取N再filter伪装聚焦。

5/10是候选窗口，不是完整历史，也不增加context分页cursor。

## 存储窄扩展与工作预算限制

允许针对两缺口新增窄StoragePort与SQLite方法：有序有界thread open-challenge候选、public thread关联event候选。实现者在planning提出精确名字/签名交父冻结，不能自行扩大查询架构。参数化SQL、同步readSnapshot，沿现对象PK/space-seq索引；本包禁止schema/DDL/migration或泛化查询框架。其余查询复用既有方法。

候选LIMIT和输出预算不是SQL VM或CPU硬上限。pinned/source数组现无cap，本包维持，不称全部读取工作已被硬性限制；规模问题仍须后续实测。

## 完整envelope预算

沿现max_bytes4096..65536/default12288、实际request_id完整compact envelope计量与共享serializer。focus_thread是必须metadata：必要最小响应过大仍422，不删必需focus，不拆字符串。空间规则/ref降级与activity→failure→objection→pins尾裁顺序沿现。truncated维持仅预算删除或规则省略含义，不表示窗口以外有无全部历史，不发新分页cursor。

## 兼容迁移与证据

允许修改旧formal的范围仅为当前“任何focus都400”断言的确切区段：合法ownthread改200，unknown/foreign改404；保空值、重复、授权先验及无focus基线。修改前必须逐段列清单交父确认，另新增独立focused正式测试，不弱化旧语义。

旧历史probe/evidence原字节保持。下一包先枚举是否含unsupported假设；确有冲突仅新增带归因的版本probe，不把旧脚本因新语义失败记成回归通过，也不删检查。**本任务书写入阶段不执行此审计。** 原历史not_run材料缺口保持原归因，不触碰、不补造。

## 验收与编排

实施前真实before，先新增真实反例后实现。最终统一独验/fullsuite报告实际动态计数，不能沿用前包数。至少覆盖：

- 多thread干扰材料证明SQL LIMIT前过滤；关系双端匹配去重、固定revision、跨thread summary source_refs、撤回/脱敏与archived。
- 当前权限、未知/跨space目标、空/非字符串/重复/unknown参数；metadata与空间高水位双WAL同页snapshot；读取全库无副作用。
- 实际HTTP完整4K边界与巨大focus metadata422；规则ref降级/尾裁顺序；无focus响应与行为前后兼容。
- MCP、已安装Pi SDK与CLI现命令真实focus链及省略focus链；这不等于四真实宿主模型实测或供应商认证。

按三单元明确所有权：core+storage负责业务/窄Port与SQLite查询/业务专项；协议接入负责共享DTO/schema/serializer、HTTP/client/工具/CLI及新合同/规范示例；独验负责fresh保护清单、统一构建/fullsuite及真实跨入口证据。每单元动文件前划定精确边界，旧formal修改另经父确认。

不commit/push/发布/部署、不安装或改全局、不调用模型，不使用deepseek-brainstorm，不触原历史not_run。C.1只实现主题聚焦上下文，完整M2/T06、规模验收及其它里程碑仍后续。

## 日期schema验证经验

B.2.2独验首工具probe因本地TypeBox未知date-time format失败，原证据保留。下一包SDK/page schema校验应先对实际发出的时间戳做严格UTC ISO毫秒/Date.parse/toISOString检查，再局部登记date-time validator并在finally恢复原FormatRegistry；不能恒true或删完整schema断言。原ADv2日期ignored结构门禁不称格式认证。此经验不扩大C.1实现范围，也不授权此刻运行审计或实现。
