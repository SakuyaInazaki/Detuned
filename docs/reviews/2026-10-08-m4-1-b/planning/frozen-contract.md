# M4.1-B 冻结：附件共用客户端与CLI

父冻结，C fresh READY（4599旧reviews/232source/46docs）后开工。A仅client.ts/request-key.ts/新artifact-transfer.ts/index、新m4-artifact-client.test.ts与本包author/client；B CLI，C统一built/门禁。无schema/server/core/依赖/旧证据变动。

uploadArtifact(spaceId,file:Blob,metadata:CreateArtifactMetadata={},requestKey?,opts?:WriteOptions)返回ArtifactMetadata；getArtifact(spaceId,artifactId,{signal}?)返回ArtifactMetadata；downloadArtifact同参数返回ArtifactDownload{metadata,bytes:Uint8Array}。保isomorphic，复用既有Runtime schema/错误类。上传抓取不可变Blob快照≤25MiB（零允许），upload.bin、空type=octet-stream，每attempt新FormData，复用现HTTP重试规则，同Blob同key。actual SHA核成功response space/bytes/hash。持久store不改格式，仅artifact.create/space必填/target=null，复用当前身份与token切换/取消检查；hash绝不logicalId。

下载metadata前开始clienttimeout总预算（默认30s），覆盖metadata重试/content/body/hash；只构造同base固定路径，不抓content_url，redirect:error。内容不重试半流；schema/id/space/sha/bytes≤25MiB、Content-Length精确、Content-Type trim/lowercase规范一致，按expected分配并逐chunk拒extra，EOF精确长度+SHA验证才返回。reader及late response清理、观察晚到拒绝；不返回partial。不承诺原子元数据与bytes/端到端流/零拷贝/硬RSS。

沿现ClientProtocolError/TimeoutError/UserAbortError/ClientTransportError/HTTP DetunedError，不增公共code。A source专项+noEmit，C唯一build/fullsuite；冻结后停写。

## 父精确补充

protocol直接依赖例外仅复用已锁定/安装ajv-formats3.0.1（MIT）公开get('date-time','full') validator。既有ArtifactMetadataSchema不改；helper派生仅created_at去format的String形状交Value.Check后用该单一标准validator，绝不注册全局FormatRegistry，不自写RFC3339，不改变export日期策略。protocol package.json/pnpm-lock在A额外owner，offline/ignore-scripts，仅本命令existing store路径，无联网下载升级。

新artifact upload/get JSON读取用显式reader finally cancel/release，固定本地1MiB UTF8响应上限（metadata/error均适用），完整EOF/fatalUTF8/JSON后共用原envelope/error/retry框架；不改变旧普通JSON/10write语义。超cap为安全ClientProtocolError，不当HTTP业务错。
