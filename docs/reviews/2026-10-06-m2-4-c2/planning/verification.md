# C.2 单元 C：独立验证规划（待父批准）

2026-10-06。所有权仅新 tests/integration/m2-context-session-chain.test.ts（必要时）、scripts/scale/verify.mjs 与 verify-前缀辅助、本 planning/verification.md 和本包 verification/。不改产品、seed/run 作者文件、旧测试/证据或 H-R1 材料。fresh baseline 已捕：138 source/config/tests、36 currentdocs、5 mutable、2915 既有不可变 reviews/evidence、4 SQL/archive、2 schema、208 tracked+48 untracked dist。HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44，未提交状态全部继承。详见 [baseline](../verification/baseline.json)、[环境](../verification/environment.json)。

本机 macOS26.2 arm64/Mac16,12、10CPU、16GiB、磁盘当前可用21GiB、Node26.3.0/pnpm11.7.0、better-sqlite3 13.0.3/SQLite3.53.4。未限制 CPU/内存，不能以此认证2CPU/4GiB目标；不安装/联网或改全局。当前无可见本任务遗留产品进程。只读安装库的内存 SQLite version 查询不是产品检查。此阶段未 build/tests/seed/smoke/规模运行。

## 独立完整链与新会话信息边界

session 子过程只接收 baseURL、运行时凭据、space_id 和人类查询目标（例如寻找特定算法失败条件），不接收 oracle、DB 路径、答案 post/thread IDs、预期字段或隐式 seed 模块。首次 HTTP 空间/搜索响应发现 thread/post ID，后续 ID/ref/cursor/checkpoint 全从实际响应提取。完整过程保存无凭据原始 response 与有向发现账本。oracle 核验在该子过程退出后单独打开，用以判断完整取得条件、evidence、retry_when、未排除变体；不得宣称模拟会话理解、独立证明或模型研究成功。

| 编号 | 链/独立断言 |
|---|---|
| SC01 | 新 session 空间context，4KiB/default/64KiB成功 raw compact body按实际request_id计字节；truncated与规则整体省略/ref一致；无focus兼容无focus key |
| SC02 | 从响应发现固定规则 ref，逐页UTF8 byte chunk重组 objective/rules；真实cursor边界/complete/meta对应，换预算保持固定版，不使用seed答案作为请求输入 |
| SC03 | 以查询目标 search实际反例/失败，从返回主题发现focus metadata；有界thread目录→post_id/current_revision→fixed正文，分页完整取得失败五类信息及JSON二次转义/emoji |
| SC04 | 由已读取summary结构获得source ref，协调作者在明确屏障后真实HTTP更新source；下一context显示outdated/current安全投影，旧source正文及summary fixedref均不漂移；withdraw/redaction投影单独核 |
| SC05 | 首context checkpoint→subscribe新consumer；写入明确屏障后的事件→poll（未ack时重投同batch）→仅实际batch ack→再poll→最终catch-up；事件IDs/seq和ack账本事后对全库事件oracle，无已确认遗漏/未投递ack |
| SC06 | 当前ACL撤权、跨actor/space checkpoint/cursor/consumer绑定与幂等新key/原keypayload冲突；写产生的对象/事件/结果同事务、无重复业务副作用；auth设置与测试变更明确单列 |
| SC07 | read/context/search/目录/固定正文不写、不自动ack；metadata巨大422与规则ref降级；whole envelope 4K边界用实际返回，不以data-only计预算 |
| SC08 | seed/runner独立审查：行数/ref/revisions/types/space seq/FTS/public分布/逻辑指纹；20独立actor/session/consumer、真实600秒与逻辑/HTTP分母、长poll单列、error分类/资源计量；无凭据公开产物 |

小型新正式仅整合会话链缺口（预计少量SC01–06端到端断言，实际项数以实施输出），不重复每个旧分页细节。可复用旧 tests/integration/m2-context.test.ts C01 snapshot规则/seq接续以及m2-context-focus.test.ts F08焦点metadata/material/highwater双WAL屏障、B.1/B.2.1固定内容WAL、B.2.2目录WAL证据，均原字节保护；它们不证明100k查询性能。需要在规模DB证明同链，负载前后各一次，普通正确性账本不混性能统计。已有snapshot机制不为本包改产品或加公开测试钩子。

## seed/run 最小产物接口请求

父已确认 seed 只建20 actor/session，不预建consumer；runner每身份真实context→subscribe(context_checkpoint)建立consumer，否则既有consumer会令subscribe忽略新checkpoint。verify将核20初始checkpoint均与对应新consumer建立账本相连，禁止预置consumer冒称新接续。

seed 持久公开 recipe.json（版本/seed/规模/类型比例/长度分布/日期ID/来源/依赖）、seed-manifest.json（完成状态、非秘密相对文件路径、逻辑指纹与行数）、discovery.json（仅 space_id 和查询任务文本）；独立 oracle.json 或 oracle 查询接口单独存放，不由session导入。运行目录内临时 credential 文件权限限制，不进入提交或公开日志。请给 seed DB/WAL checkpoint状态、事务来源声明、重建命令、对各表/FTS完整性独立SQL核验入口；直接fixture seed绝不称100k真实HTTP成功。磁盘成本按父裁定限制为seed+单runtime两大库（seed估计<=2.5GiB、合计<=8GiB、free>=6GiB）；不为每probe复制大库。可直接同一隔离seed实例运行并记录前后逻辑指纹，独立pre/post链共用主runtime或manifest专用空间。全库oracle扫描在负载前/后停写阶段，避免干扰性能样本；tiny正式test独立小库。

runner 公布 run-config.json（600秒/20独立身份/权重/预算子分布/每client速率/timeout/retry/longpoll/连接与warmup），requests.jsonl（client/op/request关联、endpoint/status/code、开始结束单调时钟、req/res bytes、预期冲突/错误分类、retry attempt）；consumer-ledger.jsonl（起始checkpoint opaque+对应公开高水位、consumer与batch ID、from/through seq、实际投递event IDs、ack请求及成功、重投与catch-up终点）；write-ledger.jsonl（幂等key非秘密hash、payload hash、返回业务ref和event关联）。原raw HTTP读链可独立保存，绝不保存Authorization/token/secret。

资源采样须标 server PID/采样周期/单调与墙钟、RSS、DB/WAL/磁盘；锁等待未观测则明确unknown而非0。catch-up在停止生成新写并确定final高水位后执行，CPU/日志观测成本及尾部收尾时间单列，不纳入固定600秒性能样本。请求日志不得省略失败；摘要百分位由verify自行从raw records重算。配置变更须父批准另版本，不改原记录。运行时私密连接配置与公开run-config分离。

## 执行门禁与停止

先交父批准此矩阵及seed/run最少接口，再写独立verify/小型新正式；语法检查不等于产品测试。两作者freeze后由我唯一统一build/fullsuite/current29，相关SQ/KV/SR/PR/TP/focus/H-R1范围由父确定，既有formal333/35只是起点，不预填。小烟测先过正确性再父批准完整600秒参数。错误保留首次日志；probe自身错误只修自有新文件，产品缺陷报父分派。恢复备份与普通kill需要另立控制设计，正常负载不外推断电/T12。此规划不启动规模执行、真实模型/宿主认证或M3–M8。
