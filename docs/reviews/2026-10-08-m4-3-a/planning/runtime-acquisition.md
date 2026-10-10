# 官方运行时获取与第一关事实

固定源码在 `/private/tmp/detuned-m43-runtime.MU1a4q`。匿名最小env/no-globalgit/no-helper/no-interactive，init→fetch --no-tags --depth=1 固定SHA→detach checkout，实际三步exit0；未submodule/安装/执行官方代码。HEAD `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，tree `a9d30743edbe97adac9c8cb0811b648a0d9f6660`；receipt在author/runtime，首次无失败（git缺DARWIN_USER_TEMP_DIR警告仅fallback /tmp）。

真实官方tests/apply.spec.ts:55–59 用 new Context→await ctx.plugin(SystemPrompt)→await ctx.plugin(ToolRuntime)；199–210证明MCP namespace plugin的fiber可await initial discovery，再await fiber.dispose。load-path.spec.ts用官方Loader.unwrapExports保namespace inject；scoped.spec.ts用带tools/systemPrompt inject的minter创建真实createScope。registry schemas/get/execute、scope.dispose与root ctx.fiber.dispose是实际入口，不须model prompt。

Cordis4.0.5-alpha.1、Tools/SystemPrompt/Scope/MCP各0.2.1-alpha.1，直接manifest MIT；MCP client2.0.0。源码src/*.ts，公开rootexports指lib/index.js/lib/types；隔离checkout没有已构建lib依据。ToolRuntime需systemPrompt、native可避免PTC；官方tests纯registry组合与rich-model/image组合须分开，不加载后者/agent-loop/provider。

根pnpm11.7.0/Node^22.19||>=24。根build:lib:host扩大到host tsc/tsdown/desktop；根test先build:native-system，因此不是本次最小入口。官方Vitest有tsconfigPaths与standardDecoratorPlugin（vitest.shared.ts，TypeScript.transpileModule处理标准decorator），源码实验不能忽略该转换。

父选择原workspace/原lock隔离安装，替代source alias猜依赖方案。根workspace有allowBuilds（包含esbuild/lefthook/native依赖），安装必须ignore-scripts覆盖，ignore-pnpmfile禁hooks；未见root .npmrc/.pnpmfile或workspace hooks/configDependencies声明。安装版pnpm --version实际11.7.0，help确认frozen-lockfile/ignore-scripts/ignore-pnpmfile/store-dir。此工具help不是dsh执行。

本阶段不静态证明全部传递包行为；完整原lock/源hash由receipt保护。具体2b脚本/限定runner、实际加载/cleanup与无模型承诺由父下一命令冻结，不能凭只读测试代码称实验已过。

## 2a实际停止结果

唯一原workspace安装由父批准的监督器执行；101.3s采样新增allocated 2489044992 bytes，超过2147483648预算，SIGTERM仅owned进程组47096。实际安装exit=-15，101.708s结束，stop_reason=size_budget；监督器exit0仅说明receipt写成，不是安装通过。最终source+deps allocated 2714583040 bytes含原checkout，精确环境/命令与数值在install-start/result.json。

产物保留在 `/private/tmp/detuned-m43-deps.avgrrqf7`（store/cache/config/data/corepack）与owned source/node_modules；进程组查询已不存在。原14208 tracked记录（含symlink文本，不follow目标）全未变，原lock SHA `2893d71a9ef07d2d72d47b2199e581b9e8d90638a15ee151908eebf69dfc637c`不变。C普通文件计数与含symlink记录口径须区分。

ignore-scripts/ignore-pnpmfile flags与隔离env实际传入；没有运行第三方官方源码、测试、CLI或lifecycle/build。安装已停止而非成功，根Vitest与MCP client package链接未完整，不能claimrunner可用。下载日志含公共依赖慢下载/单次网络retry，不另行重试或换版本。父决定下一步；本单元停止执行/写作。

## 父另准2a attempt2结果（首轮不覆盖）

同source/store原参数复用1376缓存，原lock解析跳过；实际 all342 workspace/+1393 packages，117.641s child exit0/stop_reason=null。finalallocated4557004800B，减原before195047424B累计新增4361957376B，小于父新6GiB总预算。PGID48331已无存在；attempt2全receipt另存。

14208含symlinktracked记录仍changed=[]、lock SHA不变。真实linked metadata：Vitest4.1.8/tsx4.22.4/TypeScript6.0.3/Vite8.0.16/MCP client2.0.0；root .bin vitest/tsx/tsc正规文件存在，仅读未执行。ignore-scripts/ignore-pnpmfile未解禁，不作native或模型执行。原workspace依赖安装完成不等于官方plugin链可运行；2b仍待父冻结命令与runner范围。
