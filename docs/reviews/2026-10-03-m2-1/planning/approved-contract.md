# M2.1 已批准合同

父 Agent 2026-10-03批准；替代contracts.md草案。本Agent core/storage/protocol；Unit B负责FS/server/CLI。

## 冻结接口

core/ports/blob-store.ts：StagedBlob {readonly stage_key:string; readonly sha256:string; readonly bytes:number}；BlobStorePort.stage(chunks:AsyncIterable<Uint8Array>,maxBytes:number,signal?:AbortSignal):Promise<StagedBlob>；publish(staged:StagedBlob,storageKey:string):Promise<void>；discardStage(staged):Promise<void>；discardPublished(key):Promise<void>；exists(key):Promise<boolean>；open(key):Promise<AsyncIterable<Uint8Array>|null>。cleanupOrphans仅具体FS管理方法，CLI持DirectoryLock并listen前调用，core普通port不含cleanup。

protocol/artifacts.ts：ArtifactLimits{max_file_bytes:number;max_space_bytes:number}；DEFAULT_ARTIFACT_LIMITS=25MiB/1GiB；resolveArtifactLimits(partial={}):ArtifactLimits。两值正safeint，file≤26214400、space≤MAX_SAFE，无file≤space限制。CreateArtifactMetadata{visibility?:'space'}，禁止未知绑定。ArtifactMetadata字段id/space_id/owner_id/visibility:'space'/sha256/bytes/mime/state/created_at/content_url，无storage_key/原名/绑定。content_url受同服务认证，不是免认证签名URL。

ArtifactService构造(storage:StoragePort,blobs:BlobStorePort,auth:AuthService,idempotency:IdempotencyService,idGen:IdGeneratorPort,clock:ClockPort,limits:ArtifactLimits)；authorizeUpload(auth,spaceId):void；create(auth,spaceId,{staged,mime,metadata},requestKey):Promise<ArtifactMetadata>；getMetadata(auth,spaceId,id):Promise<ArtifactMetadata>；getContent(auth,spaceId,id):Promise<{metadata:ArtifactMetadata;chunks:AsyncIterable<Uint8Array>;download_name:string}>。

StoragePort新增getArtifactBytesInSpace(spaceId):number（sum全部state）、listArtifactStorageKeys():string[]（全部记录用于启动保留）、createRevisionArtifact(postId,revision,artifactId,purpose):void。不改SQL/schema/迁移。

## 行为与所有权

server负责multipart传输：file恰好一个、metadata最多一个JSON object≤4096 UTF-8 bytes，顺序任意，额外/重复拒绝，全部part验证完成后create。create调用前失败由server清stage；create调用即core接管stage。stage limit由服务注入；并发传输pool归server不替代core空间quota。

core流前和DB事务内reload当前actor/credential撤销/过期与membership授权；contributor+read/write或admin。文件先fsync，无覆盖publish完成objects目录sync后才短immediate事务；publish成功前core不能删除可能冲突的existing key。新ready、artifact.created、typed幂等同事务。失败/重放清本次stage/final，多余文件不计费；cleanup失败保留原错误无敏感诊断，启动恢复。事务内无await文件I/O。

幂等payload={sha256,bytes,mime,visibility:'space'}，ref={v:1,kind:'artifact',artifact_id}；旧11族保持。不同key不去重、分别计费；同key同语义同对象、变化409。typed引用持久合法性不依赖后来的redacted/missing或物理存在；返回重放时由ArtifactService当前ACL/state/exists决定。metadata/下载新请求redacted410、物理missing404不自动改DB state；已打开授权流不承诺即时撤权。

MIME normalizeArtifactMime(input:string|undefined)：缺失octet-stream，trim+lowercase base type/subtype为严格ASCII token/token；原Content-Type参数允许剥离不参与hash/header；任何控制字符拒绝。filename不持久化，下载名安全artifactID，attachment/nosniff。

post/initial_post/revision事务：artifact_ids互异（schema及业务重复400）；same space/ready/space visibility允许另一作者引用；structured artifact evidence必须列artifact_ids；写revision_artifacts purpose=evidence。只查DBstate，不等FS。redacted410/missing或不可见404。

Event新增artifact.created复用object_id=artifact.id/revision=null/public及既有envelope，不加payload。仅space附件，私密review/check拒绝。

## 三路由与说明

POST /spaces/:space_id/artifacts真实multipart/form-data，必需Idempotency-Key，201 envelope data DTO；GET /.../:id元信息200 envelope；GET /.../:id/content字节流。三路由始终挂、OpenAPI固定35目录。无blob配置附件请求写入前500 TEMPORARILY_UNAVAILABLE并明确后端未配置，不能隐式目录。CLI serve真实FS注入/启动清理/记录实际限额；本包不加CLI upload。

旧AE03/G01只比较JSON槽，multipart双方无JSON schema为null自然一致；不伪造JSON，不改历史probe。当前正式G01需JSON槽后?.，C01硬编码32/19改真实结构比较。新正式multipart/binary测试独立负责传输语义。SQL/archive与历史证据保留。
