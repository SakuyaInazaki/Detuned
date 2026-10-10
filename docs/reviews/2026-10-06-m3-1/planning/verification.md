# M3.1 单元C独立验收计划（阶段1）

fresh baseline已捕：154 source/config/tests、36currentdocs、5mutable、3190旧不可变review/evidence（含完整C2）、4SQL/archive、2schema、208tracked+48untracked dist；HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44，dirty继承。H-R1四材料/生成器、C2recipe/seed/run/wrapper/verify各源码归入保护hash。不reset/clean。原C2 334/36仅起点，不预填本包结果。

## 文件所有权

C仅新 `tests/integration/m3-event-recovery.test.ts`、拟新 `tests/helpers/m3-event-worker.mjs`（server/client/drop-response-proxy必要worker，向父先报路径）及本包planning/verification、verification证据。core拥有event/storage业务与正式定向，protocol拥有route/client/契约。本单元不改产品/作者文件/旧tests；等待父冻结wait/TTL/签名/Abort接口后才写新进程正式回归。

## 有限before与精确归因

[独立before](../verification/before-candidates.json)由旧dist inject真实HTTP创建合法space/thread/post/revision，再明确使用当前EventVisibility合法值review_assignment存储夹具，不将此冒称现public write能生成sealed review：

1. private event首次poll与pending重投返回；用于需实现的当前可见性防御，不证明已存在review模块或普通用户可自行设置visibility。
2. 注入Clock2001，cursor exp实际沿Date.now2026+24h，非注入Clock+24h；签发Clock候选已复现。
3. 已ack批次真实签名through_seq=0仍200 confirmed；ack_seq4→4未变。是重复分支校验缺口，不称已证明游标推进/丢事件。
4. 真实签名wrongpurpose/actor/space重复ack仍200；这是已知测试secret签发的受控负例，不声称无secret攻击者可伪造HMAC。现payload无purpose/actor/space。
5. 实际otherconsumer用原cursor409 ACK_INVALID，现consumer绑定有效，不泛称所有绑定皆无效。

旧m0-m1-regression R08已有未来游标拒绝，但该测试默认签名secret未绑定真实app，不足以代替新已知secret真实签名负例。旧M1/C2已覆盖普通delivery/ack/checkpoint与一些ACL；真实独立server+client进程重启、ack已commit响应丢失、有效等待/断连释放尚需本包组合链。跨对象归属只在确有合法实体及明确stored防御setup时核，不将损坏DB引用当普通HTTP可达漏洞。未复现项不凭静态宣布。

## 父冻结后有限矩阵

- R01真实进程恢复：独立server与HTTPclient，poll固化后client/server均退出再新PID重启；同batch ID/范围/event ID顺序重投，处理前不推进ack。同DB实例secret保留，runtime凭据只私有IPC，公开不落token。
- R02响应丢失：独立proxy将ack完整转发到server、收到确认后丢弃客户端响应；controller只读DB证实commit。新client同batch重试success/ack单调；真正signedwrongrange/跨consumer/actor/space/purpose/tamper/未来/超期负例无半状态。
- R03批次与扫描：并发poll屏障只一个activebatch；500内部扫描/100匹配上限、线程/type/visibility干扰，通过明确through_seq重组无跳漏；有扫描零匹配空batch可显式ack，追平nullbatch。一次精确流式oracle，不每event全表扫描。
- R04当前授权：poll/pending/ack/等待醒来，当前撤cred/actor禁用/成员撤销/read不足/epoch resync；public/private与thread/post/relation双方space归属防漏。比较明确batch/consumer/events表状态，不能把20正常member成功当负例覆盖。
- R05时钟与等待：Clock精确exp等号/+1秒及重投TTL按父策略；wait0即时，wait>0无事件截止、新event醒来、pending/可扫描空batch立即；等候不持事务，正常另连接写可提交。
- R06取消与真入口：真实HTTPsocket断连、客户端Abort，生成batch边界前后均不自动ack；生成已commit则重poll可恢复。worker清退/等待timer/listener有界，无忙等。共用client/MCPstdio/PiSDK真实validator→execute取消等按协议冻结后独立核，宿主模型非本机模拟认证。

正式新test仅组合上述缺口为少量端到端旅程，不复制所有已有微观断言。其余有限独立probes放本包verification；父决定必要定向调试时才运行。ACK失响应代理、server重启、client重启均真实不同进程，不用重新构造service冒称T08。新helper固定server/client/proxy模式，无任意shell执行；所有IPC/HTTP timeout明确，finally仅清理本轮自有进程/临时目录。

## 执行顺序与限制

阶段1已完成基线+before，未build/fullsuite/600s。等待父签名/Clock/Abort/wire默认冻结后实施新test与helper。作者冻结后由本单元统一build/适度正式回归/current29，实际计数stdout为准；父如调整执行范围以其新授权为准。旧证据与首probe失败保持，不以重跑掩盖。资源计量精确查询/流式映射，避免O(N²)；无需机械再100k/1M/600s。仅本机T08，不外推断电、介质损坏、离线备份、真实宿主模型、Node22、干净安装或远程CI。
