# M2.1 Unit B：FS、HTTP与CLI生命周期交付

日期2026-10-03。按父 Agent批准架构与唯一port实现；本单元产品/测试/示例已停写，等待独立验收。未宣称M2.1整体或M2完成。

## 文件与行为

修改 `packages/server/src/{artifact-files.ts,routes/artifacts.ts,app.ts,index.ts,routes/meta.ts}`、`packages/cli/src/index.ts`；新增 `tests/integration/m2-artifacts-{filesystem,http,cli}.test.ts` 与 [HTTP使用示例](../../../../../examples/artifacts-http.md)。meta.ts与示例属于父 Agent追加授权。before.json记录初始既有文件hash/新增路径null，meta初始hash来自R23最终stable-after原始快照；after.json记录10项最终源码/测试/示例hash。没有改core/storage/protocol、旧review/observed/probe、冻结SQL/archive、状态入口或依赖锁。

FS实现 `ArtifactFileStore` 注入已批准BlobStorePort：服务生成staging/objects根，检查canonical目录/静态symlink，内部key只接受单段安全字符；用户filename不参与路径。stage逐chunk计数/SHA256，0600且O_EXCL/O_NOFOLLOW，不缓存整个file。source错误/上限/取消均关闭FD并删除stage；等待中的iterator支持signal取消，迭代器清理失败不阻止本地FD清理。publish先fsync文件，再hardlink无覆盖发布，sync objects目录后删除stage；EEXIST绝不删旧对象，link成功后后续异常只清本次目标。文件系统与DB不是原子事务，崩溃孤儿留持锁启动窗口清理。

HTTP稳定注册三端点，无blob配置使用现有TEMPORARILY_UNAVAILABLE500明确后端未配置，无文件/DB副作用。multipart恰一个file、可选一个metadata≤4096原始字段bytes，顺序任意；未知/重复字段、坏JSON/尾部/截断/超限拒绝。原part MIME交core唯一规范化，允许剥离参数。所有part遍历结束才交core create接管stage；route只解析传输，权限/空间配额/幂等/引用由core。最多4活跃upload（可配1–64）的server传输lease持续到create与清理finally，超限QUOTA_EXCEEDED，不做后台调度。

下载使用已鉴权流，attachment安全artifactID名、nosniff、private/no-store；metadata不含storage_key，认证content_url为相对URL。新请求重新鉴权，redacted在ACL后410，missing物理文件404且GET不改DBstate；进行中的已授权流不承诺瞬时撤回。capabilities既有modules_enabled仅真实blob配置添加artifacts，实际max_artifact_bytes对应file配置；无backend不添加module且保留25MiB规划上限。

CLI serve增加已批准三个配置项，file正安全整数≤25MiB、space正安全整数≤MAX_SAFE、不强制file≤space、uploads整数1–64。真实CLI始终配置FS；顺序为取得DirectoryLock→打开/协调DB→读取全部artifact key→FS初始化/仅startup cleanup→buildApp/listen。buildApp不GC，运行中没有全目录GC；启动日志记录实际限额，无密钥。关闭先app再DB再锁。没有专用upload命令或全局宿主配置。

## 验证证据

- `pnpm exec vitest run tests/integration/m2-artifacts-filesystem.test.ts tests/integration/m2-artifacts-http.test.ts` 首轮13/13通过，日志source-tests-first.*。
- core Agent确认停写后协调 `pnpm --filter @detuned/cli... build`，首次与最终两次均exit0（build-first.* / build-final.*）；此为CLI必要依赖构建，未运行full suite。
- 最终三文件专项 `pnpm exec vitest run tests/integration/m2-artifacts-filesystem.test.ts tests/integration/m2-artifacts-http.test.ts tests/integration/m2-artifacts-cli.test.ts` **17/17通过**：FS6、HTTP7、CLI4；首次与最终日志target-tests-first.* / target-tests-final.*，stderr为空。真实loopback监听经已授权require_escalated运行，非公网发布。
- 覆盖：多chunk hash/count、零字节、25MiB精确边界/超限、0600、生产者断线/中断与iterator归零、EEXIST旧对象保护、stage/object/root symlink及穿越拒绝；尾部metadata坏/未知/重复/超限/缺file/截断无ready，configured file边界；DB事务失败清blob，同key仅1记录/收费/blob/事件；missing/redacted/撤权；四上传占满、第五拒绝、真实连接destroy后释放；buildApp无GC；CLI持锁协调后恢复、锁/DB失败不GC、配置信息与非法配置拒绝。
- 所有10项文件末尾空白检查、git diff --check通过。正常构建更新既有dist，测试更新既有缓存，均保留。

## 限制与交接

未运行全量正式suite、29历史命令、独立验收、Node22、干净安装、远程CI、四真实宿主或模型；由父 Agent与独立验证确认包门禁。没有执行帖子/附件、抓任意外链、模型调用、子Agent调度、commit/push/deploy。文件目录由服务独占控制，防静态symlink/输入穿越，不声称对抗有OS权限管理员的并发父目录替换。

core/DB事务和blob之间存在已明确崩溃窗口；本次失败清理若遇持续FS故障，由下一次持锁startup恢复。当前仅space可见附件，不提前实现评审私有附件、专用CLI上传或更远M2能力。
