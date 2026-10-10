# B：附件 CLI 与本地有界文件 IO

源码六文件冻结，正式4项：源2通过、built2等待C统一构建。未自build/fullsuite。唯一source定向source-first.log exit0；第一次noEmit（包含本新test与CLI/client/server/protocol源）exit2，仅新测试fixture误写AppOptions.blobStore，实际artifactBlobs；保原日志，窄修test配置后必要第二次exit0。源码测试未运行built fixture，不能称built两项通过。

所有权：packages/cli/src/index.ts、新artifact-io.ts、新tests/contracts/m4-artifact-cli.test.ts、新examples/artifacts-cli.md、docs04当前契约追加、docs12 ADR045。未改六当前入口、包README、A client/protocol/core/server、SQL/schema、依赖或旧证据。C做统一built/门禁。

输入O_NOFOLLOW|O_NONBLOCK→同FD fstat regular→固定最多25MiB+1读取，0允许，FD finallyclose；明显stat变化拒。先有限内存Blob，再网络；不是并发修改原子snapshot或无缓存。显式empty/nonASCII/control MIME安全exit2，普通ASCII沿Blob小写/服务规则。getWriteContext(options,{})复用key互斥/成对/actor准备；无input.request_key或新凭据flag。上传/元数据输出data，下载仅artifact_id/sha256/bytes/mime，不打印二进制或本地绝对路径。

publisher默认真实open/writeFile/sync/close→link无覆盖→父目录sync，只清own temp。父授权唯一内部trusted syncParent seam，CLI/env/HTTP不能传替代实现，无全局FS spy。源AB B02真实写/fsync/link后注入最后sync拒绝，准确失败且完整final bytes/0600保留、own temp0；实际同目标竞争一winner，现有file/link/dir保持。此seam只验证应用发布边界，不代表真实磁盘断电/耐久性认证。原export逻辑未抽取或修改。

源AB B01同FD零/Unicode/25MiB合法、25MiB+1 sparse/dir/link/MIME拒绝；no-writer FIFO真实独立strip-types child2秒watchdog及时exit2，无client调用。builtAB B04将同一边界放到真实CLI+HTTPcounter，另key冲突/单flag/MIME本地0请求、已有输出/401出口。builtAB B03真实upload/replay/metadata/download/binary/empty与跨新CLI进程持久key；token与成功metadata仅内存、不归档，children UTF8/10秒门禁、cases90秒。C覆盖其余权限/篡改hash/截断/取消/超时等独验。

信号handlers仅包裹该命令，取消sharedclient并finally移除；发布前cancel不link，发布后失败保完整final。HTTP完整性、总timeout、禁止抓content_url与body重试规则归A sharedclient，不在CLI复制业务。stdin任意上传/MCP本机路径/四宿主/模型/发布不在本包。

父授权文档补项：新artifact upload/getMetadata JSON reader 1MiB cap/完整EOF/取消release与迟到清理，日期复用已锁定ajv-formats3.0.1新增protocol直接依赖，无新版本/网络，原schema/FormatRegistry与旧JSON方法不改。只刷新guide/docs04/ADR045三doc hash，B产品/tests不变；上文“B未改依赖”仅自身ownership，不表示整个包无直接依赖变化。未对A写态追加检查。

C首统一17项16通过：B04前置共享client upload未提供HTTP必需Idempotency-Key，服务正确拒绝，未到后续CLI/文件/权限断言。父批准只补metadata{}与固定测试key b04-fixture-artifact；其余断言保持，testhash唯一更新。首 verification/observed-new-targeted-2026-10-08.*保留，不是产品bug或API缺失，不重build/自跑；C必要定向B04。
