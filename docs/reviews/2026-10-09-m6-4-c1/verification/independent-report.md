M6.4-C.1 的有限历史评审目录与 Web 正式评审旅程通过独立验收，等待根最终判定及文档同步。最终运行源为 A1 / B3 / D5；没有将当前包扩展为 C2、M7、模型研究或完整跨平台认证。

| 实际检查 | 结果与版本 |
|---|---|
| 最终 workspace build | 0，10.506 s，workspace-concurrency=1；B3 UI 真正纳入 dist。首 A1/B2 build 0 的证据另外保留。 |
| 新测试源 noEmit | B3 后原 dist imports 原样 0，1.542 s；不将临时 import 实验当最终证明。 |
| 项目 typecheck / lint | 各 0，8.023 / 7.691 s；schema.sql/schema.ts exact sync。 |
| 新 Node 正式组 | 首运行 10/10，3 文件，2.745 s：A RC3、B WI3、D DC4；这些 10 条已包含在最终 core，不能再累加。 |
| 完整 core | 一次完整 826/826，131 文件，exit 0，266.866 s，maxWorkers=1、文件串行，原 timeout/assertion。 |
| 新浏览器 | B3 重建后的 CW01–04 同次 4/4，exit 0，25.293 s。 |
| 既有 Web | 原七份只读 spec，24/24，exit 0，71.071 s；没有修改原行为断言。 |
| current25 | 25 选择各一次 0，6 原件+19既有根批准 adapter，本包新增 adapter 0；四项目 gates 与其合为 current29，不能与 core 数相加。 |

精确命令、耗时、退出码见 [gate-summary.json](gate-summary.json)、[output-audit.json](output-audit.json) 和原始 `*-first.stdout.txt` / `*-first.stderr.txt`。所有操作串行，仅既有本地 Node/pnpm/已安装 Chrome/锁定 SDK。浏览器单 worker、非持久 context，无 HAR/trace/video/storageState，无凭据截图。

D 的四目录组使用真正临时文件 SQLite/WAL、Fastify ephemeral HTTP 与 shared client；DC01 的 CLI 是真实已构建新进程。14 个真实评审轮次按 round DESC seek 完整续页，limit 和预算变化保持无漏重；整 wire UTF-8 预算包含 API/version/request_id/meta/签名 cursor，多字节 request_id 的首项不能容纳反例是在同一真实 SQLite 服务上直接调用 getRequests 并注入超长 request_id，真实得到服务层 422；不是 HTTP 进程收到该 ID 的端到端 422。普通 has_more 保持 truncated=false，实际字节裁尾才 true。DC02 验 actor/space/post/secret/purpose/sort/原 expiry、每页当前 ACL、TTL不续；真实目标红删410，其他冻结材料红删只给安全状态。sealed summary 精确11字段，绝不带意见、附件健康或 reviewer payload。DC03 cookie 早 Origin 错误仍 private,no-store、非法 query 无业务写入/ACK。DC04 是明确 controlled transport 坏 parent/date/unknown/order/meta/limit/1MiB/abort 对照，不冒称后端实际产生坏数据。

四浏览器旅程通过真实 HTTP 和 DB：普通申请者 claim→request→固定 snapshot；两个真实不同 reviewer 顺序登录、创建独立论坛 Session，候选须显式选用；私有附件仅显式加入 evidence，sealed 本人可见、另 reviewer 隐藏、全部提交后揭示；最终决定保留历史，真正原作者修订后 current_validity 变更。required checks pending 的最终决定真实拒绝，不能假造 passed receipt；取消仍保留已揭示历史。提交后代理真实丢响应，耗尽默认有限 retry 后显式同 body/key 恢复只有一份 DB 副作用；不会自动替换 Session。晚目录/snapshot/已开始 Session 结果不能跨 space/ref/logout 回填，Session POST 可能已创建一次，不宣称回滚已开始 POST；无暗重试。CW04 同时完成390px键盘与普通帖子发布。B3 CW01 原显式 refresh 后同轮目录与详情都 accepted；固定 round/ref/cursor 不变。

