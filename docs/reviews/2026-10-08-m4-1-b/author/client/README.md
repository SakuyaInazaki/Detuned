# A client 交付：M4.1-B 附件

父冻结API已实现：uploadArtifact/getArtifact/downloadArtifact，ArtifactDownload由client.ts及基础index wildcard公开。没有Node导入到基础client，没有server/HTTP/schemaSQL变化。所有权额外批准protocol/artifacts.ts两typeguards和protocol/package.json、pnpm-lock.yaml精确依赖例外。

上传≤25MiB Blob不可变slice，读取实际bytes经WebCrypto SHA；每attempt重建FormData/fixed upload.bin，复用同一request envelope/错误/RetryAfter/重试循环，旧JSON默认路径原样。key准备窄提取，旧非持久write保持直接request路径；持久准备后额外检查caller token/signal，artifact.create(space必填,target=null)新增白名单，其余tuple/store格式不变。服务器actual内容摘要仍唯一幂等裁决。成功metadata验证space/bytes/hash。

下载getArtifact起总clientdeadline（默认30s），固定content路径/redirect:error，不fetch content_url，不重试部分内容；25MiB精确分配，headers/EOF/length/SHA核对后只返回完整bytes。新artifact JSON response以显式reader读取、1MiB本地cap、fatalUTF8/完整EOF/JSON；capture已到但未领reader response以及late response，finally cancel/release，所有late promise有拒绝观察。旧普通JSON/10write没有新reader/cap。错误仍现公开classes与HTTP映射，cap/完整性固定安全ClientProtocolError，507完整业务响应false不retry。

## 日期/依赖事实与修复

TypeBox Value.Check的date-time必须注册FormatRegistry，原仓库无定义，直接新typeguard会拒所有合法metadata。首日志保留。父拒草拟自写RFC3339；正式方案复用**已锁定/安装ajv-formats3.0.1、MIT License（Evgeny Poberezkin）**公开default.get('date-time','full')验证器。NodeNext/CJS default adapter通过公开default自引用；获取结果unknown后运行时窄验证，不无视类型。schema对象不改，只helper内部created_at普通String形状复用其余全部schema，再检查该唯一format。不全局注册、不收窄为ISO、不改变export日期策略。

依赖操作只有父批准offline/ignore-scripts、protocol直接依赖3.0.1。第一unexpected-store退出1，第二显式existingstore在sandbox SQLite缓存权限失败退出1，第三require_escalated同命令退出0/downloaded0。仅package manifest新增ajv-formats3.0.1及lock protocol importer3行；没有全局config/联网/版本升级/整体重装。三份原日志均保留。

## 实际检查序列（不把首失败重写为首绿）

- source-first：原6case全部失败：1 loopback EPERM是环境；其余先被date-time无registry拒绝，2barrier继发timeout/unhandled；没有跑到目标取消断言。
- source-second：outside loopback，草拟局部自写date修法6/6；父未接受此日期规则，**不作为最终正式通过**。草拟函数已删除。
- source-final：正式ajv方案/新JSONreader，共8case，7通过1失败；新增真实Response pull可在reader之前发生，abort窗口body未cancel。
- source-cancel-format-fix：窄捕获artifactResponse+finally cancel，日期与新JSON取消两case2通过/6未跑。
- source-final-delta：公开validator unknown安全类型窄化、cap错误不降级HTTP507后，两case2通过/6未跑（含507过大JSON localProtocol断言）。
- source-download-cleanup：相同已settle未领reader窗口同步用于binarycontent capture，晚到/reader取消两case2通过/6未跑。没有再跑整8以制造“首全绿”。唯一8case在当前C门禁执行。
- source-noemit：首失败publicCJS import.get类型；second失败Format公共union未窄化；third0；final0（新cap mapping/test）；freeze0（最终binary response capture）。配置含protocol/client/newtest及其sourcealias依赖。错误日志全保留；多次均因实际代码/类型修复必要，不是重复无变化门禁。

8case文件为tests/integration/m4-artifact-client.test.ts：真实HTTP binary/zero/replay409/MIME409+download；persistent actor/space/key/token/cancel；fresh FormData重试/507；schema/header/EOF/hash拒；metadata起deadline与reader取消；late response/uploadaborttimeout；RFC3339偏移/大小写/闰秒/0096与坏日期/字段；真实JSONpending/cap/507 cap。

A未build/fullsuite/current29；C最终built与统一门禁待执行。B只读互审无finding，见cli-cross-review.md。有限缓存不是端到端流、零拷贝或硬RSS，metadata/content非原子快照；WebCrypto/native同步工作不声称硬抢占，fetch/sink相关Promise取消有观察/清理。
