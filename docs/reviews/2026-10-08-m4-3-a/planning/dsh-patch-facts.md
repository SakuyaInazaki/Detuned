# dsh 固定版 patch 第一关事实

- 固定 HEAD `5badb15009ae1756c3afe0ae0cef1faafc290ccc`、tree `a9d30743edbe97adac9c8cb0811b648a0d9f6660`；复用 A checkout `/private/tmp/detuned-m43-runtime.MU1a4q`，来源收据见本包 author/runtime/source-path.txt。
- 仅读四文件：packages/mcp/mcp-client/README.md、src/index.ts；packages/boot/app-boot/README.md；docs/user/develop/basic/publish.md。没有执行配置/宿主、安装或读取真实 profile。
- MCP Config（index.ts:120–143）为 transport 分支 union；stdio 必需 transport:stdio、serverName、command，args:string[]、env:string字典、cwd:string，toolCallTimeoutMs 默认60000、failOnStartupError 默认false、maxInstructionBytes 默认32768、reconnect 可配置。
- README 的 serverName 为 `[A-Za-z0-9_-]{1,32}`，唯一性在 registration scope 内；独立 Agent scopes 可复用名称。同 scope 重名后者加载失败。
- 一 server 一 entry；stdio 可能先开临时协商 probe，再开 serving process，所以桥 startup/discovery 不应有论坛业务写。
- public 工具名由 serverName/rawName 形成，但归一可能带 hash；实际 namespace 工具名须后续 registry 获取，不能把推测名称当运行证据。

## 完整示例所需受信字段（尚未生成/启用）

- `cordis.patch.example.yml` 应为 YAML array：`- insert:` 下 entry `{id:detuned-forum,name:'@deepseek-ai/dsh-mcp-client',config:{...}}`，对应 publish.md 的官方 insert 示例。
- config 完整列 serverName:detuned、transport:stdio、command:node、args:['/ABS/Detuned/packages/mcp/dist/index.js']、cwd（若选用只能占位）、toolCallTimeoutMs:60000、failOnStartupError:true。
- env 只传 Detuned 专用字段：DETUNED_BASE_URL 与 DETUNED_TOKEN_FILE 的受信 `!!js process.env.…` 表达式；不把 token 明文放 YAML，不继承两种论坛凭据同时配置。
- `!!js` 是本机受信配置执行，非论坛语法；publish.md 说明注入满足后才针对该 row context 求值，不能从帖子/附件生成表达式。
- README 说明 stdio ambient env 会清除名字匹配 KEY/PASSWORD/SECRET/TOKEN 及 DSH_* 的项，再合并显式 env；不能依赖被清除的 ambient token 自动进入桥。
- id-targeted patch **整项替换 config**，不递归 merge；覆盖时须重述保持的完整字段。insert 加新项则须避免 bundle 与手工 entry 重复。

## Loader 时点与隔离边界

- app-boot README:50、61：profile 在 `$DSH_HOME/profiles/<name>`；bundle patches 按 manifest 顺序，随后 profile patch、home patch、最后各 `--patch` argv 顺序（publish.md loading order）。
- startup 组合后挂载 Loader，等待 injection 再求值 config；web template HMR，其他 shipped templates 只 startup 应用，不能泛称任何 profile 自动 reload。
- `--dump-config` 是启动前组合预览，保留 `!!js` 原文；**不证明 MCP 激活**。`--dump-config-schema` 会导入模块，不应混作纯文本无执行检查。
- failOnStartupError:true 仅拒 MCP plugin activation，optional entry 仍可能不终止 harness；接入成功须实际发现/调用，不以 CLI 存活为准。
- app-boot README:203 明确 env discovery 读 invocation directory 与 Harness home；仅改 DSH_HOME 不足以防真实 cwd 的 .env，候选须同时私有新 cwd/home/profile 和显式受限 env。
- 最短候选（未实跑）：在已核可解析官方依赖的私有 cwd，以私有 DSH_HOME 执行 `dsh --profile <isolated-profile> --patch /ABS/cordis.patch.example.yml --dump-config`；launcher路径、profile最小组成与依赖由 A/父第二关核定。
- 不运行 `dsh plugin`/自动创建真实 profile；普通 shipped web 会带其他服务，不可据其名称保证无模型。下一关优先 A 的固定源码 Cordis/ToolRuntime/scope 官方组合，完整 CLI/HMR隔离须另有证据。