源码有限审阅与独立运行一致：[catalog-source-review.md](catalog-source-review.md)、[web-source-review.md](web-source-review.md)、[web-source-review-v3.md](web-source-review-v3.md) 保留各阶段 hash。D 读到新 service 的整个 auth/target/status/分页/裁尾在同 readSnapshot 内；SQLite round DESC limit+1，无 body 投影；游标在裁尾后签最后保留 round 并沿原 exp。旧八+第九工具名未变，新 forum_read kind 和 CLI 复用 HTTP whole page。B3 仅在现 safeStatus/alive/abort 守卫后改同 request 的四状态字段，不用写 ACK 推 live 状态、不新增请求。双向 OpenAPI 与原旧模块回归都保原断言。

过程失败和适用范围全部保留。首 noEmit 2 是新 source/旧 dist 混用次序；临时改三 imports 的 diff 和那次 0 留存，但已还原首 fixture SHA，根决定 build→原 imports noEmit。首浏览器4条均在 JSON textarea 定位停止、未到 request POST；根批准仅新 spec 换实际 AX role+exact accessible name，保持5s预算。随后 B2 三条通过、CW01 普通作者材料被旧 admin helper 修订正确403；D 新 helper 通过实际 requester token 修订，旧 helper 不改。一次 `^CW01` grep 选择错误零 case 的 exit1 保留；正确唯一 grep 后 B2 CW01 1/1。B2 证据不能绑定未构建的 B3；B3 修目录刷新/用户文案后必要重建并新四条真实再过，旧首失败未抹除。源/差分/receipt 见 [browser-first-classification.json](browser-first-classification.json)、[browser-second-classification.json](browser-second-classification.json)、[execution-order-decision-delta.json](execution-order-decision-delta.json)、[browser-b2-composite-results.json](browser-b2-composite-results.json)。总浏览器 unique28（新4+旧24），实际 case attempts37；重跑不增加 unique 数。

有限当前视觉图为 [桌面评审](browser-b3-first/screenshots/c1-review-desktop.png)、[390px评审状态](browser-b3-first/screenshots/c1-review-status-narrow.png)、[390px普通帖](browser-b3-first/screenshots/c1-review-narrow.png)。根已实际看前两张并接受所见区域，不能外推完整页面或完整无障碍认证。

[cleanup.json](cleanup.json) 记录37次 browser fixture 的 app/proxy/DB close 与 temp 缺失，另1私有 TLS certificate fixture 缺失；所有已记录 runner PID 轻量逐项检查均不存在。D Node fixture 的通过 afterEach 真实 await close/DB close/rm，未持久目录名称，不虚造临时目录统计。其余 core/probe 自有清理由原 finally/assertion 与实际退出证明，不是全系统扫描。未操作任何 VM/Colima/daemon/保留宿主 roots/旧临时目录，未安装、改系统 CA/global/profile、推送或调模型。

[final-freeze-verification.json](final-freeze-verification.json) 确认 A13/B3六/D5四项全部吻合。source 库存374→381，既有15变/新7均在所有权内，无越权；其余知识 reader/source 保持。 [integrity.json](integrity.json) 核旧10296 review文件、SQL/archive7、profiles2、当前docs63+mutable5全部0漂移，含 sealed B293、JCS/旧Hasher。HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44、lock364bc51aa18dc6a00935daf3b8ed1c25ffedf728308c01f520705c8b8bffcc88保持。packages和modules dist 库存519→523：41旧输出变化、6新输出、2旧 Web hashed assets删除，归实际 build，不能写 dist 未变；全清单在 [final-dist-inventory.json](final-dist-inventory.json)。

保留真实 warning：pnpm list-of-pnpmfiles 状态提示，无隐式重装；Web708.19kB bundle及>500kB提示；Playwright NO_COLOR/FORCE_COLOR；#28/#29 AJV unknown date-time format 提示。这些旧探针不证明 format 校验，D strict date countervectors另有真实通过。未为提示增依赖、改 registry 或拆包。

本结论仅当前本机 Chrome/Node 有限旅程。完整 core/current 这次真实执行，旧 Web 本次真实执行；没有重跑旧宿主三lane、排序性能、容器/VM、旧库矩阵或模型实验。C2A 的根批准 planning 是未来范围，不是当前实现；所有 metadata/finalization/fresh 仍待根授权，当前报告不冒整个 M6/M7 完成。
