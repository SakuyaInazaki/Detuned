# M2.1：文件系统、HTTP传输与CLI生命周期设计

2026-10-03，设计阶段。父 Agent已确定stage→unique blob→短DB事务架构；本记录仅定位与拟定接口，未改产品，等待父 Agent批准精确port后实现。core/storage/protocol由契约 Agent负责，权限/额度/状态/引用/幂等不下放路由。

## 已有落点与文件所有权

已读当前 server/app.ts、server routes、CLI serve、storage DirectoryLock与artifact方法、protocol/artifacts.ts、docs03/04/07/09及安装版@fastify/multipart README。multipart已是server依赖，无需安装。当前buildApp仅同步组合服务，CLI serve已先取得DirectoryLock、打开并协调DB，再buildApp/listen；可以在此启动窗口增加孤儿恢复，不能让buildApp自动GC。

拟独占修改：

- `packages/server/src/artifact-files.ts`（新增）：流式blob实现、安全根与仅启动清理。
- `packages/server/src/routes/artifacts.ts`（新增）：三个既定端点的multipart/JSON-envelope/download headers传输。
- `packages/server/src/app.ts`、`packages/server/src/index.ts`：显式注入与导出FS实现/注册传输路由，未提供blob配置时不偷偷创建目录。
- `packages/cli/src/index.ts`：只改serve配置/FS初始化/启动恢复/关闭顺序；不开发专用upload命令。
- `tests/integration/m2-artifacts-filesystem.test.ts`、`tests/integration/m2-artifacts-http.test.ts`、`tests/integration/m2-artifacts-cli.test.ts`（拟新增）：真实临时FS/SQLite/流与CLI启动测试。
- 本规划和后续本单元交付记录。不得修改contract Agent的core/storage/protocol及其测试、旧review/probe/observed、SQL/archive。

## 待对齐的窄port

以下是接口建议而非已批准契约；已发送契约 Agent确认。

```ts
interface StagedArtifactBlob {
  stage_key: string; // 服务生成的不透明句柄，仅内部
  sha256: string;
  bytes: number;
}
interface ArtifactBlobPort {
  stage(chunks: AsyncIterable<Uint8Array>, maxBytes: number,
    signal?: AbortSignal): Promise<StagedArtifactBlob>;
  publish(staged: StagedArtifactBlob, storageKey: string): Promise<void>;
  discardStage(staged: StagedArtifactBlob): Promise<void>;
  discardPublished(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  open(storageKey: string): Promise<AsyncIterable<Uint8Array> | null>;
}
```

core声明port并注入ArtifactService；Node FS实现由server导出。stage只处理传输资源上限/流，不判断actor、space权限、space配额或幂等。publish使用core的idGen生成unique storage_key，必须无覆盖地发布，不以sha去重；事务失败或相同key重放，由core调用discardPublished清理本次多余blob。stage及blob句柄不进入公共响应。

与契约 Agent已对齐的服务协调入口：`authorizeUpload(auth,space):void`在读取前由core初查；route完成file暂存及所有metadata验证后，调用`create(auth,space,{staged,mime,metadata},key)`交core接管stage。create复查权限/空间配额/幂等，publish后短SQLite事务写ready/事件/幂等，成功/重放/失败均清理本次额外stage/blob；create之前part解析失败由route discardStage。精确类型名称以其规划contracts.md和父 Agent批准为准。

默认最多4个活跃upload的lease属于server传输资源边界（不判断space配额），从开始遍历part到create/finalize完成与清理finally；计数只在同步进入/退出处更新，超限QUOTA_EXCEEDED。此落点待父 Agent批准，不添加后台scheduler。

下载由core先完成ACL/state检查并返回已鉴权内容描述，FS.open只解释服务生成key；route设置响应header/发送流。metadata输出必须省略storage_key，并返回认证的相对content URL。missing物理文件404，本包GET不自动更新DBstate；redacted在ACL后410，任何新请求重新鉴权。开流时鉴权后，已开始单次下载允许继续，不承诺瞬时撤回。

## FS实现选择与恢复边界

CLI以dataDir为根，服务生成`artifacts/staging`和`artifacts/objects`。初始化拒绝根或子根符号链接，取得canonical realpath并核对子根严格位于data根内；每次操作检查根未变、key仅允许服务生成的固定字符单段名。用户filename不参与路径、不持久化；download filename采用安全artifact ID。

