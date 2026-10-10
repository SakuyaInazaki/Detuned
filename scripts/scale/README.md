# 隔离规模负载（M2.4-C.2）

`seed.mjs`属于数据单元；`verify.mjs`/`verify-session.mjs`属于独验单元。默认负载入口为`run-verified.mjs`，固定调用测量入口`run.mjs`与仓库独验脚本，辅助仅`run-*.mjs`。不安装依赖，不启动模型，不改产品。正式参数在[load v1](../../docs/reviews/2026-10-06-m2-4-c2/planning/load.md)。10秒smoke仅预检；正式为20独立普通actor、100k帖子/1M事件的一个主空间，30秒warmup、600秒混合测量、30秒drain、120秒catch-up。

先用已经独立核验的seed manifest生成自有新临时副本（目录必须不存在）：

```sh
node scripts/scale/run-prepare.mjs /absolute/seed/manifest.json /private/tmp/unique-private-runtime
node scripts/scale/run-verified.mjs --manifest /absolute/seed/manifest.json --runtime /private/tmp/unique-private-runtime/runtime.json --out /private/tmp/unique-public-output --mode smoke
```

正式`--mode full`另需父授权，拒绝smoke manifest或低于100k/1M的counts。全程复用已有dist；作者不自行build。prepare验证20actor/session及0consumer/credential，复制归档到runtime.db后注入临时实例secret和20普通read/write凭据，这属于真实HTTP前fixture初始化。runtime.json、live.json权限0600，目录0700，token从不放命令行/公开日志；/me启动时确认真实actor和无admin。管理员controller由独验另行私密配置，loadclient不持有。

runner自己fork loopback server子进程，所有负载通过共享DetunedClient真实HTTP。`--gated true`为独验在性能窗口外复用服务提供两个120秒gate：独验读取私有live.json后完成preflight，创建同目录preflight.ok；warmup、正式checkpoint→subscribe、600秒测量与drain、固定终点H→catch-up完成后，独验进行postflight，再创建postflight.ok。原checkpoint/token仅保内存，公开ledger仅hash和decoded seq（观察不是客户端验签）。独验不得与性能窗并发扫描DB。当前最终runner把H/catch-up放postflight前，来源变更不会混入load目标。

每client每500ms一意图、独立相位、逻辑单在途；忙tick或事件循环延迟错过不排队追赶。目标总40logical/s，报告实际达成值。六类20/20/20/10/10/20；固定洗牌100意图块。分页、一次有界retry、条件ack和5%写同key重放额外请求分别记录；默认client内置retry显式关闭。poll wait0，现服务未实现等待，不把wait_ms参数当longpoll实测。搜索明确QUERY_TOO_BROAD 422为限额结果单列，预定revision409单列，只有意外错误计5%停止阈值。不能用失败/限额搜索冒称成功。

产物均新建不覆盖：run-config.jsonl、requests.jsonl、operations.jsonl、consumer-ledger.jsonl、write-ledger.jsonl、resources.jsonl、server-log.jsonl、summary.jsonl。逐request记录真实rawbytes、requestid、attempt、分类和单调时间；写只记录payload/result hash与ref；消费记录checkpoint/初始化consumer、投递event IDs/seq与batch/from/through、实际ack、重投、终点H。请求body字节与URL字节分别可见，不称完整headers/on-wire计量。Ack响应没有ack_seq/version字段，公开through_seq来自实际cursorpayload，独验最终DB核。

summary以nearest-rank统计成功和all attempts HTTP、endpoint、短中文查询、逻辑整体及分类p50/p95/p99，分母显式。完整rawledger可独立重算。真实中文短词按请求q的字符数和汉字判定，manifest类别另记。HTTP计从fetch至完整body读取；逻辑还包含分页、ack、重放、client解析与日志成本。warmup/setup/drain/catch-up/gates分开，不能混入600秒性能。stdout仅runID/目录/完成状态。

资源每秒采样自己serverPID/runner RSS、CPU、DB/WAL/SHM与各日志文件，直接stat不递归du。启动时stat核seed archive字节与manifest/prepare路径一致，资源日志单列seed_archive_bytes/runtime_files_bytes/combined_bytes；free<6GiB或seed archive与这些运行文件合计>8GiB停止；内部SQLite锁等待not_observed，仅外部锁错误/retry可审计。SIGINT/SIGTERM按停止意图、取消在途、不自动ack、flush证据处理；正常只关闭自己子进程。默认不删除任何DB、私密文件或旧证据，最后清理由父限定自有目录。

自动入口强制低层run --gated true，增量观察gate_start后立即spawn固定本仓库verify-gate.mjs的preflight/postflight模式，不传controls，不shell、不接受外部命令。gate输入和完整原stdout/stderr/结果复制到0700私有子目录，普通token不公开；verifier自身.ok也先留clone私有目录。仅固定verifier进程exit0后wrapper将成功哨兵原子rename到真正runtime目录，失败保原输出并只停止自己创建的run/gate进程组。公开automatic-gates.json仅UTC与monotonic原点、PID/阶段/exit/hash/audit摘要；无原token/checkpoint/cursor或完整gate结果。默认命令无需人工及时touch，低层run.mjs仍可供精确研究复跑。此入口是本机可信测试进程编排，不启动论坛参与者Agent或模型。新入口仅v3tiny10秒实证；原唯一full原exit1/postgate超时与freeze-v2全部保留，不能把新自动入口包装成重新运行600秒。

取消/失败清理对自己创建并记录且PID>1的进程组先TERM，5秒后仅对仍在的自有组SIGKILL，等待和groupgone观察均有界并清timer。signal0的EPERM明确记unknown_permission，不冒称消失，exit callback不抛未处理异常；权限未知/清理异常保持非零。授权真实故障实验仅在preflight将已证自有组SIGSTOP再取消wrapper，5036ms非零退出、原子成功ok未写、精确自有PID消失且监听拒绝；不作为第二次负载smoke或600秒。首callback EPERM失败原证据保留。
