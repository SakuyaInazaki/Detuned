# M3.3-B.1 A短规划：读取快照与业务投影（待父选型）

2026-10-06。只读事实；未实现产品/空API、未build/实验、未新增依赖。前包当前393/45已父接受；本包尚未实现。读AGENTS/当前入口及03/04/07，以下是候选，不自行冻结路线/限额/迁移。

## 现有代码事实

- `StoragePort.readSnapshot(fn)`为同步callback；`SqliteStorage.readSnapshot`拒thenable，db.transaction(...).deferred，嵌套复用当前事务，且只是调用约定而非SQLite强制readonly。因此不可把现主写storage callback跨await扩为export stream。
- `SqliteStorage`构造器只收better-sqlite3 Database，private db；构造时initPragmas尝试WAL/FULL/FK/busy_timeout，异常吞掉，不能用它保证独立只读session。驱动Database公开name字符串，可在storage内部获取file-backed路径，新Database(name,{readonly:true,fileMustExist:true})候选不需CLI传全局目录。:memory:无法通过另连接看到同库，现很多旧测试用:memory:；不得让新增export factory影响旧构造或旧请求，可对新export明确不支持该模式，或父选专门注入只读session测试adapter。尚未做readonly/WAL实测，不先宣称driver语义已验。
- 现storage有threads/posts/revisions键集目录，但没有全space revision/thread版本/relations/resolution/artifacts的有界导出目录，也没有跨await独立session。关系/挑战与listMemberships等会返回全数组，不能直接拿来全空间聚合。只需新增导出专用session与窄SQL，不迁移现schema。
- AuthService.refreshContext按活storage重查credential/actor撤销、过期/disabled；requireSpaceAccess检查space、allowed_space_ids、membership与read/admin。管理员只在无membership时有virtual owner，不绕撤权。必须在活连接复核，snapshot中的旧credential不能授权后续输出。
- 当前posts无visibility字段；公开研究帖由space授权+生命周期约束，普通review/decision只是post.kind。ArtifactService检查同space、visibility='space'、ready；redacted410、missing404，content_url由已授权ID拼本地API路径。
- `createRedaction`同事务更新生命周期，SQL把所有post_revisions标题/摘要/正文/tags/structured清理，并追加public post.redacted/artifact.redacted事件；既有snapshot仍可见脱敏前页。因此仅调用snapshot.getPostRevision不能防正在发生的redaction。knowledge-projection.projectSource/projectRelation会过滤跨space/缺失固定ref，redacted保定位；复用思想时必须从live状态检查，不能误用snapshot状态作为当前授权。
- revision_artifacts保存(post_id,revision,artifact_id,purpose)，不是PostRevision内字段；post refs另持为relations。SQLite关系历史reason_ref是JSON字符串，可能引用另一post；须同space固定版本/可见性检查。structured/source_refs与space pinned_refs也需检查跨space/不可读目标，不能只过滤顶层SQL行。
- instance_metadata现只有initialized/token_secret用途，无可公开稳定instance UUID；不能hash secret当来源标识。header可包含format/version/space_id、导出时间、snapshot高水位、opaque export_id与来源ID命名空间说明，父需选择来源语义，不加持久字段。

## 读取候选（父裁定）

**A 独立只读SQLite连接、一份readonly事务。** Storage内部用file-backed db.name，专门adapter以readonly+query_only打开，BEGIN deferred并立即读space/高水位锁定snapshot；不new SqliteStorage以避免其initPragmas。每次同步keyset取一个或小批candidate，返回后主写连接可正常运行；await backpressure只发生在独立只读session寿命中。close/ROLLBACK在cancel/error/footer后finally；长期读事务会阻止WAL截断、慢消费者会增WAL，须父定总时长/并发数/资源限额和背压取消，无新后台服务。:memory:新export不能伪称同快照。

建议最小候选port：StoragePort新增`openSpaceExportSnapshot(spaceId): SpaceExportSnapshot`（名字/是否required父冻结），session公开`nextCandidate(maxRawBytes)`与`close()`，record联合类型来自protocol，状态只在session内部保存table/keyset位置。nextCandidate不自行鉴权；core ExportService用主storage完成live权限/脱敏复核与白名单再serialize。或按族公开小型keysetpage；别开放任意SQL或全库dump。session无需支持写/credential查，避免把完整StoragePort开放给流会话。

