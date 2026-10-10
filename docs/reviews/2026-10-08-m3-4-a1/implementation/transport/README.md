# B M3.4-A.1 配置/HTTP/CLI交付（源码定向通过，built 待 C 统一验证）

protocol单源WriteRateLimits/schema/default与strictresolver，默认60/20，rate1..60000/burst1..10000，无disable/unknown/unsafe输入；fixeddiagnostic不回显配置。app任何业务构造前resolve，显式仅new一次limiter，注Auth/Idem/Space/Event/Admin、共享clock及app.adminService；不复制业务admission。HTTP只有RATE_LIMITED429且scopeactor/instance+正安全retry_after_seconds≤600000才设置Retry-After整数秒。原poll/export/附件错误与clientretry不改。

CLIserve两显式writeflags，省略各取默认；解析在mkdir/lock/DB/listen前，负数/小数/非法/越界拒且不回显。既有artifactflags仍原校验；没有JSONfile/全局配置或业务process.env。新增write-limits示例/docs04明确replay免/读取pollack内维护免、授权优先、admission后失败不退、进程reset、手工core组装共享meter、非耐久quota。

父授权仅scripts/scale/run-server.mjs固定高负载composition覆盖60000/10000并注释非产品默认；未重跑600s或改历史测量。m2-thread-posts-read60post fixture显式高limit由A负责，directSQL640export材料不耗业务rate且本包无quota，因此不改exportworker。

before-cli.log旧built真实unknown新serveflag，是新增配置缺失事实，非旧业务反例。new m3-write-limits-contract.test.ts五项已写：strictresolver、beforestorageappvalidation、跨space/admin/thread共享actor/replay/read、errormap合规/非法header、builtCLIinvalidbeforemkdir/noecho。首版报告时点尚待 A 真实 exports 就绪后的 source 定向/noEmit；当时未 build/fullsuite。当前源码结果见下方追加记录。统一built5case由C运行。

客户端文档已精确区分单次Retry-After接受上限maxRetryAfterMs默认120秒、整请求timeout默认30秒与maxRetries3；未改client或扩大等待语义。

作者 source 首跑实际 3 通过、2 失败：B03 使用了不存在的 GET /spaces/:id；B05 未跳过 built 专项，旧 dist 不识别新参数。已保留 source-targeted.log，分别改用真实 GET /spaces 与显式 DETUNED_SOURCE_ONLY skip。第二次 4 通过、1 built 待统一验证（source-targeted-second.log）；source alias noEmit 含 CLI 一次退出 0（source-noemit.log）。没有 build/fullsuite。

C 首 fullsuite 的 D07/D08 在公共 seed 恰好消耗 20 写后，新修订/另一空间创建返回 429 而非原断言 201（verification/observed-fullsuite-2026-10-08.txt）。父授权仅此两用例显式 60000/10000，其他用例保默认；保所有业务断言与原失败，窄 diff 见 m2-read-config.diff。该文件一次 source 定向结果见 m2-read-config-targeted.log/exitcode；没有 rebuild 或其他重复检查。新增授权冻结 delta 见 freeze-delta-m2-read.json。
