# M4.1-E 独立验收（父已接受）

本包新增正式16项（A7+B4+C5）首built专项16/16，无skip。必要typed锁诊断修复后，新三files与两旧files25/25、两个旧锁case2pass9skip；重复执行不加新增数。最终全套585/585、82/82；current29最终组合29/29为最新版四门禁、24原始probe、A.1批准第11适配，未将旧原第11当成功。build/typecheck/lint/full各两次，全部真实命令/退出码见[记录](commands.json)。

首全套582/585、79/82三失败永久保留：BKCLI01原parserexit1两预期与E固定exit2不符；artifact原native-striptypes child通过.ts进入新增.js相对依赖缺文件，在业务前loader退出1；真实锁错误被generic安全出口吞掉可操作提示。父批准前两test-only精确适配、第三产品typed固定安全DirectoryLockUnavailableError修复及storage旧regex精确适配。旧m2锁提示assert未删除，锁逻辑/时序不变。见[两fixture归因](approved-legacy-fixture-delta.md)、[小diff](approved-legacy-fixture-delta.json)、[storage精确regex](storage-lock-compat.json)。首source noEmit2只C数组类型推断，显式类型修后0及v2复核0，原日志保留。

C五组实际真实CLI/HTTP覆盖：四种单凭据来源均有效，匿名me401；六来源对冲突与emptyflag均exit2零HTTP。selected missing/link/directory/64KiB+1/badUTF8/control文件拒绝，无fallback/marker泄漏。scanner requiredvalue --json/equals/--、真正terminator、unknown+json与缺值单错误；原生help/version stdout0不读取坏tokenfile。旧publish/relate malformed/null/array/object未知op安全exit2零HTTP；controlled loopback协议坏体与关闭端口失败无rawmarker/unhandled。真实管理员credential成功唯一token仅stdout一次，后续普通me身份有效，断言只boolean/count、不归档token。

新增C第4组真实无DB新root持锁哨兵通过：serve exit1/stdout空，固定中文锁提示无路径/ownerPID，无started、无新detuned.sqlite，staging/object保持；只release自己持锁并清私有目录。A源FIFO是boundedchild而非全CLI，32轮FD观察是本平台有限证据，不宣称所有OS/同UID恶意修改均安全。可信server public DetunedError message/details仍保留，安全出口不等于任意远端研究内容脱敏。

5009旧review、SQL/archive/schema2、HEAD、五状态文档受保护；无持久化schema/SQL/依赖或全局配置改动。全套继承40MiB实际两次，无额外大物料/600秒/模型/宿主实验。A/B v2 manifest已汇合全部匹配，授权外源码delta0；最后stable后仅获准docs04/ADR文档同步。owned进程/CLI候选/私有目录0，有限128新文本token模式0，不是全面敏感性认证。见[完整性](integrity.json)。[A→B互审](../author/token/cli-cross-review.md)及[B→A互审](../author/cli/token-cross-review.md)无新增阻断，父于2026-10-08接受上述有限范围；完整M4未完成。

父于2026-10-08接受本包有限本机结果；下一阶段须经独立事实与契约冻结，不等于完整M4完成。