大row必须在拉正文前测SQLite UTF8 raw长度（按候选明确字符串列），超原始row cap拒绝；然后读取该单row、严格JSON解析、JSON stringify计实际UTF8+LF行长度（转义可能放大）。超linecap明确失败，不截字符串/漏字段/静默跳旧revision。cap尚未选，本方案仅要求最多单row/小batch+单encodedline，不把任意巨大stored正文先入JS再判限额。

**B 有界同步生成临时spool。** 在一个同步readSnapshot中逐row写private临时spool，不积全数组；完成后再异步HTTP流。优点不跨await持readonly事务、不需要独立连接且可:memory:；代价阻塞主事件循环与主读事务时间、临时盘敏感研究材料/总盘限额/清理复杂，snapshot结束后每行仍须live重新授权与脱敏复核。若整个导出大同步工作无有界总限额，仍不合要求。

**C 有界分页多snapshot。** 最窄但不能声称一份全导出一致snapshot；并发写可使metadata与版本集合不一致，需明确终端验证/重新开始规则，且引用完整性需额外设计。仅作为父可能选择的小scope取舍，不由A自行选。

## 当前安全与流交付候选

每行实际发送前，在活storage的同步readSnapshot中refresh credential/actor与space权限，并查当前post生命周期、关系双方与resolution reason_ref、artifact可见性/state。为避免旧snapshot内容和当前墓碑混成“完整一致snapshot”，建议父在下列语义中选择：检测本空间导出期间redaction/ACL安全变化就中止无completion footer；或当前redacted输出墓碑并把header准确标为“一致内容snapshot+当前安全覆盖”。不能声称撤回已写入socket的历史bytes；后续安全变化在冻结复核边界停止未来内容，客户端未见有效footer不得接受成果。已输出正文若随后脱敏，理想应终端abort而不是签完整footer；可用现public redaction event seq或当前redactions集合小型安全stamp方法检测，不新增epoch。准确扫描/成本由父定。

路线A读取连接只用于内容snapshot；活auth/safety检查用现主连接短同步callback，callback到实际write之间不await。server背压停止调用next而等drain，恢复后再取下一行并重新check；取消/断开/总deadline关闭session，不把大batch预排到不可撤回buffer。route流错误可用版本化error记录并无completion，或destroy连接；HTTP已200后不得伪装普通JSON业务错误/成功。client校验完整header/records/footer，CLI exit非零且不把partial stdout/file当成功。协议由父与B统一冻结。

## record白名单候选（字段均来自实际存储，不额外dump）

|族|候选保留字段|需要过滤/裁定|
|---|---|---|
|actor attribution|id,kind,display_name|只收导出材料的author/editor/creator/resolver/owner来源；不dump全actor/membership或credential，disabled_at是否必要父定|
|space|id,slug,current_revision,policy_revision,created_at|acl_epoch运维域建议不导出，header另说明snapshot；不带membership|
|space_revision|space_id,revision,objective,rules,review_policy,check_profiles,pinned_refs,editor_id,created_at|配置不是正式review结果；pinned_refs同space可见性与来源actor过滤|
|thread/thread_version|id,space_id,title,version,state,creator_id,created_at,updated_at；thread_id,version,title,state,created_at|稳定旧版本，space归属join|
|post|id,space_id,thread_id,author_id,kind,current_revision,lifecycle,created_at|当前redacted只墓碑，不正式approve flag|
|post_revision|post_id,revision,title,summary,body,tags,structured,content_hash,editor_id,created_at|原stored结构保真但ref fields过滤不可见跨space；当前redacted省内容/hash，仅墓碑定位；超行cap失败|
|relation|id,space_id,source_post_id/source_revision,target_post_id/target_revision,type,state,version,creator_id,created_at|双方固定ref同space存在/可见，脱敏仅定位，不加issue正文|
|relation_resolution|id,relation_id,version,resolver_id,reason_ref,action,created_at|所属relation与reason固定ref均检查，禁止泄跨space|
|revision_artifact link|post_id,revision,artifact_id,purpose|post与artifact同space/public授权，redacted父决定是否仅墓碑link|
|artifact manifest|id,space_id,owner_id,visibility='space',sha256,bytes,mime,state,created_at,content_url|仅当前可下载ready清单，redacted/missing仅授权墓碑候选，不sha/hash/内部storage_key/review_assignment_id/check_run_id/bytes内容|
|tombstone|record family,id/固定ref,space_id,lifecycle/state,必要归属与时间|禁止原文/tag/structured/content_hash泄露；不dumpredactions.reason（可能敏感）|

