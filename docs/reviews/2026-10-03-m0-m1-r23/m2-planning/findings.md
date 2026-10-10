# M2.1 实施输入：只读事实与待决项

2026-10-03，未实施/安装/测试附件；以下备选由父 Agent取舍，不是新增获批契约。

## 规范事实

- docs03:26、protocol/artifacts.ts:19：Artifact字段 id/space_id/owner_id/visibility/review_assignment_id/check_run_id/sha256/bytes/mime/storage_key/state/created_at；两个绑定字段可null，hash为64字符、bytes范围0–26214400。状态ready/redacted/missing；visibility=space/review_assignment。协议尚未声明filename字段，不能默默新增持久字段。
- docs03:27、39：修订关联post_id/revision/artifact_id/purpose；必须同空间、ready、可见；证据中artifact也须列artifact_ids。SQL实际只声明artifact外键，未声明post+revision复合外键，故服务端业务验证不能省。
- docs04:72–74：POST /spaces/:space_id/artifacts为multipart file+metadata，创建ready；独立上传先于引用。GET /artifacts/:id返回元信息和鉴权下载地址，GET /content受同样权限检查并输出字节流。docs04:8的一般业务创建要求Idempotency-Key适用上传；附件专有request-hash、metadata格式、part数量、重复file政策未指定，待明确。
- docs04:105：CLI文件上传是预期产品入口，MCP/Pi首版仅关联artifact_id；是否本M2.1包含最小CLI上传还是等M4须父Agent定界。
- docs07:41–49：文件名只显示、服务生成key、防穿越/符号链接越界；Content-Disposition attachment与nosniff；不内嵌主动内容/不执行/不抓外链。默认25MiB单文件/1GiB空间，可由管理员调整并记录；私有review不能公共引用、缓存/哈希也不能绕ACL。配额计入redacted/missing/temp/reservation与去重是否节省计费未指定。
- docs09 T07：超额/并发、相同文件、穿越名、中断、DB失败均须验证，不能引用半成品；T04无权元信息/下载不泄漏；T13脱敏后附件不再返回原文。孤儿清理要求存在，但触发方式、保留期、进行中上传识别未指定。docs04事件目录只有artifact.redacted，未声明artifact.created；不得自行新增事件名。
- ADR003单SQLite写实例、ADR011离线一致备份可复用背景；没有附件finalize顺序决策。M3备份/M6私有评审留后续，不扩大本包。

## 当前可复用实现与扩展点

