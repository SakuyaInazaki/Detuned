# H-R1 可重复历史兼容回归：只读事实与最小方案

2026-10-06，用户授权补齐可持续回归覆盖。本阶段只读Git/public records/已知项目临时路径，无产品import/HTTP执行/build/install。新的真实历史来源可替代不可重复的工作依赖；不把它叫找回原DB，也不改原日志。机器可核对hash见[事实记录](history-recovery-facts.json)。

## 结论

**精确候选为真实提交 `b8dacd56779a007a2e7045b682bca0c036fdfc44` 的已提交dist。静态核查支持由它的原HTTP产生三类旧成功；需要父授权下一步隔离实际运行确认201，而非此刻填成功。** 不必安装/重构旧源码，也不需要继续无边界寻找原M2.1材料。

| 三类案例 | 候选旧运行字节的可实施依据 |
| --- | --- |
| initial failure 缺 evidence_state | 旧protocol StructuredContentSchema包含 `Type.Record(Type.String(),Type.Unknown())`兜底，因此HTTP接受记录对象；旧ThreadService failure仅检查attempt/category/assumptions数组/tested_scope/expected/observed/ruled_out，不要求state。原旧payload满足这些条件 |
| newpost proposal assumptions:[42] | HTTP CreatePostRequest structured沿上述宽Record；旧PostService只检查assumptions是数组，不检查成员string。原statement/scope/falsification_plan均合法 |
| revision proposal assumptions:[42] | 旧CreatePostRevisionRequest structured相同；旧createRevision调用上述宽业务validator；由第二例实际创建post后expected_revision:1满足首次修订条件 |

真实提交的server/core/protocol/storage全部有dist及package.json；52个packages下JS文件可由 `git show` 精确提取。候选schema.sql与当前schema.sql SHA256完全一致（`7e3f01ada4d5285f62b61c5c9d427a288b1fc3dde7ee4146560ad7a0d22b85be`），包含artifacts/revision_artifacts与schema v2，静态上不需要产品DDL改造。旧bootstrap/current coordinator都保留human actor、initialized、token_secret要求；最终运行还须实际verifyDatabaseStructure/open确认，不拿静态同DDL替代测试。

## 原材料与核查边界

原[首capture](../../2026-10-03-m2-2-a/verification/capture-historical-fixture.mjs)、[附加capture](../../2026-10-03-m2-2-a/verification/capture-additional-history.mjs)、[首public记录](../../2026-10-03-m2-2-a/verification/historical-fixture.json)、[附加public记录](../../2026-10-03-m2-2-a/verification/historical-additional-fixtures.json)保留payload、201结果、rawrequesthash/resultRef/entities/events。三个原requesthash分别3d8414…、8c1a1e…、655c56…，完整值见新facts JSON与原文件。没有读取或打印原凭据。

对232原M2.1产物，候选b8仅111匹配、97不同、24缺失；当前dist150匹配、82不同。因此不能声称此候选是原同版。`git log --all`/reflog可见五真实提交，最近是b8，未见原M2.1未提交实现变成其它提交。已知原temporary DB与credential路径均不存在，其父目录仅detuned-m22a-history-*筛选结果为空。仓库范围只有packages/storage-sqlite/tests/fixtures.db数据库候选，SQLite只读查表结果为空，不是原capture。未发现仓库内zip/tar归档。没有扫描无关个人目录、没有再次运行旧缺失脚本/ENOENT。

这已足以结束找回原样本的事实核查；新H-R1应专注上述三类真实旧服务成功→当前服务兼容回归。

## 隔离与交付最小方法

1. 从固定b8对象提取server/core/protocol/storage的package.json及全部dist到本任务拥有的临时树，逐文件SHA256与git blob提取bytes一致，保存清单/提交ID。**不能直接import旧app路径却让其bare `@detuned/*`解析到当前workspace。** 提取树内部每包node_modules/@detuned/*只指向该隔离树的旧包；外部fastify/@fastify/cors/@sinclair/typebox及better-sqlite3可单独指向现已安装realpath，不链接整当前node_modules，不安装。记录第三方实际版本/realpath，并在运行前通过隔离树锚点解析所有@detuned包，断言不在当前packages/dist；独立旧生成子进程不加载当前产品。
2. 在旧服务真实HTTP初始化空间/初始failure/新proposal/修订，捕获实际三次201、原payload/原key/url/data、DB idempotency hash/ref、entity/event快照与时间。可注入旧app支持的固定clock/idGen使新材料可重建；记录真实生成时间与来源commit，不宣称原232 provenance。原payload结构不修成当前合法。
3. 生成非秘密持久legacy DB及请求/预期/provenance到父指定tests/fixtures子目录。保留真实actor/membership、业务行/原key/rawhash/resultRef，删除生成时credentials与instance_metadata.token_secret，**VACUUM或VACUUM INTO到归档文件**清除已删除秘密的free pages/WAL残留。原随机token/secret只能活在临时内存，最终文件做禁止值扫描（只输出通过/数量，不输出值）；archive没有token/hash/持久secret。记录sanitization仅credentials/token_secret与文件重写，原业务/event/idempotency hash不变。
4. 新正式test每次复制归档到独占临时DB，先为原actor生成随机短命运行token/credential hash，并补随机token_secret，再用当前openAndCoordinateDatabase启动，避免缺secret被误当corrupt。运行时授权补齐仅fixture准备，不改历史actor/idempotency/business。token不保存于repo。比对原业务/幂等记录前后。必要第三方/原git资源不存在要明确失败，不fallback当前旧生成。
5. 新正式test覆盖三类原key201+当前metadata投影/新key严格400（revision原payload先stale409，再仅当前expected_revision→400）、同key改payload409、重启重放、脱敏墓碑投影、撤凭据401；另当前成员/读权限优先可沿既有合同。预期从真实旧response.data与当前合法变化产生，不把新原key返回的request_id当原旧envelope字节。原三日志保留为历史事实，新H-R1成为实际可重复材料。

## 父需要冻结的最小问题

请父确认：采用b8已提交dist为新真实历史来源；指定fixtures目录（建议`tests/fixtures/history-b8dacd5/`）、旧生成脚本所有者与新integration测试所有者；允许上面精确秘密移除/运行时同actor授权补齐。随后授权一次独立旧HTTP真实生成，再冻结provenance交测试作者。此阶段尚未实施生成或formal，不能说已恢复三类可重复验证；成功后重点应报告该覆盖恢复而非继续以原not_run阻塞。
