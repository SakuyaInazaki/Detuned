# M4.4-B 阶段1：真实 Pi 0.87.1 无模型原型

仅本目录写入；无产品、正式测试、安装包、依赖或 held dsh 修改。实际入口为安装 SDK 的 dist/index.js 和官方 dist/core/extensions/loader.js（后者非 package exports 子路径，用明确本地文件 URL）；版本/加载文件/主 lock 哈希见 metadata.json，无 gitHead/commit 推断。

## 实际执行与失败条件

所有命令使用 `/usr/bin/env -i PATH=/opt/homebrew/bin:/usr/bin:/bin CI=true /opt/homebrew/bin/node <本目录脚本>`，没有继承用户 token、NODE_OPTIONS、代理或 profile 环境。SDK 使用私有 cwd/agentDir、私有 auth.json `{}`、modelsPath:null、allowModelNetwork:false、refreshOnCreate:false、inMemory SettingsManager，完整显式 ResourceLoader。没有 prompt/stream/provider 执行。论坛仅私有 SQLite 内存实例，bootstrap token只在子进程内；本阶段 context 用本地管理员，未证明普通成员权限生命周期。

- probe-first：exit0/0.49s，但 tools:[] 限制 allowedToolNames，工具获取失败，**未达到工具执行验收**。原 stdout 的 names=[]/TypeError 保留。
- probe-second：exit0/0.27s，官方 extensionRunner registry exact8；调用显式不可用 loopback 得 ClientTransportError，仅加载事实，不称成功论坛调用。
- lifecycle-first：exit1/0.28s，真实 fork 拒绝仅 user entry 尚未保存的会话。没有模型响应；后续用静态合法 assistant message 私有 fixture 使官方 SessionManager 保存，再走真实 fork。
- lifecycle-second：exit1/0.66s，沙盒 loopback listen EPERM，环境失败。
- lifecycle-third：exit1/0.43s，setActiveToolsByName 无法突破 tools:[]；正确断言未弱化。
- lifecycle-fourth：exit1/0.67s，私有 fixture 使用不存在的 max_tokens 参数被原 protocol 拒绝；改为合法仅 space_id。
- lifecycle-fifth：局部 loopback 授权，exit0/0.65s，真实官方注册8工具/显式8 allowed工具，startup零HTTP，forum_context 成功且仅1HTTP，真实 new/switch/fork/reload/dispose 路径。
- inflight-first：局部 loopback 授权，exit0/0.70s，真实 context HTTP 屏障、真实 runtime.newSession；替换完成时原工具仍pending，释放HTTP后才完成。异步生命周期观察器使用 setImmediate，每个 enter→exit 都在官方操作返回前完成。

后续脚本有60秒截止，正常 finally 关闭 runtime/session、app、DB并删除私有目录；本次均自然完成，无截止/强杀。截止使用非零退出，不据此宣称 finally 可保证执行或非合作资源清退。首 probe缺少截止且实际0.49秒退出，保留此限制。

## 实测生命周期

`startup start` → `before_switch(new)` → `shutdown(new)` → `start(new)` → `before_switch(resume)` → `shutdown(resume)` → `start(resume)` → `before_fork` → `shutdown(fork)` → `start(fork)` → `shutdown(reload)` → `shutdown(quit)`。

全部来自真实 AgentSessionRuntime.newSession/switchSession/fork、AgentSession.reload 和 runtime.dispose；未手工 emit。Observer回调异步被await。reload 的显式 ResourceLoader.reload 是 noop，旧 extensions 对象复用，未观察到 reload 后新 start；**这不证明真实 extension reload/reinstall**，产品映射需实际每次reload重新loadExtensions构造。

## 最小产品映射建议（待父冻结）

session_start 建立一代固定凭据/shared binding；session_shutdown 在 new/resume/fork/reload/quit 均同步停止新工具、abort owned calls/flights并 await 自有 finally。真实 registry execute 不被宿主替换追踪：不能用 host runtime.newSession 返回或 session.dispose()void 当工具已清退。宿主 await shutdown handler 为可复用出口，但要自有有界取消/等待策略；不能伪称逐帖session_id绑定。需要下一阶段明确不合作工具超时映射和重新加载 ResourceLoader 语义。

当前未做普通actor/并发身份、完整reload重装、模型、正式Pi CLI/profile或生产启动；不把此原型当产品验收。

## 父指定的真实 reload 补核

reload-first 单次 exit0/0.89s（同60s截止/env-i/私有loopback）：ResourceLoader.reload 调用官方 loadExtensionsCached + createExtensionRuntime，重新激活固定扩展并建立 generation2；真实 session.reload 等待 generation1 的 shutdown enter/exit 后返回，新 tool definition 与旧对象不同、八工具仍可见、generation2真实 context 再发1HTTP成功。原 noop 的事实及日志未覆盖。

此无UI/commandContextActions/shutdownHandler/onError绑定的 SDK 组合仍不发 reload session_start。安装源码 agent-session.js:2617–2625 明确 `hasBindings` 条件；并非所有官方宿主组合保证该事件。产品新 activation 必须建立空generation，不依赖 session_start 才可初始化。实际 stdout见 reload-first.stdout；shutdown handler异步被await，新的quit来自generation2。所有private资源自然finally结束，无forced cleanup。阶段1到此停写，待父阶段2冻结。
