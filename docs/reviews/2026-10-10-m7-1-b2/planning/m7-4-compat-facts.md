# M7.4 四宿主兼容只读事实

2026-10-10，A限定盘点；不是任务/所有权/实验批准。仅写本文件；没有执行宿主、help、模型、测试或安装，也未访问旧tmp、用户配置/账户、全机进程。B2源码继续冻结，D当前验证结果优先。版本来自已固定证据，Pi/Codex另直接读指定已安装package.json（不是运行version）；不追网上latest。

## 当前证据与真实缺口

|宿主/固定来源|已有无模型真实层|未完成层与必要前提|
|---|---|---|
|dsh：官方commit `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，`@deepseek-ai/dsh-mcp-client` 0.2.1-alpha.1|官方plugin/registry stdio桥发现/调用，独立scope、取消/noACK、注销；真实Loader/Include patch加载及Hmr.watchConfig文件事件A→B重装。M6.4-B有限九工具。|完整launcher/profile自动合成、模块代码HMR、模型会话未验。现受限40项目官方编译产物不是完整hostbuild；需要同SHA已持有源码/锁依赖/官方decorator编译产物方可复用。此轮不确认旧源码根仍可用，不访问旧tmp、不安装、不运行。|
|Pi：`@earendil-works/pi-coding-agent` 0.87.1，仓库adapter node_modules实际package匹配|public SDK createAgentSession/createAgentSessionRuntime、注册工具及identity/new/switch/fork/reload/shutdown六有限生命周期；固定官方内部loader文件URL明确test-only；M6.4-B九工具。|完整Pi CLI/profile、RPC mode与模型轮次未验。现SDK harness用受控resourceLoader，不能冒充裸CLI发现MCP；Pi MCP须扩展，非内建MCP客户端。内部loader不是公共出口，版本/文件SHA必须保持。|
|Codex：`@openai/codex` 0.144.6，指定安装package仍0.144.6|native静态337 schema归档与单端口OS guard；没有native initialize成功。|用户state deny导致native默认SQLite失败；仅owned sqlite_home/log_dir override后仍因用户config.toml读取拒绝而退出，RPC空。完整initialize→thread MCP启动→catalog→tool call均缺。必须先由root决定可接受的宿主state隔离前提；不能自行撤deny、改HOME/CODEX_HOME、读用户配置/账号或用SDK桥顶替native。|
|Claude Code：native 2.1.282（封存安装/运行证据；本轮不扫描HOME或运行版本）|完整保护与私有配置下stream-json control initialize、mcp_status connected，wrapped八raw工具；context/read(space revision)/publish(note)真实调用及非法outer/inner零HTTP、EOF退出。|九工具forum_review、当前公开review搜索/check分支未取得该native证据；全部业务分支、完整CLI/profile/model未认证。该control协议是固定native实证，不假称跨版本公共SDK。|

`integrations/compatibility.json`保存M6.4-B九工具有限状态，Claude仍八、Codex仍blocked；B2真实SDK/CLI/共享dispatch与本地MCP/Pi回归不能自动升级四宿主认证。integrations/README.md仍有早期“未安装运行”历史说明，应在未来metadata权限范围内统一，不据该旧句抹掉后续实证。

## 可复用精确文件与操作接点

- dsh：`scripts/integrations/dsh-runtime/{launch.mjs,runtime.spec.ts,loader.spec.ts,experiment.config.ts,pid-preload.cjs}`。launcher强核source HEAD及Vitest4.1.8；复制受控harness进入官方源自有子目录后有界运行，不是完整dsh launcher。runtime真实Cordis Context、SystemPrompt/ToolRuntime、createScope及MCP plugin；`ctx.tools.schemas(key)`发现，`ctx.tools.execute`调用，scope.dispose/fiber.dispose注销。Loader suite真实loadOverlayPatches/mountRootInclude/Loader/Include/Hmr.watchConfig，不手emit。脚本会写指定source与生成进程，因此仅可作为未来经授权接点，当前未运行。`examples/dsh-mcp.md`给受限env、独立cwd/home/profile、patch数组replace语义；仅DSH_HOME不够阻止cwd环境文件读取。dump-config不是activation，dump-config-schema会导入插件；两者不算真实工具链。
- Pi：`tests/fixtures/pi-runtime/native-lifecycle.mjs`与`tests/contracts/m4-pi-native-lifecycle.test.ts`。ModelRuntime.create使用owned空auth、modelsPath:null、allowModelNetwork:false、refreshOnCreate:false；真实session manager/runtime，固定loader SHA `81106b07522aaf9197858c4679fecd7fbd23c346376d6e1f2cc3dd5294d543f4`，loadExtensionsCached仅test。工具通过真实definition.execute直接执行，无prompt模型调用；new/switch/fork/reload/shutdown实际生命周期；既有九工具评审case只有显式create_session/本人assignment限定链，不涵盖当前所有check分支。产品接点`packages/adapter-pi/src/{index.ts,runtime.ts}`，registerTool/execute/content/details、安全异常、取消finally及代际凭据固定均已有。B2 canonical500码点在runtime prepare前验证，publicSDK validator本身不执行该扩展。
- Codex：封存 `docs/reviews/2026-10-09-m4-5-a/author/codex/{stdio-probe.mjs,stdio-state-probe.mjs,generated-protocol/}`及planning/codex-facts.md。静态ClientRequest广告mcpServerStatus/list及mcpServer/tool/call，initialize需clientInfo/experimental能力。既有probe只到state失败，不能复制其退出当成功。`examples/codex.config.toml`仅占位template，项目配置/CLI -c覆盖并不证明只读私有配置。已安装JS薄launcher没有可直接核查的Rust app-server源码。
- Claude：封存 `docs/reviews/2026-10-09-m4-5-b/author/claude/wrapped-probe.mjs`。固定argv bare/stream-json/setting-sources空/private settings/strict-mcp-config/private mcp-config/no-session-persistence；control_request initialize→mcp_status→工具control链，无模型prompt。既有OS保护deny用户state/Keychains/mach/network，仅owned loopback；私有token-file/rawstdout脱敏投影、EOF自然退出有证据。脚本含help和临时目录创建，当前不运行，未来也不能直接原样借用旧禁tmp或封存路径写输出。
- 四者共用论坛业务核心、`packages/mcp/src/{index.ts,bridge.ts,tool-validation.ts}`、`packages/client`和canonical九工具；MCP flat/wrapped完整schema、Pi adaptToolSchema原对象、安全16KiB可见文本/完整structured结果、不自动ACK、惰性ordinary身份/诊断session规则已存在。verify不能借普通宿主prepare/getMe提权；issuer/verify写/binary不在九工具，不能要求宿主凭普通工具取得verify token或直接执行候选。

## 官方依据与有限新确认

固定dsh官方README/Agent/tool-authoring/app-boot链接及已实证接口见 `integrations/dsh.md` 与 `examples/dsh-mcp.md`；未因滚动main换源。Pi官方Extensions/RPC/类型链接见 `integrations/pi.md`，此次以实际安装0.87.1 package和已归档SDK链为准，不升级包。

Codex使用OpenAI Docs技能，读取官方[MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)与[app-server](https://learn.chatgpt.com/docs/app-server)页面。当前官方仍列mcpServerStatus/list目录及mcpServer/tool/call线程配置工具调用；这是无模型控制路径候选，不证明固定0.144.6参数/feature gating或state前提满足。固定schema优先，不能据滚动文档补实验结果。Claude官方[MCP](https://code.claude.com/docs/en/mcp)/[CLI](https://code.claude.com/docs/en/cli-reference)/[环境](https://code.claude.com/docs/en/env-vars)既有已读证据在封存报告，本轮未刷新版本或假定新control方法。

## root需要裁定的具体边界

1. 无模型native发现/显式工具执行本身不需要论坛拥有模型API Key；dsh plugin、Pi SDK、Claude已证明有限路径，Codex仅有协议候选。模型理解/自主研究/完整prompt轮次是另一层，确需有效模型账户/许可与网络，不在当前持续禁模型范围内自动实施。
2. Codex真实native链当前首先是state/config隔离冲突，不是缺论坛HTTP接口；不存在已证明的“私有配置覆盖即完全不读用户配置”方法。不撤现保护就不能承诺完成，需要root单独选择符合授权的前提或明确阻塞。
3. dsh完整CLI/profile需要现成固定官方构建来源与依赖可用，未验证新checkout recipe；缺失时安装/下载/fullhostbuild不能自行执行。Pi完整CLI/RPC同样不能由当前SDK harness推出。Claude缺当前九工具/check原生链须用新的隔离证据验证，旧八工具成功不改写。
4. 后续只应在新owner/fresh下适配有界harness与新结果；保持已知版本、普通分立论坛actor/token、完整schema和新check字段、安全issuer输出/noACK/取消清退，不改变全局profile、不启动VM或常驻宿主，也不让论坛材料获得执行权。本文件不选择实验、增接口或授权执行。
