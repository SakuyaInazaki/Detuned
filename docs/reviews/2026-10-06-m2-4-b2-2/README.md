# M2.4-B.2.2 有限本机工程验收通过

2026-10-06，父依据双向代码审查、D08修复关闭及[最终独验](verification/verification.md)接受本包限定本地工程交付。当前版本是core原5路径与protocol v2 10路径，[v2指纹确认](verification/freeze-verification-v2.json)、[版本过渡](verification/version-transition.json)记录精确hash；未commit/push。

新GET threads/:id/posts、forum_read thread_posts、getThreadPosts与CLI thread posts返回有界metadata整page，目录id/current_revision接B.2.1固定stored正文。旧HTTP/client裸id cursor分页、旧tool/CLI默认首批data输出保持。目录只有Thread/Post元数据，不聚合全文；动态id ASC不承诺跨页固定全集。truncated只预算尾裁，limit-only false可有cursor；cap计真实compact HTTP envelope，不含headers/errors/SDK/pretty包装。

## 最终证据

- 唯一fullsuite **311/311、32文件**，本包core10+contracts8已含总数；typecheck/lint通过。[正式stdout](verification/observed-current29-03-2026-10-06.txt)
- 当前**29/29**，build引用必要route修复后的v2。独验**48命令=47 exit0+1 exit1**；产品构建共2次，v1结果保留而不冒充v2重跑。[覆盖](verification/coverage.json)、[原命令表](verification/current29-manifest.json)、[实际执行](verification/commands.json)
- 原PR3/SR4/SQ/KV共9脚本按原路径exit0。ADv2/AE实际**38operations/38routes、20body=19JSON+1multipart、placeholder0**；36条date-time ignored不称格式认证。
- [HTTP v2](verification/observed-tp-http-v2-2026-10-06.txt)：91stored metadata，两种storage hasMore场景均8页重组、limit-only91页、换limit/budget与默认各3页；真实req.id转义预算与无法推进422、首TTL等号/+1、当前lifecycle/archived、无正文/无写。
- [独立cursor次序](verification/observed-tp-cursor-order-v2-2026-10-06.txt)：空/空白/4097cursor权限/目标先验，正确目标固定400；非member/目标404、无read403，重复/unknown仍transport400。
- [tools产品v2](verification/observed-tp-tools-product-v2-2026-10-06.txt)：安装Pi0.87.1 validator→executor、MCPstdio、真实client/CLI；目录8页接固定正文7页、head更新固定、redaction后旧body cursor410；8工具与旧thread50首批data兼容。[WAL首证据](verification/observed-tp-wal-first-2026-10-06.txt)沿未变core/helper指纹保留，最终fullsuite包含core10，不称另跑v2 WAL。

## 失败、版本与保护

[协议交付及修复](implementation/protocol/README.md)保留首次format/test typing/TypeBox symbol比较失败；[D08首红](implementation/protocol/repair-d08-red.stdout.log)是一个正式测试11条差异，不是11formal；[绿色8项](implementation/protocol/repair-contracts-green.stdout.log)修复仅新route及新contracts。原[v1 manifest](implementation/protocol/freeze-manifest.json)保留，[v2 manifest](implementation/protocol/freeze-manifest-v2.json)新增，两source路径变化见version-transition。

独验[工具首失败stderr](verification/observed-tp-tools-first-2026-10-06.stderr.txt)因Unknown date-time format，原[probe](verification/check-thread-tools-cli.mjs)保留；[局部严格日期修正版](verification/check-thread-tools-cli-v2.mjs)对真实emitted UTC ISO毫秒/Date.parse/toISOString检查后登记并finally恢复registry，完整schema断言未删。不能称全流程零失败或日期认证。

[integrity](verification/integrity.json)最终验证窗口129source/36currentdocs/5mutable、2492旧证据/4SQLarchive/2schema零变化/新增/删除。HEAD保持b8dacd5。[构建产物](verification/build-artifact-delta.json)最终208tracked dist/48untracked，正常构建产物不删除；状态收尾九文档变动发生验证窗口之后，单列[覆盖审计](coverage-audit.md)，不能反写成独验时零变化失实。

## 限制与下一包

三遗失原真实历史HTTPfixture持续not_run，原临时DB/凭据丢失，同版原字节重放材料未恢复；当前合成stored shape与原脚本不等于原capture重放，旧成功记录独立保留。Node22/干净安装/远程CI/四真实宿主模型会话/100k–1M事件–20客户端长压测未跑；SDK/stdio/Pi工程链不等于真实宿主会话实测。候选≤100逐尾裁不称SQL VM/CPU硬cap。

focus仍400。完整M2.4/T06/M2及M3–M8未完成；[C.1主题聚焦上下文任务书](next-task.md)父已批准，尚未开工、非当前实施许可。见[当前功能状态](../../progress.md#当前功能状态与未完成能力)、[交付索引](implementation/README.md)、[核心交叉审查](planning/core-cross-review.md)与[接入交叉审查/修复关闭](planning/protocol-cross-review.md)。
