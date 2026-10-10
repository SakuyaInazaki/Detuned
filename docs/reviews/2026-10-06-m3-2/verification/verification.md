# M3.2 独立验证

2026-10-06。独立单元 C；父已接受M3.2本机工程结果。最终本机有限验收通过：373/373正式测试、42文件；当前29组合通过。统一build/typecheck/lint各唯一首跑成功；fullsuite共三次，前两次各372/373，授权夹具修正后第三次373/373。所有首次失败保留。未运行模型、四宿主完整认证或额外C2 600秒窗口；完整M3运维/备份恢复不在范围。

## 基线与 before

fresh baseline见baseline.json：HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44，158 source/config/tests、37 docs、5 mutable、3345旧不可变review文件（完整含M3.1）、4 SQL/archive、2 schema，208 tracked+48 untracked dist。首次capture脚本uname序列化夹具错误exit1，修正后exit0，见baseline-capture-attempts.json。

before-explicit.mjs使用既有built产品和真实两个独立client进程：同显式key重放同post、实际posts=1；无key正确VALIDATION_ERROR拒绝。当前source缺自动持久分配/按logicalOperationId恢复，不通过不存在import/API制造反例。首次sandbox绑定127.0.0.1遭EPERM，IPC门禁timeout exit1；授权本机loopback后exit0，原输出均保留，见before-commands.json。

## 新行为与覆盖

A八项、B五项、C六项，唯一新增19正式测试；formal与probe不相加。C实际新server/client与代理进程将成功201提交后的响应丢弃，新client进程按同logicalOperationId返回原post；再次恢复、改body409、不同ID独立写后，SQLite实际posts/revisions/post.created事件/对应幂等记录均恰好2。八个真实store进程同域同时getOrCreate得到同key；对serverNamespace/actorId/spaceId/operation/target及logicalID逐一改变得到独立key。目录0700/文件0600，记录不含临时token或业务正文。

真实client用同actor的两个不同token跨进程恢复同post；撤membership后按当前权限404 NOT_FOUND，不泄露空间且无新增post。该404是既有auth-service非成员隐藏规则。坏文件保持原字节、非目录拒绝、发送前取消都不增加业务POST；GET /me不被算作业务写。

受控getMe response与注入store Promise屏障分别在准备期间setToken，均拒IDENTITY_CHANGED且0POST。pending-store取消不必等待store释放便返回UserAbortError；释放后仍0POST。CLI真实新进程publish/relate恢复、旧显式key兼容、空flag/存在input.request_key冲突退出2且0业务POST。B另覆盖全部publish/relate七分支。built基础入口依赖trace无Node builtin，./node导出独立有效，见node-separation-first。

隔离证据需准确区分：五个scope维度由真实store进程逐字段验证；同actor credential轮换与当前授权由真实业务HTTP验证。10个write wrapper的scope映射独立源码核对，不将store-only字段隔离称全部跨服务业务认证。

## 首失败与修正

build/typecheck/lint首次各exit0。首new-formal命令误列A文件为contracts路径，实际仅2文件11测试；C helper将DetunedError.statusCode误读为status，ACL断言undefined导致1失败。纠正helper和A实际integration路径后3文件19测试，A8+B5+C5通过，C删除membership却错预期403；依据既有auth-service修正为404 NOT_FOUND。最后仅C定向6/6通过。两份初始失败输出保存，均为C验收夹具而非产品缺陷；没有产品变更或重build。

唯一首次fullsuite exit1，实际373项/42文件，372通过+1失败：旧C2 session-chain测试stdout按Buffer逐块隐式转字符串，中文跨块形成U+FFFD，oldSource expected含replacement而固定原文actual完整。确定split-byte独证（[1,4,7]分段）复现旧decode损坏，StringDecoder恢复，无产品执行，见utf8-fixture-proof。父授权B仅修该旧test的stdout/stderr流解码，保留业务断言及全部旧不可变C2材料；后续必要重跑另立记录。

current29剩余25旧probe唯一运行各exit0；首组合为28通过+1 fullsuite失败，不登记29/29首跑成功。所有stdout/stderr保存新M3.2目录，旧脚本与输出未改。

