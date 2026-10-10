# M6.3-A 独立验收计划（未运行）

基础：真实private WAL SQLite/实际业务服务写入和metadata查询；数据仅synthetic。先完成两个独立正式文件，不在作者写态运行。使用已给接口 ReviewFinalizationService(storage,auth,idem,clock,ids) / finalizeRequest(auth,space,request,{expected_version},key)、getDecision，以及 ReviewStatusService(storage,auth)/getStatus。新SQL/profile由B提供后使用真实当前bootstrap；旧4维护场景仅加载已经真正原4 API生成的持久JSON/SQL配方。

- DF01：当前身份/凭据/空间ACL/owner权限及error顺序。严格DTO/schema同源；collecting、stale、terminal、version错各不提交，当前unauthorized finalizer不能借samekey重放。成功后改变reviewer资格/规则再重放仍原immutable决定；权限/材料privacy未放宽。
- DF02：冻结policyrequiredchecks非空只pending，没有真实receipt；negative verdict优先openchallenge/checkpending。policy允许openchallenge时accept仍status challenged；addresses不当resolve、异议按对象而非新revision过滤。检查rollback版本/事件/decision/key集合，不能仅响应sameID。
- DF03：持续stale来自真正PostService/SpaceService/RedactionService，pinned-only/无关post不触；故障注入最后event或key使原mutation及stale版本/事件同事务全回滚。真redaction可提交，status安全invalidated、ordinary材料/getDecision/replay410不还原正文。
- DF04：两个独立Node进程争finalize-vs-post修订、finalize-vs-challenge；只允许两个合法串行序，不固定赢家。finalize先=immutable决定保留、current status后来失效；变更先=finalize拒且无半决定。受控barrier/退出/收集只安全code/IDs/counts，原timeout有界、finally清退children。
- DF05：固定12reason顺序/去重/优先级用少数串联变体涵盖真正公开mutation及明确synthetic artifact readiness fault。sealed evidence改变不外露健康或人员，revealed明确evidence才进入published reason；unused private附件不影响status/public stale。状态不声称physicalfile实hash。
- DF06：cancel revealed保revealed_at且历史key原确认；corrupt stored decision/snapshot/typed ref安全RESYNC，与metadata redaction安全status分离。无正文公开review.stale/finalized事件、thread过滤与pending/ACK不变。
- MS501：真实original4 JSON+SQL加载privatedirectory，ordinaryinit/serve拒绝legacy4，offlinecopy只新stage5，源hash/历史roster/group/assignment/session/submission全部保真；原4create/cancel/submit compact bytes与确认strictdeepEqual，currentread及private权限保留。不会依赖旧tmp或把current5改标签。
- MS502：真实current5有immutabledecision及sealed/revealed/unusedprivate材料后offlinebackup→newdirrestore，核7formal表/typedrefs/events/原4历史与blobSHA、sourcebackup未变、旧凭据/secret隔离；logicalwire旧分支与new5formalexcluded拒混配。真实维护API，CLI如需只最终build后有界命令，未把mock当维护。

首次可执行窗口提案：两作者最终freeze后，D源别名noEmit→新增作者及D定向suite（worker1/file串行，必要2childcase内部并发）→修复受影响后一次root workspace1 build/type/lint→完整core worker1/file串行→根审准schema5 current25adapter与有界built维护probe。原4oraclefirst0/0.361s和一次必要generatorfirst0/0.147s不重复；所有gates此时尚未运行。没有HTTP外部transport/browser/model/VM/安装依赖。需要builtworker时先必要build，避免用旧4dist验新5；每次日志新label不覆盖首失败。