排除所有credentials、instance_metadata/token_secret、sessions、memberships及其独立组策略、subscriptions/consumers/delivery_batches、idempotency、FTS、原redaction理由、私有review字段。事件首包不建议额外dump（不是必需研究对象，可能扩大可见投影），由父确认。

header+record+completion footer候选：header声明format/version、space/snapshot/source语义及普通review not_enabled；逐族确定keyset稳定顺序；completion含完整记录计数/UTF8字节或digest（计数/摘要不要求全数组）。完整性摘要不证明来源身份真实性，不把imported研究材料升级批准。header不公开服务path/secret，来源ID仅本导出原始命名空间。尚未定具体schema、限额或数据源stamp。

## 最小后续文件候选与父需冻结

A：core新space-export-service.ts与port里的专用snapshot/session类型（protocol record由B协作定义），storage-sqlite新space-export-snapshot.ts+SqliteStorage窄factory/index出口，相关新集成test；docs03/07与ADR037。本次只写此规划，不生成接口。现构造器保持，若需要选择readOnlyFactory附加参数先父冻结；不改bootstrap/schema/lock/backup接口。

父重点冻结三点：独立readonly vs spool/多snapshot；安全变化abort vs墓碑覆盖与准确复核/背压/deadline边界；record/ref白名单、header来源与line/总量限额/完整footer/error语义。仅在冻结后按实际边界实现、正式before/定向验证；未实测readonly驱动/WAL是本规划事实限制。

## 父追问：事件高水位redaction guard的可行事实

当前公开脱敏API唯一入口server/admin.ts POST /spaces/:space_id/redactions→RedactionService.createRedaction→IdempotencyService写事务，在同tx调用storage.createRedaction清理并appendEvent，type确为post.redacted/artifact.redacted、visibility=public。重复幂等重放不再变正文，不追加新事件；guard以第一次事件即可。未发现另一个公开API直接updateArtifactState(redacted)或updatePost(redacted)绕事件。外部直接写SQLite不在服务合作承诺内。

snapshot建立时读该space latest event seq；每个next/yield及完成footer前，在活主连接短同步snapshot内refreshContext+requireSpaceAccess并核space.acl_epoch，再执行`SELECT 1 FROM events WHERE space_id=? AND seq>? AND type IN ('post.redacted','artifact.redacted') LIMIT 1`。idx_events_space_seq(space_id,seq)与UNIQUE(space_id,seq)已有，可做range扫描，不需迁移/新epoch。找到任何该space后续脱敏即中止整流、不给completion；能覆盖已经输出的post之后脱敏，而不只保护当前row。普通新增post/revision事件不直接导致中止。

查询成本不是恒定：type不在索引，若每行总从初始highwater重扫，很多普通并发事件会反复扫描。最小优化候选是core持一个瞬时checkedThroughSeq，live同一短snapshot先取latestSeq，再只查`checkedThroughSeq < seq <= latestSeq`区间，无redaction才推进checkedThroughSeq；最后同流程。events历史追加不可变，单调推进仍检测全部初始snapshot后事件；不存session/新表。没有新事件时只查latest highwater；每个新增事件最多扫一次，SQLite VM/CPU时间仍非硬预算。父若要求每行严格固定CPU预算，须另冻结有界扫描超限中止语义，不凭索引宣称完全恒定成本。

权限变更每次活auth复核，acl_epoch变动可整流中止。已输出字节无法召回，footer/CLI完整性可拒接受中止材料但不能抹除用户收到的部分正文。背压后必须先下一次guard再next row/write，不能预取并排一大batch旧内容后才check。live当前对象状态检查可补强外部直接row修改夹具，不能拿旧snapshot当脱敏权威。

thread title不是脱敏post的自动派生字段：当前redaction不清thread/title或其他post引用/粘贴文本；应输出该线程当前允许的独立标题，不承诺自动识别同文本敏感。structured中已知source_refs/evidence_refs与space pinned_refs按同space固定ref存在性白名单过滤，redacted指针只保墓碑状态，不输出关联旧正文/现版本比较；不能把任意字符串/URL抓取或递归当系统引用。关系resolution reason_ref同规则。对structured历史未知字段是保可见用户正文还是kind白名单须父冻结；不把此投影说成任意秘密识别器。

file-backed-only限定可接受性由父裁定：生产CLI init/serve磁盘DB是现支持路径；既有:memory:storage/server构造及旧测试保持原功能，仅新export若调用则明确不支持，不悄悄serialize全内存DB。新export测试应使用真实file/WAL验证独立reader内容snapshot与活writer撤权/脱敏行为。尚未做driver/reader实验，此为实现前事实限制。