## 独立源码审查与边界

基础client只增加可选write准备层，仍由现request传输实现timeout/取消/有界retry，服务端唯一判断当前权限/规范化业务hash/幂等结果。10业务wrapper字段对应实际目标；subscribe保持consumer_key不混业务恢复键。每次getMe获取actor，不持久/缓存token身份；safe namespace拒userinfo/query/hash。logicalID保留原文且≤512 UTF8 bytes，不用payload hash推测有意操作。

文件store先写自有随机temp/fsync，再hardlink无覆盖final；竞争EEXIST读取strict合法winner，目录sync后返回；finally仅清自有temp，final任何结果都不删。文件16KiB界限、v1完整字段、元组与随机key格式、同uid/0700/0600/no-follow均核对，损坏拒绝。目录仍是本机受信边界，不能抵挡同uid恶意替换；metadata也暴露对象关联。成功、失败、cancel不隐式清key；手工删除final会丢恢复依据，崩溃temp需人工清理。此为可选本地恢复，不是跨宿主exactly-once或介质备份认证。

## 旧夹具修复后的第二窗口

B仅在旧session-chain stdout/stderr监听前setEncoding('utf8')，业务断言、seed与历史证据保持；B授权loopback定向1/1通过（其sandbox首次EPERM另保留）。C重捕stable-before-fullsuite-corrected后第二次fullsuite，仍exit1：373/42、372通过+1失败，旧C2现通过；新B KCLI02默认5秒测试门禁超时5095ms。该case多个真实CLI进程串行走七分支，先前定向约2.7秒，首次fullsuite约5.0秒。本次是测试deadline失败，未见业务断言失败，不能当作产品规则反例，也不覆盖前次记录。父决定由B调整合理有界测试/子进程门禁后再执行必要检查。

第二窗口前后165 source/config/tests、38 docs、5 mutable全部逐hash稳定；3345旧证据、4SQL/archive、2schema仍完全保持。见stable-before-fullsuite-corrected.json与stable-after-fullsuite-corrected.json；此稳定声明不跨获准UTF8测试修复混用快照。


## 最终第三窗口与签收

B仅KCLI02设置30秒有界case timeout，并为每个CLI进程设置10秒门禁、超时杀进程/拒绝、正常close/error清timer，无业务断言修改或自动重跑。定向实际1通过+4跳过；C重捕新的stable-before-fullsuite-bounded，必要第三fullsuite exit0：373/373、42文件，KCLI02实际5380ms。正式新增19项已含373总数；不将定向/旧probe/作者测试重复相加。统一build/typecheck/lint未重复，旧25probe未重复。当前29组合现在通过，first组合28/29与两个失败suite仍真实保留。

最终执行窗口165 source/config/tests、38 docs、5 mutable前后完全稳定；HEAD不变，3345历史证据（完整含M3.1/H-R1/C2）、4SQL/archive、2schema与全部历史tests/fixtures资产保持原SHA256。baseline→final仅授权源码/新测试及一旧UTF8夹具改变；正常构建tracked dist10文件改变，新增独立Node产物12，无其他dist删除或改动。完整逐文件变化见integrity.json；check-integrity.py实际exit0。后续父验收状态文档更新不属于该零变化窗口。

临时server/client/proxy/store-worker由fixture finally关闭，运行目录由fixture删除；长期证据不包含实际token、Authorization或业务响应凭据。新verification文本91文件首次模式扫描、整个新M3.2包139文本文件最终扫描均无literal credential；这是有限源码/证据检查，不宣称整个历史目录已全面秘密审计。当前无M3.2已知业务故障；故障记录中的sandbox EPERM、C验收预期/字段错误、旧UTF8流decode、CLI测试门禁不足均明确保留归因。

无commit/push/reset/clean/安装或全局Agent设置变更；未调用模型/被禁止技能。下一M3.3脱敏/离线备份恢复/导入迁移与M3.4限额运维继续待独立任务，M3整体没有因此完成。
