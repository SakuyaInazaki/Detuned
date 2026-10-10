# 同SHA构建前置（只读，未执行）
固定5badb15009ae1756c3afe0ae0cef1faafc290ccc，仅读六源配置：root/package.json、MCP/package.json、root/tsdown.config.ts、vendor/loader/tsdown.config.ts、app-boot/tsdown.config.ts、tsconfig.host.json。
- root `build:lib:host` 会 tsc-b整个host→root tsdown→desktop bundle，超本次许可；root build/test/native继续禁止。
- MCP没有package build脚本；exports/main为lib/index.js，当前缺失；源码版本0.2.1-alpha.1。
- root tsdown workspace vendor/*+packages/*/*+apps/cli+desktop-host，默认entry lib/types/{index,startup}.js→lib，dts:false/clean:false。它先import typert/generator/lib/types/tsdown-plugin.js（当前也需生成）。
- Loader local tsdown以lib/types/index.js产lib/index.js；app-boot local config嵌入Include、保持Loader external，并产profile-resolution worker；不应手改官方exports或插件名绕过。
- root host references含Cordis/Loader/Include/Hmr/Tools/SystemPrompt/Scope/MCP/Typert，故全host tsc不是最小构建。
- 候选第一命令（待父定）：`node node_modules/typescript/bin/tsc -b vendor/loader packages/boot/hmr packages/core/tools packages/core/system-prompt packages/core/scope packages/mcp/mcp-client packages/boot/app-boot packages/typert/generator`；它会沿项目references生成依赖，准确闭包尚未核。
- 候选第二命令：本地tsdown原rootconfig/native加载/host face，`--filter`限定该构建闭包package names；安装type API确有filter，但CLI入口和参数语法尚未执行help确认，不能提前写成已可用命令。
- 产物验收：上述exports的regular lib/index.js存在，所有tracked/lock hash仍原样；最小same-built runtime图加载，不能混Vitest source singleton与native built图而未经验证。
- 最小待决三点：①准许只读refs/package metadata递归收闭包；②tsdown root Typert前置与过滤准确CLI；③墙钟/新增产物预算（候选≤3min/1GiB仅预算建议，非输出估计）。
本轮没有build/安装/第三方运行。原baseUrl/inject fixture失败和真实nativeimport诊断日志均保留；真实Hmr构造probe首过，不外推package样例加载已通。
