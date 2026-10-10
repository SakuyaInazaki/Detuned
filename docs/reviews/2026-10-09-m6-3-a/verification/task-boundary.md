# M6.3-A fresh 与根补充合同

源任务书为已封存 [M6.2-A planning](../../2026-10-09-m6-2-a/planning/m6-3-a-task.md)，实际候选见其 [ownership](../../2026-10-09-m6-2-a/planning/m6-3-a-file-ownership.json)。仅记录边界，不构成实现或验收声明。74个现有精确before、14个missing不造placeholder；source库存涵盖packages与modules dist。候选捕获不授权修改全部候选。

根补项：A existing core/services/event-service.ts；A new core/services/review-decision-records.ts；D new m6-review-finalization-independent.test.ts、m6-schema5-maintenance-independent.test.ts及必要historical-v4-review-history.json/README。core helper不反向import module。原schema4 SQL/profile与真正原4 built review/maintenance静态闭包已经保存并逐文件命中本fresh。后续oracle仅从冻结原4 API生成，不从schema5降标签；旧3/2闭包及旧9305 review文件不可写。原材料中明文token/instance secret只在owned临时内存/库，不持久化；安全fixture保存公开synthetic研究rows/typedrefs/精确响应及来源配方。

创建资格=目标作者或当前maintainer/owner；取消资格=request.requested_by或当前maintainer/owner，不能把所有目标作者视为可取消他人的申请。fresh finalize按任务书由requester或当前maintainer/owner并具当前write，currentACL/privacy始终先行。同key原历史确认不重新按后来资格或新policy改变决定，但仍核当前ACL/材料privacy。旧create/cancel和submission确认/compact原bytes形状保留。

有效规则版本按现SpaceService推进policy_revision：objective/rules/review_policy/check_profiles的显式patch，pinned-only除外。版本变动即policy_superseded/stale。verification读取冻结manifest.review_policy.required_checks/policy，不用后来配置重解释历史。

finalize-vs-post修订及finalize-vs-challenge真实竞态允许两合法顺序：finalize先成功则immutable accepted保留，后来的status可superseded/challenged；材料/异议先提交则finalize拒且无半状态。不硬指定哪边赢。冻结policy允许未解决challenge时可accepted，但current_validity仍challenged；负verdict优先open/pending。

strict immutable Decision/View与最小Status按任务书字段；review_ids沿冻结名单稳定一一映射，check_receipt_ids本包严格[]，status固定12 reason codes与优先级。intrinsic stored decision/reference验证与online reconstruct分离。真正RedactionService调用stale helper/status不得借在线privacy造成原红删失败；stored corruption仍安全RESYNC，ordinary材料读取/历史replay仍410。所有stale/decision/event/key须同原业务事务，无private未揭示材料公开事件。

下一compat25若确需schema5适配仅当前目标、第七formal表、历史4 profile；原脚本/预算/断言保留。先新包manifest与精确差分交根批准再执行，当前未运行。

执行资源：唯一D串行窗口，workspace concurrency1、worker1/文件串行；受控必要双child竞态有界并清退。仅既有本机Node/pnpm与短命owned fixtures；不运行VM/Colima/容器守护/浏览器/模型/安装/全局配置/推送。此fresh没有重跑任何M6.2-A成功门禁。A/B实施需根收到READY后另行放行。

根澄清samekey“资格”仅指reviewer fresh eligibility，不跳过当前finalizer权限。实际顺序仍为schema→当前ACL/privacy及当前requester或maintainer/owner权限→samekey→fresh version等；原历史结果不按后来reviewer资格/新policy重解释。