| 位置 | 确切现状/签名 | M2.1缺口 |
|---|---|---|
| storage-sqlite/src/schema.sql:140 | artifacts上述12列；space/owner FK，无filename/配额/临时状态/唯一hash-key约束 | 最小ready-only记录可不改现表；持久reservation/filename/强约束则需要迁移 |
| schema.sql:155 | revision_artifacts(post_id,revision,artifact_id,purpose)，三字段PK | 当前没有storage关联API；未来启用引用需增写入/读取与业务验证 |
| core/ports/storage.ts:119 | createArtifact(artifact: Artifact): void；updateArtifactState(id: string,state: Artifact['state']): void；findArtifactById(id: string): Artifact \| null | 缺space用量求和、完整storage-key清单、关联API；现有接口足以基本记录/读取 |
| sqlite-storage.ts:893–940 | 上述三个接口已有真实SQL实现 | createArtifact不做ACL/配额/hash/FS；须ArtifactService负责 |
| StoragePort:50/sqlite-storage.ts:48 | transaction<T>(fn:(tx:StoragePort)=>T):T；run.immediate()，嵌套同tx | 同步短事务；不可把await流式上传放进事务 |
| core/auth-service.ts:87 | requireSpaceAccess(auth:AuthenticatedContext,spaceId:string,minimumRole:SpaceRole='observer'):SpaceAuthContext | 下载复用observer鉴权；上传所需角色待明确（通常现写操作研究成员规则，非本报告决定） |
| core/ports/hasher.ts | sha256(data:string\|Buffer):string；canonicalJson(data:unknown):string | 当前hash要求完整Buffer，流式hash需文件port/Node createHash在实现边界增量，不应把文件全读进内存 |
| clock.ts/id-generator.ts | now()/nowIso()；generateId(prefix?:string):string | 复用服务时间/id，不信客户端owner/hash/key |
| server/app.ts:36 | AppOptions{storage,clock?,idGen?,hasher?,tokenSigner?,tokenSecret?}；buildApp(options):FastifyInstance | 没有文件存储/配额配置注入；应组合根显式注入，业务不读env |
| cli/index.ts:165–189 | serve已有dataDir、DirectoryLock、DB目录；buildApp({storage}) | 可提供同dataDir受限附件根与清理运行边界，不能新建全局配置 |
| server/package.json | @fastify/multipart ^9.0.3已声明 | 无需先新增multipart依赖；当前未注册附件路由/插件，无ArtifactService或FS port |
| post-service.ts:123、279/thread-service.ts:120 | 非空artifact_ids直接VALIDATION_ERROR，说明M2未开放 | M2.1若要求ready可引用，须替换这三stub并在修订事务校验/写关联 |
| redaction-service.ts:57–108/sqlite-storage.ts:1403 | 已校验空间与目标、事务改redacted并append artifact.redacted | 现不删除FS文件；下载必须拒绝redacted，物理回收策略待定 |
| idempotency-service.ts:2591 | executeIdempotent<T>(actorId,spaceId,operation,key,payload,statusCode,action:(tx)=>T):{data:T,isReplay:boolean} | parseOperation/extract/validate/reconstruct白名单为11族，尚无artifact.create；不能直接塞第12族绕过严格管线 |

## 迁移/旧B回归影响（需父Agent决定）

不增列/表的“临时文件仅FS、ready记录才入DB”路线可复用现artifact表；space配额查询可在同immediate事务求和再insert。不能因此声称无需任何storage/core改动。若需持久配额预留、上传状态、display filename、唯一storage_key或修订复合外键则必须正式迁移，更新单DDL生成profile；冻结historical-v1 SQL原字节保留。

新增artifact幂等族会触及B的operation白名单、typed result ref、重放鉴权/脱敏和启动规范化路径；B01原11族仍须通过，再加附件新族正式覆盖，不重写旧断言假装覆盖。新迁移/DDL若引入v3，需核对旧upgrade/profile探针预期v2及schema-generation测试，不能随手改旧baseline或冻结fixture。现stub替换需回归原拒绝无权/跨空间/非ready附件；旧测试未见广泛artifact_ids断言，需有限确认，不能把未测等同通过。

## 两种最小文件/DB完成顺序备选

A. **FS先final、DB后ready**：流式写同根临时文件并算hash/bytes→close/必要sync→生成key且无覆盖rename→短DB事务重新鉴权/额度/幂等并写ready→返回。中断只留temp；DB失败/crash留无DB引用的final孤儿可清；不会正常提交ready但文件尚未final。需清理与finalize互斥/活跃key保护，避免清理抢删；并发同key幂等重放应删多余上传文件。临时空间需独立有界限制，空间quota可在final DB事务检查，但多个未final上传会暂耗磁盘。

B. **DB持久预留、FS完成、DB发布**：短事务建立独立upload/reservation记录并占额度（不创建可引用ready Artifact）→流式temp/hash/final rename→短事务发布ready+幂等并释放预留→返回。崩溃记录可识别进行中/孤儿，并发配额易约束；需新表/迁移与超时回收规则，恢复状态更多、实现范围较大。不能借用既有missing状态冒充pending后让读取/计费语义漂移。

两者均不能宣称FS与DB单事务；核心CI需真实临时FS/SQLite覆盖中断、配额争用、finalize DB失败、重启清理和撤权下载。hash去重、upload metadata/part次序、content MIME/文件名、安全清理保留期、幂等hash组成、CLI是否本包、artifact事件/私有可见性启用范围是待决项；此报告未批准其中任何新契约。
