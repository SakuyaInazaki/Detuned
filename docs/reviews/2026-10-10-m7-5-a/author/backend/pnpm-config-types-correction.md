# M7.5-A pnpm 配置类型增量纠正

仅静态读取固定 `/opt/homebrew/lib/node_modules/pnpm/dist/pnpm.mjs`；源码 SHA256 `d3a7f4bde2f32c5acc5f012d1edc24c24ea247c2f6c8823146f8cd69ed70b22f`。没有执行 pnpm、安装、测试或修改 runner。原 `pnpm-command-options.md` 保留为被本报告纠正的历史建议。

## 已证机制

前报告称 `--config.*` 为 typed 是错误的。285293 分支用空类型表 nopt 解析 config-dot 参数，normalizeOptions2 仅剥前缀；145969–145981 将 CLI 值直接覆盖配置，146473 的 workspace 合并也保留该覆盖值。因此 `--config.network-concurrency=1` 得到字符串而不是数字，不能解决实际 PQueue 类型错误。

145997 的 isConfigFileKey 过滤作用于 **globalYamlConfig**。私有 XDG 全局 YAML 中 networkConcurrency/childConcurrency、enableGlobalVirtualStore/sideEffectsCache 及 storeDir/cacheDir/stateDir/virtualStoreDir 是允许的键，YAML 数值和布尔值可保留。excludedPnpmKeys 中 pm-on-fail、workspace-concurrency、ignore-pnpmfile 被全局 YAML 忽略。不能称这些全局 YAML 设置有效。该过滤不能泛化为项目 pnpm-workspace.yaml 禁令：146118 的项目加载另走 addSettingsFromWorkspaceManifestToConfig，源码 warning 明确建议把这些设置移到项目 YAML。本包无需改冻结项目配置。

## 最小建议（由 D 实现，root 决定运行）

私有全局 YAML 增加 `networkConcurrency: 1` 与 `childConcurrency: 1`；现有布尔 false 和私有目录键保留。所有命令用真实 GLOBAL 类型选项 `--pm-on-fail=error`，不用 config-dot 覆盖。rebuild 使用 `rebuild esbuild`，不传 install-only flags 或 workspace 并发参数；唯一 esbuild 已有授权不扩大。run build / exec vitest 传各自 cliOptionsTypes 支持的标准 `--workspace-concurrency=1`，Number 类型来自 types2；测试自身 worker/file 串行参数保持原批准值。目录设置来自 YAML，不需要共享 --store-dir（rebuild 支持，但 run/exec 不支持）。

ignore-pnpmfile 不声称在全局 YAML 生效。若后续 argv 不带它，hook 不执行的依据必须是精确 fixture/config allowlist 不存在 pnpmfile、globalPnpmfile、configDependencies 和私有环境，而不是忽略的 YAML 键。安装原已执行的 ignore-scripts/ignore-pnpmfile 历史 argv 不改写；后续仅明确授权 esbuild。

## 有界 effective-config probe

建议每个固定白名单 key 使用 `[fixed pnpm entry, '--pm-on-fail=error', 'config', '--location=project', 'get', '--json', key]`，相同 fixture cwd/private env/private YAML。cliOptionsTypes17 支持 location/json；GLOBAL_OPTIONS 支持 pm-on-fail。不使用 list 或空 key，不保存/公开全配置。顺序十 key 共用不超过 10 秒绝对 deadline，stdout 单值有界、在内存 JSON.parse 后仅汇总固定键与类型验证结果；undefined、非 JSON、错类型、非私有精确路径均失败。

十 key：networkConcurrency、childConcurrency 必须 number 1；enableGlobalVirtualStore、sideEffectsCache 必须 boolean false；pmOnFail 必须 string error；storeDir/cacheDir/stateDir/virtualStoreDir 必须对应已登记私有路径；globalconfig 必须对应私有 configDir 派生路径。workspaceConcurrency 不伪装成全局 YAML probe 结果，由 run/exec 的标准 Number CLI 绑定单并发。

303704 getConfig2 对所有命令调用同一 getConfig 并 applyDerivedConfig；304409 handler 收到 `_config: config2`。231130 configGet/231137 lookupConfig 对已显式设置已知键读 `_config`，231185 displayConfig 在 json 模式 JSON.stringify 保实际类型。globalconfig 是 231147 的特例，返回 getGlobalConfigPath(opts.configDir)，证明派生私有配置路径。handler18 的 location 只在读取配置完成后设 opts.global，get 分支不写配置。这个 probe 验证相同加载器的实际合并值；不能独立证明后来 argv 未变化，D 应绑定相同 YAML hash、cwd/env 和没有额外数值 config-dot override 的实际 argv。

安全限定：304251 即使 config get 也进入 installConfigDepsAndLoadHooks；303722 遇 configDependencies 可安装，ignorePnpmfile 未启用时可 requireHooks。因此 probe 只有在 exact allowlist 确认上述配置依赖与 hooks 均不存在时才是本包可接受的纯读取，不能仅凭 config 子命令名称保证。stderr 仅固定失败分类，不输出原配置/凭据/路径错误文本。
