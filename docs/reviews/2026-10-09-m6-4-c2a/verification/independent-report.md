M6.4-C2A 的研究发现与失败知识视图正式状态投影通过本机有限功能独验，等待根最终判定。此报告不接受前端设计质量，也不把 C2B 公开意见检索、M7 checks/receipts 或整个 M0–M7 宣称完成。

| 已实际执行 | 结果 |
|---|---|
| workspace build | exit0，11.177秒，workspace-concurrency1；产品A/B之后未变，未重复build |
| 最终新源码 noEmit | A2/B1/D2 exit0，1.802秒；沿C1有效paths与原dist imports。D3只补截图capture，未重复类型门禁 |
| typecheck / lint / schema exact | exit0，9.613 / 9.177 / 0.076秒 |
| 新Node与旧邻接 | 新19组合通过：首B4 + 修正后A7/contracts4/D4的15；旧m2知识7+合同4+review status3首14通过 |
| 完整core | 一次845/845、135文件、exit0，271.870秒；新19已包含，不能另加；worker1/文件串行，原竞态/timeout/断言 |
| 浏览器 | 首同次12/12（新KW3+旧m5-c5+m6-review4），exit0，47.268秒；补KW03卡截图1/1，8.661秒。unique仍12，attempts13 |
| current25 | 6原+19既有adapter，每项一次exit0，零新adapter；具体时长在gate-summary，不能与core相加 |

[gate-summary.json](gate-summary.json)及各receipt记录命令、实际退出码、时长、PID和原stdout/stderr。执行窗口唯一串行；既有本地Node/pnpm/Chrome单worker，不安装、不启VM/Colima/daemon、不调用模型或修改全局配置。

KN01实际HTTP读取policy_revision而非current_revision：pinned-only current2/policy1，enabled/disabled无round；明示持久配置故障注入的缺指针、非法schema与坏JSON均安全RESYNC且无副作用，有round后关闭政策保安全历史状态。KN02真实claim、不同reviewer/session、submit/finalize，accepted后最新cancelled/stale取代旧轮次投影；固定target1与当前revision2分离，冻结required_checks不会被当前空checks替代。没有伪造passed回执。

KN03真实只读consumer已poll保pending及ack0；整份表记录在视图前后不变。封存coverage不进入知识视图；依赖redaction只呈安全状态，当前ACL撤销返回NOT_FOUND。file-WAL第二SQLite连接在outer readSnapshot内实际提交有效政策修改，两claim同批保持旧状态，下一读取才见新政策；这处明示配置变更用于快照实验，不是SQL造正式评审。KN04先真HTTP/shared-client数组与空间/帖子绑定，再独立controlled坏transport验证whole-array拒绝未知字段、错flags/space/post/date；不把mock当权限证据。

KW01真HTTPaccepted后原作者真实revision：历史裁决、当前有效性与检查状态分别显示，可读当前2/固定评审对象1，并复用原panel显式选择轮次。KW02真实required-check pending、failure只作dependency，保作者报告、legacy null/missing/空列表且不继承claim批准。KW03真实upstream处理后的晚findings在换空间/logout不能回填，390px键盘打开固定reader。原m5-c/m6-review断言均保持。

首失败没有覆盖：[node-first-classification.json](node-first-classification.json)记录33项首22pass/11fail，其中8项sandbox localhost listen EPERM，3项A新HTTP夹具漏必填body。根准A四处body补项（包括同源contracts夹具），原freeze/before/delta保留；本地短寿命监听经auto_review允许后15项通过。无产品修复、断言/timeout放宽或更换成inject避开真实网络。

截图仅证明这次功能呈现：[桌面发现卡](browser-first/screenshots/c2a-knowledge-desktop.png)、[390px发现卡](browser-card-narrow-first/screenshots/c2a-knowledge-card-narrow.png)。首[narrow图](browser-first/screenshots/c2a-knowledge-narrow.png)实际是固定reader底部，保作reader证据，不能拿它接受知识卡窄屏。根因此准D3仅追加卡截图、单跑KW03；前端视觉重整另排，不宣称设计质量通过。

[final-integrity.json](final-integrity.json)核最终owner22吻合；source381→387，14旧变+6新全在owner，无missing/越权。HEAD/lock、SQL/archive7、profiles2、review-panel、当前docs64+mutable5均保持；C1 sealed327实际逐项SHA与manifest保持。其余旧10296沿已接受baseline protected库存和禁写边界复用，未重复内容扫描；selected25 source SHA逐项核。dist523→527，29旧输出变、6新、2旧Web hashed assets删除，属于实际build，不能称dist不变；完整库存见final-dist-inventory。

[cleanup.json](cleanup.json)核本包已记录37个runner PID均不存在；13次浏览器fixture proxy/app/DB关闭且temp缺失，实际所记录路径再核缺失。Node afterEach真实await app close/DB close/rm，未持久目录名，不虚造Node目录总数；core/probe自有finally/assertions与exit0属于相应证据。未全机扫描/kill、操作旧tmp/保留host roots或任何VM。

保留真实已有warning：Web bundle大小提示、Playwright NO_COLOR/FORCE_COLOR，以及旧current28/29 AJV date-time提示；没有为它们改依赖。没有重跑宿主认证、性能、旧库全矩阵、容器/跨平台或模型评估。结论只限此次功能与安全状态合同的本机验证。
