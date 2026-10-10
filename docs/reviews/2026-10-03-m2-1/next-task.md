# 内部下一包指示：M2.2-A

供后续主代理分派给 sol6.1；用户无需手动转发。M2.1（含R1）已由主代理裁定本机工程验收通过，最终证据见verification/r1-final/verification.md与本目录README.md。本文件只是下一包已裁定范围，本轮不实施M2.2。

## 任务与顺序

先读AGENTS、README、docs00/08/11，再读docs03/04/05/09、当前ADR、M2.1 approved-contract/最终独立证据及next-step-facts.md。禁止deepseek-brainstorm、调用真实研究模型服务、自动启动论坛参与者、全局harness改动、commit/push/reset/clean、改写旧证据/冻结SQL/archive。用户授权的主代理→开发子Agent任务分派继续允许，此禁令不限制开发编排。先说明任务行为与验收，保存真实before基线与失败证据，再补最小正式回归并修根因，不为数量扩大工作。

本包 **M2.2-A：统一类型化写入与固定证据引用**。M2.2-B知识视图后续另包验收，其他后包不是本包拒收项。

## 必须实现的现行规则

只对新写proposal/claim/failure/summary强制现有类型字段、元素、长度与枚举：protocol/posts.ts现有对应schema为字段基线。core一个共享验证路径被thread初始帖/new post/revision三入口复用；HTTP与tool schema复用共享定义，适配器不复制业务。revision按已保存不可变post.kind选验证，不能接受请求kind改写绕过；其他kind保持既有已定义行为，不扩新类型系统。

- proposal/claim：statement、assumptions[]、scope、falsification_plan；现有非空、元素类型与长度规则完整保留。
- failure：attempt、category、assumptions[]、tested_scope、expected、observed、evidence_refs[]、evidence_state、ruled_out、not_ruled_out[]、retry_when[]。类别仅counterexample/proof_gap/test_failure/performance_failure/environment_error/budget_exhausted。provided要求至少1条当前可读固定证据引用，绝不表示独立验证；unverified要求非空evidence_missing_reason，可保留上下文引用。环境/预算失败不自动否定算法路线：保留显式适用条件/执行范围/未排除变体/重试条件，不引入关键词或LLM文本语义裁判。
- summary：source_refs至少1条固定PostRef；正文对应来源的研究写作约定保留，不用自动文本理解声称证明。

PostRef必须精确post_id+revision，存在、同space、符合当前read权限；source_refs/evidence_refs均校验，不能默默latest。artifact evidence复用M2.1 ready/same-space/space可见与artifact_ids包含/互异规则。新写redacted或不可读来源不能伪装provided，按现有业务错误策略拒绝；旧已保存引用仍保留墓碑定位，不重写历史。

所有当前引用判断和写入同业务事务：非法输入完整回滚，不能留下post/thread/revision/关联/event/幂等半结果；幂等仍原键，权限先于重放。新增写入校验不用于拒绝历史旧记录启动/重放，不为历史缺项补counterexample/provided等默认事实。保留旧11族及M2.1 artifact typed幂等/配额/流/恢复行为。

## 所有权与预计最小文件

主代理开工时确认独占文件。实现者建议持有protocol/posts.ts（四类共享/新写请求判别）、threads.ts与tools.ts必要共享接线、openapi.ts必要引用同步；core新增共享structured/固定证据验证模块，post-service.ts与thread-service.ts三入口调用。优先复用现有读取接口，本包默认不新增SQL表或迁移；若确有必要先给父代理具体依据。服务端route只必要schema接线；adapter/client不新增领域判断。

新正式 tests/integration/m2-typed-writes.test.ts（或明确单文件）独占；仅新增本包有意义回归，既有M2.1测试/probe默认只运行不改。说明/ADR在新M2.2-A交付目录与docs03/04/12必要同步；状态索引由主代理在最终独立验收后更新。若新增判别schema确需调整既有合法fixture，先说明新写语义与历史兼容差别，保留历史探针原字节。

## 最小反例与有限验收

先固定thread.initial_post failure原弱路径：错误category、缺失/非法evidence_state等字段按现有schema必填或默认规则一致处理，以及和普通post/revision结果不一致的反例。不得预先把schema允许default的省略都判400；新写默认provided也必须有当前可读证据，旧记录不能通过schema默认伪造provided。

四类型×三写入口用表驱动的关键正反例验证：缺字段/错误元素或长度/未知枚举；failure缺missing_reason、空provided、假/不存在证据；summary空/错误source。给返回稳定code/status与事务前后不变断言，不只toThrow。

证据矩阵：不存在帖子修订、同space错误revision、跨space帖子修订、redacted/不可读来源；artifact保持M2.1规则；合法精确旧版引用接受，目标后来新修订不能改变保存引用；revision不可变kind不能绕过。固定适用范围与unverified材料合法，不把预算/环境类拒成算法反例。

重放/历史兼容：合法新请求同key不重复事件；非法新写无幂等记录；旧库/旧typed引用启动协调和重放保真（不自动新型校验或补默认），旧引用的脱敏墓碑仍安全；运行现M2.1流/配额/恢复定向回归。保存真实失败/修复后stdout/stderr、exit、时间、运行环境、before/after文件差异。由主代理协调最终build/相关全套与独立验收，勿以模型/宿主未测阻断无模型CI，也不虚报Node22或真实harness。

## 非目标与已知后续

M2.2-B：findings/failures/open-questions的完整知识事实投影、reported/reproduces标签、summary.source_refs来源更新与脱敏状态展示，另包安排。M2.3中文FTS/分页完整验收、M2.4完整context预算/读取检查点、M3消费与运维、M4专用CLI/四宿主、M5 Web、M6/M7正式评审/验证均不进入A。A不解决视图中历史默认counterexample/provided问题，不将其说成新写校验功能已实现；保留明确后续限制而非追加A拒收条件。

完成后冻结源码/测试，交主代理：实现行为、精确文件、实际测试、未测范围、历史完整性与后续B依赖。不得自行接着实施B。
