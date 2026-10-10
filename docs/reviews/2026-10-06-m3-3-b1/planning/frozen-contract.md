# M3.3-B.1 父冻结接口与来源语义

2026-10-06。A core/storage、B protocol/server/client/CLI、C独验，保留旧证据。以下为父确定并已按接口实现的契约；验收结论仍以C实际运行与父接受为准。

## Reader与传输接线

StoragePort新增openSpaceExportSnapshot(spaceId)、getExportEventSeq(spaceId):string、hasExportRedactionAfter(spaceId,afterSeq:string,throughSeq:string)。专用port文件core/ports/space-export-snapshot.ts，readonly session属性spaceRevision/aclEpoch/eventSeq:string，nextCandidate(maxRawBytes)、postRef、artifactState、close。SQLite实现space-export-snapshot.ts，SqliteStorage从db.name读取真实file，以readonly+query_only+cache_size=-2048、BEGIN并首次读建立一致snapshot；只查询journal_mode，非WAL/:memory:/不可文件readonlyreader仅新export拒503 EXPORT_UNAVAILABLE/retryable=false，不改源mode、不迁移、不serialize整个内存DB。

SpaceExportService(storage,authService,clock,{limits?})；open(auth,spaceId,{onError?})返回同步session：nextLine()→line{kind:'line',line:string}/pending/done，close幂等。service.activeCount、closeAll。deadline独立timer可在背压停顿时关闭reader/释放槽并通知onError。每次最多128过滤candidate后pending，server让出event loop；不预提交多个未复核row。nextLine到transport同步交line不跨await，背压后下次next重新check。error/取消/断开/shutdown finally关闭reader和槽。

每yield/footer前用活主storage短readSnapshot refresh actor/credential+space observer权限、核acl_epoch，检查(snapshot seq,live seq]内任何本space post.redacted/artifact.redacted则409 EXPORT_INVALIDATED，无完成footer。checkedThroughSeq无redaction才推进，普通write不invalidate。SQLite highwater CASTMAXAS TEXT及string绑定，BigInt比较，保SQLite64位真值；不改旧event API。已给网络字节不可回收，客户端仅有效end+EOF接收完成。

## 唯一protocol限额与wire

EXPORT_LIMITS：max_raw_bytes=1048576、max_line_bytes=1048576（含LF）、max_total_bytes=536870912（含end）、max_records=2000000、deadline_ms=120000、max_active=4。构造测试只可缩小，不开放HTTP扩大。raw先在SQL测候选UTF8长度，再读text/parse；encode实际UTF8+LF再测。超限422 EXPORT_LIMIT_EXCEEDED，并发429 RATE_LIMITED。一row/一line/chain，不全空间巨数组；SQL VM/CPU不是硬时间预算，同步.get未返回不能由JS timer中断，长readonlysnapshot可能阻WAL截断，准确报告该限制。

header固定type=header/format=detuned-space-export/version1/export_id=exp_UUID/created_atISO/source{space_id,schema_version2,snapshot_event_seq decimalstring,space_revision}/identity_semantics=source_actor_ids_only/scope=public_research/hash_algorithm=sha256-chain-v1/formal_review_status=formal_check_status=not_enabled。无public instance UUID、secret hash或actor个人属性dump，原author/editor/creator/resolver/owner ID仅来源归属、不授本实例身份权限。

record{type:'record',seq:1起连续,kind,data}，族顺序space/space_revision/thread/thread_version/post/post_revision/relation/relation_resolution/revision_artifact/artifact，每族确定key序。白名单精确schema归B protocol/export.ts；A显式字段投影不SQLspread。space不出acl_epoch，排除session_id/credentials/token_secret/sessions/memberships/events/consumers/幂等/redactions.reason/private bindings/storage_key。

redacted post{id,space_id,thread_id,current_revision,lifecycle:redacted,tombstone:true}，旧revision仅{post_id,revision,tombstone:true}。redacted/missing artifact仅{id,space_id,state,tombstone:true}，ready public同space清单含id/space/owner/visibility/sha256/bytes/mime/state/created_at/content_url，不inline bytes。redacted post revision_artifact不出；其余public同space可指授权墓碑。relations双方、resolution reason_ref、space pinnedrefs都查同space固定ref；redacted pointer允许，跨space/缺失/private过滤不输出ID。structured仅source_refs/subject_refs/evidence_refs/target_ref四已知引用字段做投影；未知structured.pinned_refs与其它用户内容保留，不作为系统引用、不任意抓URL/识别秘密。post_revision投影改动时projected=true且无source_content_hash，未改保source_content_hash；pinnedrefs被过滤space_revision标projected。普通review/decision不是正式批准。

链初始32zero bytes，对每exactUTF8 header/record line含LF作SHA256(prevRaw32||line)，end不入链。end{type:'end',complete:true,record_count,bytes_before_end,chain_sha256}，严格v1每行/seq/大小/hash/end后EOF才成功；空行/CRLF/缺末LF/end后额外材料拒绝。摘要证明流完整性不证明签名或来源真实性。无import实现，不改业务history/ack/幂等。

导出 relation_resolution 家族以 resolution `id` 主键升序稳定分页；关系家族先输出。版本和引用保持原值，串流不承诺按 relation/version 连续排序。
