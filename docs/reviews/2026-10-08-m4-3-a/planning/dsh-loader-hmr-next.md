# M4.3-B Loader/patch/HMR 只读前置

固定官方 SHA `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，本地 `/private/tmp/detuned-m43-runtime.MU1a4q`。本轮只读八个固定源/测试文件，未安装、执行或改变当前四文件冻结。复用上一包 dsh-loader-facts；现A作者只证明scope dispose，不是HMR。

## 已核入口（下列路径均在固定官方checkout）

1. `vendor/loader/src/index.ts:80–188,210`：真实 `Loader` service，`ctx.plugin(Loader,{baseUrl})`；`builtins`可供`cordis:`解析；`unwrapExports`保namespace inject。构造读取 `CORDIS_SHARED`（须最小env不提供）；不自行读profile。
2. `vendor/loader/README.md:10–50`：公开 `loader.create/update/remove/resolve/await`；`update`是明确程序化更新，不能冒称文件HMR。
3. `vendor/loader/src/config/tree.ts:42–52,92–137`：`await()`等import/fiber inertia；`create`/`update`/`remove`操作真实entry tree。`import`用Node internal loader（可用时）或动态import，`cordis:`取builtins。
4. `vendor/include/src/index.ts:22–123,150–178,215–247`：公开`entryListSchema`、`applyEntryPatches`、`Include`；读取真实JSON/YAML数组，应用整份patch并启动tree。insert可无id向root或指定group追加；id补丁missing仅warning。Include配置更新会真实更新children；不会自动watch文件。
5. `packages/boot/app-boot/src/index.ts:316–389,539–584,973–1012`：公开`loadOverlayPatches(binName,file)`/`loadOptionalPatches`走官方YAML patch parser及相对module anchoring；`mountRootInclude`/`reconcileProfilePatches`是真官方组合。`boot`创建Context+Loader+prepare+Include，不是CLI，但会提供dshHomePath；不选它就不要说已验完整app boot。
6. `packages/boot/hmr/src/index.ts:258–354,374–389,661–728`：公开 `Hmr.runExclusive`与`watchConfig(filename,refresh)`；构造**要求真实loader.internal**，否则抛`--expose-internals is required`。真实Chokidar模块watch→串行reload；配置watch刷新可不用profileContext，默认readiness已就绪。提供profileContext则必须appReady并启动profile/home/manifest三类监听，不适合本包绕入真实用户profile。
7. `packages/boot/hmr/src/watch-config.ts:36–103`：真实Chokidar exact-path watch，await ready、add/change/unlink调refresh、默认awaitWriteFinish；返回disposer等watcher.close及正在refresh。该公共函数可在无profile下挂临时patch文件，但它单独不等于整个Hmr模块替换服务。
8. `packages/boot/hmr/tests/profile.spec.ts:18–62,65–103,153–165`：官方boot+Timer+Hmr fixture；**mock Chokidar并手emit事件**，只能复用构造/ready/queue形状，不能拿它作为真实filesystem HMR证据。

## 最小可审阅候选（父下轮裁定）

- 已安装同lock依赖。新增独立实验spec/config即可；原decorator/source-alias runner已通。真实Context+SystemPrompt+nativeToolRuntime+scope下安装Loader；固定builtins或明确fileURL解析官方MCP namespace，不能把临时仿插件替代MCP。
- 先走官方`loadOverlayPatches`解析完整临时patch，再由真实Include tree应用。若避免整个boot，可直接真实Loader+Include（`path`临时base config、`patches`官方解析结果）；不用真实profile、home env、provider/agent-loop。scope服务链需保tools/systemPrompt/loader inject，不凭静态阅读称已通。
- 配置文件真实watch方案：官方`watchConfig(ctx,absolutePatch,options,refresh)` + 官方parser + Include entry.update + `loader.await()`；读写临时文件、等真实watch-ready与entry/generation信号、验证旧桥退出/新桥PID与工具重新注册。该组合应准确称**官方patch文件watch驱动Loader配置重载**，不是完整CLI profile/HMR模块代码替换。
- 若要求真正 `Hmr` service：独立runner增加`--expose-internals`，先核安装Node26能建立`loader.internal`及官方ModuleLoader与Vitest模块体系互通；无需新native构建，但此项尚未实跑。失败时不要伪造internal；父可先选官方exact-path watcher+Loader配置重载边界。
- 手动`loader.update`/`reconcileProfilePatches`可先证解析/重装，但必须另做真实FS写触发；不能手emit Chokidar后称filesystem已验。完整CLI加载、profile自动合成、模块代码HMR与模型认证均另列未验证。
- 候选命令沿现显式source/repo launcher独立config（仅下一spec include），单次≤3min、只临时config/loopback，owned bridge PID/退出记录与 finally scope/root/watcher关闭；无网络安装或用户配置。文件owner预计独立launcher/config/spec最多3–4文件及receipt，现A freeze不改。

## 当前八工具名称证据边界

最终作者日志没有逐个name打印；断言只记录长度8和统一`mcp__detuned__`前缀，不能事后说已捕获完整name清单。仓库protocol单源`DETUNED_TOOLS`（`packages/protocol/src/tools.ts:259–305`）静态八名：forum_context、forum_search、forum_read、forum_publish、forum_relate、forum_subscribe、forum_poll、forum_ack。固定官方namespace规则对应`mcp__detuned__<原名>`；其中context/publish/poll在作者真实registry execute路径成功。完整集合逐名运行receipt由C独验或后包追加真实断言给出，本页不补造stdout。
