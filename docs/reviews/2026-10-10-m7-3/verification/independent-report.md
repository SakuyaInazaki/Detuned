# M7.3 independent verification

本包完成有界本机、无模型 D01 正式评审旅程验证，待 root 功能接受。未修改 core/schema/HTTP/client/CLI/tool 产品；新增 demo/worker 与两份测试共四个 owner 文件。所有正式成功经过真实普通身份、HTTP/SQLite、独立 server/C-worker 和已接受固定 verifier CLI，不以 SQL 伪造评审状态。

唯一完整核心运行 [core-once-first receipt](core-once-first.json) / [stdout](core-once-first.stdout.txt) / [stderr](core-once-first.stderr.txt)：964/964 tests、154/154 files，exit0，330.292s。新 A2 + D6 = 8 例已包含于964，不另加。workspace concurrency1、worker1、文件串行，原5000ms和断言保持。

首次 focused [receipt](new-and-adjacent-first.json) / [stdout](new-and-adjacent-first.stdout.txt) / [stderr](new-and-adjacent-first.stderr.txt) 为40/42、5/7 files，exit1，19.346s。DJ01和DI01均在 accepted observer 的 getOriginalChallenge 失败；knowledge projection按target附 incoming relation，旧选择器却在source failure行寻找原挑战。DI01余下accepted及superseded断言当次未到达，不能称首次全覆盖。A v3仅main改为已有findings中固定原A claim target行和exact challenge ID，未改core/关系/测试/断言/timeout。原失败、A v1/v2、D v1/v2/v3保留。

补测仅main syntax和两份新文件：[related receipt](related-new-repair-first.json) / [stdout](related-new-repair-first.stdout.txt) / [stderr](related-new-repair-first.stderr.txt)，8/8 tests、2/2 files，exit0，8.495s。真实三checkpoint和原挑战open、actual accepted decision/receipt/readylog及superseded历史不漂均到达。没有重build、重noEmit或重复42例；原34个邻接例首次通过，后续由唯一full自然覆盖。

| 门禁 | 实际结果 |
|---|---|
| build首次 | exit0，11.058s；即时完整555 dist inventory |
| 两新TS source-noEmit首次 | exit0，0.991s |
| main/worker首次syntax | exit0，0.053/0.043s |
| main修后syntax | exit0，0.054s |
| typecheck / lint / schema首次 | exit0，8.626 / 8.299 / 0.071s |
| focused首次 + related补测 | 40/42 + 8/8，首失败真实保留 |
| 一次full | 964/964，154/154，exit0，330.292s |
| current28/29 | 本包未运行；按批准复用 sealed B2 已接受证据 |

D DI01三次ordinary真实HTTP读取分别核封存R2不可读（NOT_FOUND）和public search无正文、accepted真实两distinct reviewer/session与固定snapshot/config、真实pass receipt和readylog actual SHA/bytes、后续superseded同时open_challenges/target_superseded而旧decision/receipt/loghash保持。原A挑战经现findings真实公共RelationProjection读取仍open，不从ledger构造。observer只具固定普通C/R2只读closures，无client/token/写操作。58固定图例通过不作数学证明。

DI01透明 child_process proxy原样转发正常spawn/fork/send/emit参数和真实行为；只在进程内保存安全PID、actualclose code/signal/顺序、实际pending batch/events、固定公开正文chunk和显式ACK metadata，不保存configure凭据消息。实际两次server和C-worker PID不同，旧close0/null发生在同角色新spawn之前；两个pending payload与batch ID相等，真实固定修订可读，显式ACK由重启后worker发送。不是ledger boolean自证，也不是native宿主认证、磁盘崩溃或backup恢复。

DI02真正spawn demo CLI，await actualclose而非exitCode：检查成功exit0、子进程退出、0600新文件、安全ledger字段/无token或私有路径，第二次同output非0且原bytes不变、无staging残留。真实CLI已测，安全ledger内容由断言/记录验证；临时副本已按自有fixture清退，没有为归档另跑或生成拟输出。

DI03两例明示controlled observer fault：原throw保留、observer挂起后AbortSignal取消，两者await settle、实际ownchild close/已退出、私有目录不存在且不发布ledger。DI04仅demo-owned mkdtemp受控ENOSPC，原错误对象保持，零子进程/无输出，external abort同handler移除且实际45000ms deadline clear。DI05仅该例first init executable定向已确定不存在的自有路径，真实Node ENOENT/error/close；emit proxy不添加error consumer，不能掩盖产品unhandled错误。没有合成exit/close、占满磁盘、改权限、伪造正式成功或调timeout。4s自有watchdog与取消有限grace仅处理本轮owned handles。

[Final integrity](final-integrity.json) 核425 baseline source/config/tests + 4 new = 429实际文件，owner Av3/Dv3 SHA匹配，未发现非owner新增代码或漂移；555dist与成功build即时清单/fresh一致。HEAD、lock、V5四资产、SQL/profile/archive、Web/browser/JCS/integrations/currentdocs保护无漂移。旧11673 manifest链按已接受清单复用，没有递归重扫旧封存。

[Cleanup](cleanup.json)：所有本包receipt登记runner/command PID均退出；related/full的真实ownchild/目录断言通过。原始stdout/stderr凭据pattern扫描无命中。没有全机PID/旧tmp census，不操作VM/Colima/daemon/global/install/model/push/browser。失败与清退证据保持；不宣称宿主/模型/外网部署、跨进程verifier恢复、完整M7或M8研究效益验收。

[Metadata before](metadata-before-manifest.json) 与 [ownership](metadata-ownership.json) 仅静态准备8existing/3new，正常文档尚未写入；metadata接受、封存仍待root。完整命令/退出码/耗时见 [gate summary](gate-summary.json)，实际最终执行采用 [repair plan](d-repair-command-plan.json)。
