# M7.5-A 正常本地后端测试环境有限审查

同意既定验证方式：固定 158-file 可信后端 suite 在正常获批本地环境运行，不再追加 sandbox-exec；保固定已校验 Node22、私有父环境/配置/cache/store/TMPDIR、冻结源码、worker1/文件串行、原 assertion/timeout、900 秒测试预算、fixture 两种 2GiB cap 与自有 stage 实际 close 证据。此前受沙盒 install 的成功事实不改变；这不是一次从头 pipeline 成功，也不声称硬文件系统或网络防火墙。

沿所选 158 入口核敏感配置/SDK/helper，实际 Pi 路径只有 m4-pi-native-lifecycle 与 m7-pi-native-checks-independent。env -i 确实丢弃 HOME/TMPDIR，因此不能仅靠父私有 HOME 宣称这些 helper 被环境隔离。但实际 helper 明确使用自己 mkdtemp 的 auth.json/empty-auth.json、ModelRuntime.create(modelsPath:null,allowModelNetwork:false,refreshOnCreate:false)、SettingsManager.inMemory、空资源 loader、显式 agentDir/cwd 与私有 sessions。固定 0.87.1 SDK model-runtime.js:75–100 将 null modelsPath 走无文件配置/内存 store，并且不刷新网络；sdk.js:69–78 仅在调用方缺这些实例时才走全局 defaults/默认资源加载。当前两 helper 传入实例，不调用 prompt/模型推理；HTTP listener 是 127.0.0.1。SDK config.js 的 homedir/.pi 默认函数确实存在，不能泛称 SDK 本身永不访问全局，但这里没有走该加载路径。

Pi 六历史 env-i helper 的 os.tmpdir() 可能是系统默认临时目录，而非父 fixture/tmp；它们新建 detuned-pi-native-*，finally 依次 dispose/app.close/db.close/rm。PII01 私有目录由父新建，finally 等待 child 关闭再 rm；PII02 同组 child finally 关闭并移除目录。checks 分支使用父提供的 0700 空目录并聚合清退。故 2GiB cap 仅约束精确 fixture 根，不能宣称包含所有 env-i helper 的默认临时目录；SIGKILL/内部硬 deadline 可能跳过 helper finally，失败必须保存精确前缀与收据再决定清退，不当作全 inner census。无需修改冻结测试来改变这既有语义。

检查到非 loopback 示例 URL 的相关 client 契约使用 mock fetch/client；未发现此次固定入口真实外部模型/全局 Agent 配置加载的具体行为。此为定向静态边界核查，非全部 SDK 依赖的通用审计。已有追加沙盒 query EPERM 证据解释为什么不能把正常 spawn/ps 断言改弱以迁就自加策略。

Root 已读取 exact-launcher-ready-identity-lookup.json，接受三个旧 launcher 精确身份 negative（正控 READY 命中后 close/post-negative）。该有限证据不升级全机 census；此前 raw 失败/静审错误/未认证的 teardown 保持。

未运行测试、模型、Node 或进程查询；由 root 最终选择并授权唯一 runtime。
