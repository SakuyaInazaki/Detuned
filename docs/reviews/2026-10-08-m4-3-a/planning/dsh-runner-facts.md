# 固定 dsh 官方 runner 接点（只读）

- 来源同 HEAD `5badb15009ae1756c3afe0ae0cef1faafc290ccc` 的 A owned checkout；本次只读 root package.json、vitest.config.ts、MCP tests/apply.spec.ts、core/scope/tests/scope.spec.ts 四文件，无安装/导入/运行。
- root package.json 指定 pnpm11.7.0、Vitest `^4.1.8`、Vite8.0.16、TypeScript `^6.0.3`；这是声明范围，安装锁定实际 Vitest patch 由 A install receipt 核，不冒称已装。
- root `test` 先执行 `build:native-system` 再 vitest run；不宜用于当前最小组合。postinstall 安装 lefthook，父批准 ignore scripts/hook 必须保持。
- 官方配置 vitest.config.ts:18–20 使用 vite-tsconfig-paths 的 projects:['./tsconfig.base.json']，让 source paths 优先于 lib exports，避免双 singleton。
- config:6、174、185、205 使用 standardDecoratorPlugin() 与 vitestExecArgv（来自 vitest.shared.ts），不能用默认 esbuild/Node strip-types 假定标准 decorators 能解析。
- config:177、195、212 载 test-proxy-environment/test-dom-environment；config:114 在读取配置时主动 spawn PowerShell probe。因此不直接加载整个 root config 当无副作用最小 runner。
- 四文件范围内未读 shared decorator helper/两个 setup 内容，不能确认这些模块完整副作用，更不能宣称 root runner 零 profile/模型访问。
- 可裁候选：owned 新私有 Vitest config，只 include 新私有 test，复用必要 source alias 与经核 decorator transformer；去掉官方全套 projects/setup/coverage/PowerShell probe，不调用 root test 脚本。准确 transformer 需父准追加 shared.ts 的只读核查。

## 真实 registry 与 scope 用法

- apply.spec.ts:58–64：`const ctx=new Context(); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime);`；这是正式工具 registry，并非 fake registry。
- 该 apply 文件:16–49 mock 了 MCP Client/stdio transport，**不能直接复用其 server fixture称真实 MCP验收**；仅复用 Context/插件生命周期形状。
- apply:229–240：`const fiber=ctx.plugin({name,inject,apply},config)`；保存/观察 `Promise.resolve(fiber)`，startup pending 时 `await fiber.dispose()` 并 await activation，finally 释放 ctx.fiber。
- apply:245–251：`createScope(ctx,{})` 创建独立 scopes，`apply(scope.ctx,config)`；两 scope 可同 serverName，各自 dispose。但手调 apply 不等于真实 loader，下一新例应 await scope.ctx.plugin 官方 namespace 模块。
- scope.spec.ts:17–21 官方 mintScope 通过 `await ctx.plugin(inner=>{scope=createScope(inner,key)})`；:48–66 证明 dispose 等异步 effect 结束、重复/rawDispose 共用 quiescence。
- 最小顺序候选：Context → await SystemPrompt → await ToolRuntime（native 配置字段由 A source 核）→ createScope → await scope.ctx.plugin(官方MCP namespace模块,真实stdio Config) → registry schemas/get → registry execute → await scope.dispose/ctx.fiber.dispose。
- 四文件 apply 未提供 registry.execute 的完整入参例；沿上包已核 ToolExecutionInput `{callId,name,arguments,signal,agent?}`，准确 native constructor/execute/source alias 接线由 A 负责，不补猜 exec 字段或模型。
- 结论：可构造仅新私有 test 的编译器/解析入口候选，不能从官方 mock tests 推断真实桥已可用；decorator helper 未读是当前具体前置缺口。

## 获准 shared.ts 补查（未执行）
- 额外只读固定 checkout 的 vitest.shared.ts 全文（44行）；仅导入第三方 `typescript`，无直接本地 helper，不继续展开依赖图。
- `standardDecoratorPlugin()` 无参数；返回 name:dsh-standard-decorators、enforce:pre、transform(code,id)。只处理 .ts/.mts/.cts/.tsx 等且行首匹配装饰器的源文件，先去 id query。
- transform 调用 ts.transpileModule，target ES2024/module ESNext、tsx ReactJSX、sourceMap:true；不是 legacy experimentalDecorators。仅给 __esDecorate 加 coverage 注释并剥离尾 sourceMappingURL，同时返回 sourceMapText。
- import-time 自身仅创建正则及检查 process.allowedNodeEnvironmentFlags.has('--webstorage')；没有子进程、文件读取、profile/模型调用。TypeScript包自身导入副作用未由本次全图证明。
- `vitestExecArgv` 是支持 --webstorage 时的 ['--no-webstorage']，否则 []；无 tsx/loader/import flags，只让测试 worker 的 Web Storage 不遮蔽 jsdom，不是任意官方 subprocess 的通用TS loader。
- 最小私有config候选：`import {standardDecoratorPlugin,vitestExecArgv} from './vitest.shared.ts'`（config若不在root则按真实相对位置）；plugins:[tsconfigPaths({projects:[固定checkout/tsconfig.base.json]}),standardDecoratorPlugin()]，test仅include新私有test、pool:'forks'、execArgv:vitestExecArgv，无rootsetup/projects/pwsh。
- 此补查关闭“decorator helper未知”前置缺口；配置是否被Vite8/Vitest实际接受与真实stdio child源码如何加载仍是父选有限实验要验证的事项，未运行或保证通过。
