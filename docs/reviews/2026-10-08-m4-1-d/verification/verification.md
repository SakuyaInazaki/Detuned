# M4.1-D 独立验收（父已接受）

本包新增14项正式测试首次 built 专项全部通过（A6+B4+C4）。最终全套569/569、79/79；current29最终组合29/29，组成四门禁、24原始探针及已批准A.1第11适配入口。原第11默认命令未执行，不称其成功。build/typecheck/lint各一次，全套实际两次。

首全套真实527/569、48/79、42失败及一条Vitest RPC timeout，exit1完整保留；413.717秒窗口中电源日志确有357秒clamshell/maintenance sleep。父批准两个最小case复验，2通过、6明确跳过，不计新增；临时caffeinate -i -s随owned命令退出，未改全局电源配置且不宣称能阻止合盖。第二全套50.10秒全通过，随后25探针各一次通过。详细[有限诊断](interrupted-suite-diagnosis.md)、[命令/真实退出](commands.json)与两轮原日志均保留。全套继承40MiB case实际两次，没有另起大材料或600秒/模型/宿主评估。

C四项独验使用真实私有HTTP服务、built CLI、独立client/proxy进程：

- pending及acked消费者停用清退关联批次，研究事件/帖子/订阅/peer保持；重复不存在成功，旧ACK/poll404，同key重订阅获得新consumer按明确start定位，旧epoch消费者仍可清退。
- A受限凭据经A URL删除B消费者403（直接B URL隐藏404）；非owner403且非空业务快照保持。私有TEMP BEFORE DELETE trigger在父删前观察子批次0并RAISE，实际500后消费者/批次完整rollback；finally移除trigger，不写持久DDL或产品开关。
- 非法start/token组合服务400且零业务mutation；真实context签名从T0定位，错误actor/space即使existing consumer仍422；合法复用不会重定位。不改变M3重投续签。
- built CLI空间/主题写与会话输出保持data形状。shared client在真实poll等待屏障后Abort为UserAbortError，资源1→0且无ACK推进。代理确认真实session upstream201提交后丢响应，typed client与CLI各一次请求、各新一行，错误不自动重试。

A两首consumer真实产品反例与修复、作者夹具迭代分别见[作者报告](../author/core/report.md)；C未重复首反例实验。checkpoint根HTTP/tool TObject保allOf共享constraint，核心独立检查；不宣称SDK本地Object必拒allOf。两个[交叉](../author/core/cli-cross-review.md)[审查](../author/cli/core-cross-review.md)无新增阻断。

[完整性](integrity.json)：HEAD、4877旧review、SQL/archive/schema2、五状态文档保持；A8/B6冻结零失配、授权外源码delta0，最终248源码/config/tests。无本包owned worker/CLI候选/私有目录残留，未广泛kill或删除其他历史fixture目录。119新归档文本有限token模式扫描无命中，不等于任意研究正文全脱敏认证。无持久化schema/SQL、锁文件或依赖变更；完整M4仍未完成。

父于2026-10-08接受上述有限本机范围；下一任务见[任务书](../next-task.md)。
