# M2.1 合同草案：待父 Agent 批准

2026-10-03。只写设计，不改产品。以下按父 Agent 已选 FS→DB 顺序明确类型；数值配置边界、MIME与事件表示的细节请批准后冻结给实现者。

## 边界与已发现的一处表示冲突

现 EventSchema/events表没有payload列，只有object_id（protocol/events.ts:31，sqlite-storage.ts:952）。父方案“artifact.created最小payload仅artifact_id”可无SQL变更实现为既有Event：type='artifact.created'、object_id=artifact.id、revision=null、visibility='public'，其他仅既有event envelope字段；消费方将object_id理解为artifact_id。**不额外新增payload字段**，除非父 Agent另批准协议变化。docs04原目录仅artifact.redacted；新增created是此次已授权扩展，须ADR说明。

原AE03只取requestBody.content['application/json']?.schema，G01同样只比JSON槽；multipart requestBody仅multipart/form-data且Fastify无body schema时，双方均null，可自然保持比较通过，不能冒充JSON。新正式multipart测试负责file/metadata/重复/顺序/限额。旧C01的32/19数量断言须改结构比较或准确区分JSON操作，不改历史探针。

## 精确接口建议（共同依赖合同）

```ts
// core/ports/blob-store.ts: internal handles never appear in HTTP DTO/events.
export interface StagedBlob {
  readonly stage_key: string;
  readonly sha256: string;
  readonly bytes: number;
}
export interface BlobStorePort {
  stage(chunks: AsyncIterable<Uint8Array>, maxBytes: number, signal?: AbortSignal): Promise<StagedBlob>;
  publish(staged: StagedBlob, storageKey: string): Promise<void>; // no overwrite
  discardStage(staged: StagedBlob): Promise<void>; // absent is success
  discardPublished(storageKey: string): Promise<void>; // absent is success
  exists(storageKey: string): Promise<boolean>; // safe regular-file existence, no symlink traversal
  open(storageKey: string): Promise<AsyncIterable<Uint8Array> | null>;
  // CLI invokes only with DirectoryLock held, before listen. No runtime scheduler.
  cleanupOrphans(retainedStorageKeys: readonly string[]): Promise<void>;
}
// protocol/artifacts.ts
export interface ArtifactLimits {
  max_file_bytes: number;
  max_space_bytes: number;
}
export const DEFAULT_ARTIFACT_LIMITS = {
  max_file_bytes: 26_214_400,
  max_space_bytes: 1_073_741_824,
};
export interface CreateArtifactMetadata { visibility?: 'space' }
export interface ArtifactMetadata {
  id: string;
  space_id: string;
  owner_id: string;
  visibility: 'space';
  sha256: string;
  bytes: number;
  mime: string;
  state: 'ready' | 'redacted' | 'missing';
  created_at: string;
  content_url: string; // /api/v1/spaces/{space_id}/artifacts/{id}/content
}
// no storage_key, original filename, review/check binding in public DTO.
// core/services/artifact-service.ts
export interface CreateArtifactInput {
  staged: StagedBlob;
  mime: string;
  metadata: CreateArtifactMetadata;
}
export interface ArtifactContent {
  metadata: ArtifactMetadata;
  chunks: AsyncIterable<Uint8Array>;
  download_name: string; // server generated safe artifact ID, no original filename
}
export class ArtifactService {
  constructor(storage: StoragePort, blobs: BlobStorePort,
    auth: AuthService, idempotency: IdempotencyService,
    idGen: IdGeneratorPort, clock: ClockPort, limits: ArtifactLimits);
  authorizeUpload(auth: AuthenticatedContext, spaceId: string): void;
  create(auth: AuthenticatedContext, spaceId: string,
    input: CreateArtifactInput, requestKey: string): Promise<ArtifactMetadata>;
  getMetadata(auth: AuthenticatedContext, spaceId: string,
    artifactId: string): Promise<ArtifactMetadata>;
  getContent(auth: AuthenticatedContext, spaceId: string,
    artifactId: string): Promise<ArtifactContent>;
}
// extend existing StoragePort, SQL implementation only, no schema changes:
getArtifactBytesInSpace(spaceId: string): number; // SUM all states, no dedup
listArtifactStorageKeys(): string[]; // all records/states; startup cleanup preserves them
createRevisionArtifact(postId: string, revision: number,
  artifactId: string, purpose: string): void;
// AppOptions additions (keeps current callers working without blobs):
blobStore?: BlobStorePort;
artifactLimits?: Partial<ArtifactLimits>;
```

Without blobStore, no artifact routes/module advertised; old in-memory app callers retain behavior. Server implementation instantiates ArtifactService only when injected; CLI serve injects its scoped FS implementation and validated limits. Missing blob port must never fake upload success. New storage methods require all real StoragePort implementations to satisfy signatures.

**配置建议**：merge defaults后两者必须safe integer且>0；max_file_bytes≤26214400（现ArtifactSchema上界）、max_space_bytes≤Number.MAX_SAFE_INTEGER，且max_file_bytes≤max_space_bytes。拒绝NaN/Infinity/小数/字符串，组合根配置字符串只在CLI解析，再注入数字。max_space默认1GiB；没有随意引入1TiB产品限制。metadata固定4096 UTF-8字节上限，不作为可变业务配额。

