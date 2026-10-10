# 下一任务：M3.4-B.1 安全日志、最小健康与管理员运行统计

父已确定运维拆为连续自动推进的B.1与B.2；技术接口、默认logger/字段、认证/port/数值在下一包fresh后由父一次冻结。A.2已由父接受主库页分配与全状态登记附件额度的有限运行范围，接受状态与证据以[本包README](README.md)及[独立验证](verification/)为准，不复制计数。事实入口：[operations-facts](planning/operations-facts.md)、docs07 §5、docs08及docs09 T12/T13。主代理编排、gpt-6.1-sol子Agent按owner实现，不实施本文待冻能力。

## B.1 有限范围与开工冻结

实现安全结构化日志有限sink；可信服务requestID和route模板operation，不写raw URL/query/header/payload/errorcause。actor字段只来自当前已认证context，空间标识与权限/失败可见性须父冻结；未鉴权不从token或用户JSON填身份。字段/默认logger/sink容量与故障策略一次选定，不直接开启未经审查的全文默认request日志，也不预建B.2空shutdownframework。

健康liveness/readiness只Boolean/状态；liveness不访问模型，readiness核已支持schema/连接及数据目录可用性，固定安全诊断，不泄漏文件路径、token或材料。路由精确匹配与免auth/需auth边界、权限和实例管理员统计入口待父冻，不能沿raw URL后缀猜健康路由或突破既有认证。正常运行/关闭中状态如何变化下包明确。

实例管理员统计只有限SQLite pages/page_size/freelist/max、WAL NOOP frame观测和受限正规文件stat，逻辑pages与physicalDB/WALbytes分开，不checkpoint、不循环扫目录或全研究历史。A.2usage有界sentinel/BigInt需安全JSON形状，不能伪装精确无界count。持reader仅报告可观测backlog/大小/活动reader数，不推断根因或承诺WAL回收；未知/无WAL与busy/错误状态明确。storage port、可支持平台/路径边界及stats数值shape先核现实现后父冻。无新依赖、schema、daemon或WAL硬配额。

最小真实验收：日志含敏感字面帖子/token/header/URL时仍只白名单；可信ID/route模板不接受用户注入换行；sink失败/背压有界不改变已提交业务与凭据返回；live/ready固定状态和adminstats匿名/普通身份拒；坏连接/schema/目录不健康但无敏感回显；file-WAL私有固定reader+write验证NOOP不checkpoint、逻辑/物理与backlog如实区分。作者定向、独立oracle及统一门禁保首失败与条件，未跑不写通过。

## 紧接B.2 有界关闭与活动资源回收

复用现events/export preClose，不重新建消费/export框架。补上传stage取消集合、下载stream跟踪和已交core finalization/cleanup追踪；停止新请求，drain完成之后才DB.close，再严格DirectoryLock.release。原CLI与lock吞错要有明确失败退出，不将close异常统exit0。

预算/强制非零退出/重复signal/监听清退及各故障边界由父下包裁定，不自行选择强制策略。超过deadline而finalization仍活时不能先关DB放锁后留异步mutation继续；同步nativeSQL/文件调用无法JS timer抢占如实报告。真实signal+长poll/export/慢multipart/download、publish未commit受控屏障、budget超时、app/db/lockclose故障与重启stale锁/孤儿恢复需有限实测，无产品任意执行fault面。先划owner不扩大到offline维护或新全局设置。

## 后续gate与里程碑

兼容gate复用已接受A.1的[current29第11适配](../2026-10-08-m3-4-a1/verification/adapters/check-unfinished-contracts.mjs)、[manifest](../2026-10-08-m3-4-a1/verification/adapters/manifest.json)及[diff](../2026-10-08-m3-4-a1/verification/adapters/adaptation.diff)。保旧原script、默认20撞U07高量seed的失败条件与输出；不反复修改历史材料，不把适配当原命令成功或替代默认限流验收。

B.1/B.2完成后父对docs09 T12/T13按受支持v1→2、current备份恢复、逻辑import及脱敏真实路径逐项核，列剩余缺口；不宣称任意历史版本/任何平台全通，也不以无限兼容要求拖住已支持里程碑。WAL长期策略、全目录物理硬cap仍未实现，不能将M3.4-B有限运维写成这些能力已完成。
