# M4.1-B 附件共用client/CLI：只读事实

本页是候选取舍，未冻结实现；M4.1-A产品保持冻结。未运行上传/下载、测试、宿主或模型，未读用户文件/凭据。仅查询本地版本：Node v26.3.0，内置Undici 8.3.0。

## 现有HTTP与业务事实

- `packages/server/src/routes/artifacts.ts:16–88`：POST `/api/v1/spaces/:space_id/artifacts` 必须 multipart/form-data，一个 `file` 文件、最多一个 `metadata` 字段（4096 UTF8字节JSON，默认{}）；允许先后两种次序，完整消费尾部parts后才交core。metadata单源 `protocol/src/artifacts.ts:37` 仅可选visibility='space'，额外键拒绝。文件MIME取part.mimetype再由core规范化；filename不成为登记名称。认证沿Bearer，必须Idempotency-Key；成功201标准envelope。
- 公开ArtifactMetadata包含id/space_id/owner_id/visibility/sha256/bytes/mime/state/created_at/content_url，没有storage_key/私有绑定（`artifacts.ts:39–44,60`）。默认file25MiB、space1GiB；上传并发4，实例全状态登记4GiB/10000对象，写入还受actor60/min burst20。file超限413；现space/并发429保持；新实例quota/nativeFULL507且retryable=false，不能一律改成507。
- `core/services/artifact-service.ts:61–78` 实际幂等payload为 `{sha256,bytes,mime,visibility:'space'}`，operation='artifact.create'；sha256来自服务器stage实际文件内容，非multipart边界/文件名/路径。完整payload摘要由现IdempotencyService统一计算。发布文件后短事务重新鉴权，replay、meter、quota、artifact/event/idem同业务路径；重复或失败清理自己的文件。不要在CLI重做权限/配额。
- GET metadata与content均先core authorizeRead；missing/redacted/无权限由既有业务拒绝。content路径固定space/artifact定位，不能拿返回或用户任意URL抓网。`routes/artifacts.ts:140–143` 仅提供Content-Type、Content-Length、attachment filename（artifact ID安全字符）、nosniff、private/no-store；**没有hash/digest/ETag头**。sha256须从受保护metadata获取。完整下载需精确bytes计数、EOF与摘要核对；单凭fetch返回headers/HTTP200不能证明完整。
- 下载lease覆盖await open及真正stream close；late cancel须dispose刚返回的handle。BlobReadHandle显式dispose幂等并等FD实际close，不依赖未首次next的generator.return；客户端也需取消reader并观察晚到错误、处理sink拒绝与等待pending打开资源。元数据与bytes之间非原子快照，不能假称原子性。

## client与CLI可复用边界

`client/src/client.ts:204` request固定JSON.stringify body和application/json，标准JSON envelope验证、30s timeout、maxRetries3/maxRetryAfter120s；不能直接塞FormData/已消费stream。每attempt signal/timeout监听清理、退避取消和既有HTTP错误映射可复用思想；完整507false不重试，transport失败可能原bounded retry。流必须有独立body factory/资源清理，不能盲复用JSON重试循环。

`client.ts:517` private write的persistent key准备可复用身份隔离原理：服务namespace+当前getMe actor+space+operation/target+显式logicalOperationId；显式key冲突拒绝，await后验token未变，store等待可取消且无POST，不存token/正文。当前无artifact wrapper，精确scope与复用helper拆分须父冻结；file hash属于业务摘要，不能据其猜同一logical operation。重试沿同一key，但源变化必须拒绝/由服务409，不能悄悄另造key。

基础client目前isomorphic（client/export-stream/request-key无node导入），可选`@detuned/client/node`目前只FileRequestKeyStore。`export-stream.ts`现有专用流请求展示背压、signal、总deadline、sink await、完整EOF和finally reader释放；不会自动重试半流。它的NDJSON decoder不是二进制附件完整性协议，不能直接复用格式。

`cli/src/index.ts:131–155` exportToFile是可窄提取的私有发布模式：realparent+basename，随机同目录O_EXCL/O_NOFOLLOW 0600临时文件，写完验证后fsync/close，**link不覆盖最终名**，parent fsync，失败仅清本调用temp；发布后持久性失败保留完整output且不报成功。前置lstat不是竞态安全发布依据。此helper尚非通用导出；下载应只在hash/bytes/EOF成功后发布，不能覆盖已有路径或stdout混入二进制。目录维护publication不应为单文件下载引入整套实例marker。

## 两个最小候选（由父选择）

1. **Blob/FormData路线**：基础client接受不可变Blob/File（或每attempt新建Blob的factory），每次重建FormData，fetch自动boundary；Node可选helper负责正规文件/安全打开与有界私有快照，CLI复用文件发布模式。25MiB cap允许有界缓冲方案，但实际内存/快照清理须明确；Node openAsBlob按路径创建、检测修改不等于O_NOFOLLOW同FD保证，不能未经核验冒充安全文件入口。
2. **可重开流factory路线**：每attempt取得新的chunks与显式dispose，独立multipart encoder、取消与释放；Node helper重新打开已验证源或私有不可变快照，基础入口保Web类型。每次失败必须dispose，late open也要释放，不重用消耗过的stream。需要更多边界/长度/浏览器兼容测试；Undici async iterable是扩展，不能默认作为浏览器通用BodyInit。下载独立sink按chunk背压、hash/计数完成后返回结果，半流不得自动append/冒成功；是否自动重试整次私有temp须另冻。

## 官方依据与待冻事项

[Node fetch说明](https://nodejs.org/api/globals.html#fetch) 确认内置fetch基于Undici；[Undici官方源码README](https://github.com/nodejs/undici#undicifetchinput-init-promise)说明ReadableStream/AsyncIterable body要求duplex='half'，FormData可用Blob，response.body为Web stream。[Node fs.openAsBlob](https://nodejs.org/api/fs.html#fsopenasblobpath-options)说明创建后文件修改会令读取失败，创建及每次读取前执行同步stat。在线Node页面当前v26.11.1/Undici主分支，**不是本地v26.3.0/8.3.0特定实验结果**；下包若选相关行为，应核对应版本与有限真实fixture，不安装。

父需冻结：上传source形状/不可变保证和retry边界；key选项与身份切换边界；下载metadata与header比对/hash算法实现及取消/sink完整性；默认timeout/最大值；CLI语法/MIME/新文件发布摘要与错误映射。最小owner候选：A client transport及可选node文件source/helper，B CLI/guide，C真实multipart与断流/取消/重试独验；若需server新digest头则是额外契约变更，当前尚未批准。
