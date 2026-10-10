# M3.3-B.2 C 基线与独验建议（路线未冻结）

2026-10-07。C已读最新AGENTS/README/docs00/08/11、progress/reviews、B.1 next-task与B.2 facts。仅当前verification目录内脚本/记录已写；不改产品、旧tests/helper、历史fixture、旧review、用户dirty或dist。禁止deepseek-brainstorm、安装、全局配置、模型、commit/push/reset/clean。

## Fresh基线

baseline.json记录真实HEAD `b8dacd56779a007a2e7045b682bca0c036fdfc44`、全路径dirty inventory、运行环境与逐文件sha256。fresh181source/config/tests、40currentdocs、5mutable、SQL/archive4、schema profiles2、tracked dist208/untracked92。全部旧review重算3763，包含B.1整个140文件；不能沿用前包3623。git status --untracked-files=all2604条（191 M/2413??）原样保存。baseline-summary.json为非敏感数量摘要。当前本轮build/typecheck/lint/fullsuite/current29/产品实验全部not_run；前包414/48/current29是既有接受事实。

已读前包commands与29列表：统一build/typecheck/lint/fullsuite单列，随后25只读retained probes，stdout进新verification。待父冻结且作者停源码写入后才能统一执行；新包不覆盖前包命令、metadata日期或输出。不用缺新import/尚不存在符号的编译报错冒充产品行为反例。

## 建议四组独立真实验收（待父取舍，未创建tests）

1. **真实导出→本地CLI导入→新服务闭环。** Source是真file-WAL服务，HTTP/sharedclient导出固定多修订/跨主题关系/resolve-reopen历史（resolution输入ID顺序可反版本），真实新CLI导入后另一server/client进程读取、搜索与重新导出；以独立DB/业务接口核稳定对象ID、修订/关系版本/固定refs、projection/tombstone。来源actor全部禁用且无credentials/memberships/session/reviewer资格，旧token不继承，新本地human admin独立可签普通身份并完成新写。原材料不执行；未知研究正文保持，不能把未知字段保留称泄漏产品内部凭据。
2. **完整链不等于合法业务材料。** 从真实v1重新编合法链制造重复ID/缺FK/缺current revision、跨space已知refs、关系/解决版本不一致等少量语义反例，另截断/未知版本代表性真实CLI拒绝。验证源NDJSON原字节不变、没有正常ready实例；不与B完整decoder语法矩阵逐项重复。墓碑缺body/hash与sourcehash/projected本地表示按父合同设oracle，不擅补成伪源正文。
3. **附件与文件边界。** 按父所选输入语义检查ready manifest缺bytes必须明确missing或拒、redacted/missing墓碑不复活；如果批准显式本地bytes，再测匹配下载、hash/size不符、越界/软链拒绝，绝不抓content_url/任意正文URL。可用固定本地trap计数证明无HTTP抓取，不连公网。既有目标/源目标canonical别名/软链拒绝且既有sentinel和源输入不变。
4. **受控取消与完成发布故障。** 在父提供的固定阶段用private IPC/同步hooks屏障，在验证/事务/文件sync/发布/readiness前后注入少量代表故障或真实进程取消，独立init/serve gate核半套拒启、无覆盖、source保持。不用sleep猜时序，不接受任意命令/函数IPC。post-unlink最终sync+marker重建失败若完整材料可启，只能记持久性/token交付未确认，不重写成半套损坏。ready后stdout前crash也不是部分数据实例，另新目录重导入的处置由父冻结。

建议未来C文件路径供父冻结：tests/integration/m3-logical-import-independent.test.ts、tests/helpers/m3-logical-import-worker.mjs（固定server/client/import-worker，不任意shell）。此阶段只建议，不创建。A正式业务/存储semantic与B decoder/CLI contract由作者负责，C集中真实进程与独立业务oracle，四case/场景数量不预填通过。

## 需父冻结的风险/边界

- 当前导出含source actor IDs但无账号属性/权限；当前schema SQL必填/FK以及墓碑缺字段必须明确安全本地表示，不能绕过FK或复活原身份、原文、正式批准。
- SHA链只完整性不认证可信来源，输入可合法链却恶意语义。重复/缺失/版本/跨space引用应在staged数据库完整校验；不把语法schema成功当业务合法。
- 当前无专用import provenance/status字段，source_content_hash在projected时缺失。元数据/本地hash/再导出source_semantics由父/A冻结后C才设期待，避免镜像实现假验收。
- 只新不存在目录还是已初始化空实例，附件缺bytes策略、稳定ID冲突、bounded读取/限额/取消、一次admin明文输出、故障hooks和ready点尚未冻结，C不自行选路线。
- Source/framing input可能末行才失败；provisional材料不能在完整EOF前启服务。独占私有staging数据库不同于在线主连接跨await；仍需明确事务回滚、发布与目录持久化边界。
- 独立memory/容量实验只在父批准合理有限范围后做；不复跑40MiB/600s来制造证据，不据heap采样证明硬RSS。同步SQLite CPU不能被JS timer硬中断，文件路径同UID合作边界如实限定。

rawtoken只内存/privatefixture，CLI敏感stdout只内存解析，归档仅布尔/字段名/ID/计量。每实际attempt独立保留，fixture错误、开发产品缺陷、环境/旧dist编译失败分类准确；最终doc/hash/credentials cleanup在父接受后单独收尾。