stage使用随机key与O_CREAT|O_EXCL|O_WRONLY|O_NOFOLLOW，mode0600，根mode0700；逐chunk写文件、增量SHA256与计数，不聚合整个file。超过25MiB、source异常、request abort均关闭FD并删除stage。写入完成后关闭FD；publish以同文件系统hard link创建objects随机目标（EEXIST不能覆盖，生成另一目标或失败），成功后unlink stage。若publish后崩溃，objects孤儿留给下次启动清理。objects read以O_NOFOLLOW打开并验证普通文件；相对穿越、绝对key、符号链接拒绝。

root路径检查及O_NOFOLLOW针对不可信输入、静态symlink和应用内路径误用；数据目录本身须由服务独占控制，不声称可抵抗有OS权限的恶意进程不断替换父目录。文件系统与SQLite不是一个原子事务：publish→DB commit存在崩溃窗口，通过启动恢复解决，不能写成同事务文件发布。

FS实现管理接口另提供`cleanupUnreferenced(liveStorageKeys)`，不属于普通core blob port。CLI已持DirectoryLock且DB coordination成功后，通过storage读取所有artifact记录key（含redacted/missing，避免误删有记录对象），先清stage再删未引用的服务生成objects，完成后才listen。只清已知命名的普通文件；不跟随symlink、不运行递归删除任意路径，不在运行中进行全目录GC；buildApp从不调用该接口。需contract Agent提供只读全artifact key列表方法。

## multipart与HTTP

既定POST `/spaces/:space_id/artifacts`：安装版req.parts异步遍历，不使用toBuffer或attachFieldsToBody。恰一个file字段、可选恰一个metadata字段，顺序任意；metadata JSON原始UTF-8≤4096 bytes，仅visibility?:space。未知字段、重复file/metadata、坏JSON、超过field/file/part限制、坏multipart尾部均拒绝。即使file已完成stage，也必须等全部part遍历完成并验证truncated/限制错误后才finalize。单file可用parser限制与FS精确count双重防护，不能将截断后的前25MiB视为成功。

父 Agent已决定MIME由core唯一规则规范化：允许剥离原part Content-Type参数，仅base trim+lowercase合法ASCII type/subtype token入库/hash/header；拒绝CR/LF及base非token字符，空缺application/octet-stream；route不另维护一份MIME业务校验。不以客户端filename或MIME执行文件。上传abort监听req.raw的aborted/流错误，不能把正常请求close当取消；每个全局/事件监听及lease在finally移除/释放。中断/尾部metadata失败只清本次stage/blob，没有ready/事件/幂等记录。route只解析multipart与映射传输错误，不复制权限/空间配额。

GET metadata使用JSON信封；GET content响应`Content-Disposition: attachment`、`X-Content-Type-Options: nosniff`、`Cache-Control: private, no-store`，仅认证相对URL，不返回任意外链或storage_key。所有GET拒绝未知query，遵循当前契约；body流不加载入内存。

## CLI配置与测试计划

仅serve增加可校验配置：单文件byte上限默认25MiB、空间配额默认1GiB、活跃upload默认4；attachment根由dataDir生成，不允许上传请求指定。父 Agent已批准单文件配置只可降低且不得超过25MiB，空间quota正整数≤Number.MAX_SAFE_INTEGER。选项已批准为--artifact-max-file-bytes/--artifact-max-space-bytes/--artifact-max-uploads，活跃数量可配1–64。启动信息记录实际限额、不含密钥。startup为lock→DB coordination→storage/FS初始化→仅启动cleanup→buildApp→listen。异常仍先close app/DB再release lock；shutdown先停止/等待活跃请求再关闭DB/释放锁。

真实FS测试：增量多chunk hash/count、零字节、25MiB边界/超限、mode0600、stream抛错/abort、重复publish无覆盖、stage/object/root symlink与穿越拒绝、唯一key无hash去重。port可用包装器在publish/open/delete注入错误；stage source自行抛错，DBtransaction注入失败由core测试/真实storage wrapper完成，无需庞大FS抽象。

HTTP集成：临时真实SQLite+FS；成功上传/下载/引用；任意field顺序；metadata尾部非法/未知/重复/超4096/多file、截断请求无ready；第五活跃上传拒绝与finally释放；DB失败及幂等重放不留本次额外blob；新请求撤权/redacted不可下载且metadata无key。

CLI重启：崩溃窗口构造未引用stage/blob和已记录blob；以真实持锁serve启动验证清孤儿、保留记录，锁失败/DBcoordination失败时不GC；buildApp构造绝不GC。需要监听或child process的测试按现有loopback授权方式执行；不调用模型、不修改全局宿主。

设计阶段结束：窄port/服务协调入口与契约 Agent已对齐；MIME/限额决定已同步。等待父 Agent批准接口、server lease落点、key列表方法及CLI option名称，不开始产品实现。