## 生命周期与失败清理责任

1. server鉴权/HTTP multipart边界；恰好file一个、metadata最多一个JSON对象，其他part一律拒绝。可任意顺序，全部part消费并验证成功后调用create。metadata只visibility可省略或space，拒绝review/check及未知字段；metadata UTF-8≤4096。server调用blobs.stage流式文件，任何剩余part失败/中断由server finally discardStage。
2. 一旦server调用create，core取得staged所有权；server不再删除core接管的文件。core验证输入/权限/幂等key，publish无覆盖至服务生成storage_key（独立UUID/id，不用原名/用户路径）。core finally清理未发布stage；publish成功后所有失败及重放均discardPublished本次key。
3. publish完成后短同步transaction，重新requireSpaceAccess(contributor)、构造幂等payload={sha256,bytes,mime,visibility:'space'}并executeIdempotent('artifact.create')；action内sum所有Artifact.bytes+本次bytes≤limit，再createArtifact(ready)+appendEvent。result_ref v1/kind='artifact'/artifact_id，复用旧管线新增分支；历史11族/typed版本不变。
4. 新写成功保留已发布文件；重放返回旧id，删除本次冗余文件。key同语义不重复计费，不同语义既有409；不同key即使字节相同也独立对象分别计费。清理失败不得改业务409为成功，不能留未观察Promise；保留原错误并附非敏感cleanup诊断，孤儿留启动清理处理。
5. metadata/read与replay先当前授权、同space及visibility检查；redacted授权后410，不给旧成功content_url；不存在/无权/missing文件404。getMetadata通过exists检查物理文件；getContent打开后交server流响应（Readable.from），断线须调用iterator.return销毁句柄。正在进行的已授权流不承诺瞬时撤回；新请求重查当前ACL/state。missing物理文件404且GET不自动改DB state，redacted保留记录/计费。
6. CLI持DirectoryLock且DB协调成功、HTTP listen之前，用listArtifactStorageKeys保留所有状态已登记key，清除无登记final及所有temp；无runtime清理，不会与本服务正在上传竞态。discard/cleanup只在受限服务生成路径，禁止递归跟随symlink。

## HTTP、MIME与引用合同建议

POST /spaces/:space_id/artifacts：multipart/form-data，file(binary)必需、metadata(string JSON)可选；业务Idempotency-Key必需非空，禁止query。201标准envelope data=ArtifactMetadata；重放仍201。413单文件超限，429空间quota，400非法parts/metadata/MIME，404无权/不存在，410已redacted重放。

GET /.../:id：200 envelope data=ArtifactMetadata；GET /.../:id/content：字节流、Content-Type规范mime、Content-Disposition attachment; filename="{安全artifactID}"、X-Content-Type-Options:nosniff；禁止query。content_url为同服务相对路径且始终须Bearer认证，不是签名免认证URL。

MIME建议：读取文件part的解析media type，trim+lowercase，只接受ASCII `type/subtype`，两侧token为RFC token字符 `[!#$%&'*+.^_\x60|~0-9A-Za-z-]+`；不接受空、CR/LF、额外slash、分号参数或header注入；缺失采用application/octet-stream。原Content-Type若含参数，解析器输出是否剥离需server实现者核对并在测试说明，不以参数参与幂等hash。若父Agent要求接受charset等参数，须明确仅media type规范化进入DTO/hash。

引用：新post/initial_post/revision的同业务事务内逐artifact_ids查同space/space visibility/ready并写revision_artifacts(purpose='evidence')；structured evidence_refs中kind=artifact的id必须在artifact_ids。不自动给structured推导新字段，不扩大M2.2规则；重复artifact_ids策略建议schema uniqueItems或业务拒绝400，但现契约未规定，**待父Agent批准，不擅自增加**。附件不存在/无权统一404；redacted410；非ready不能引用。引用允许附件属于同space另一有权actor，不要求owner同帖子作者。

## 文件所有权建议与需要批准的点

本Agent：protocol/artifacts.ts/events.ts/openapi.ts/index.ts、core/ports/{blob-store,storage}.ts、core/services/{artifact,idempotency,post,thread}-service.ts及core/index.ts、storage-sqlite/src/sqlite-storage.ts，docs04/12对应文字。**不改schema.sql/schema.ts/迁移/冻结fixture。** server/CLI/FS实现由另一Agent：新BlobStore实现、multipart三route、AppOptions注入、CLI持锁启动清理和stream释放。正式测试另划分新M2.1文件，旧32/19正式断言仅合理结构替代。

请父Agent批准：①以上签名与所有权转移；②Event用object_id而无payload字段；③配置safe integer边界；④MIME参数处理；⑤引用重复id政策；⑥不开blob时不暴露新路由；⑦exists接口供getMetadata检查物理文件，不更改DB state。server建议的并发stage/lease预算如需引入亦待批准，不把它擅自作为业务契约。批准后再落地实现，届时接口稳定给另一Agent使用。
