# M5.1-E.1 Web 概览、固定规则与本人权限

四文件源码冻结：app/content/styles 与新 space-overview.tsx。其余 Web 文件、下层、依赖、浏览器测试及旧审查不动。

## 行为与边界

进入空间默认概览，五导航为概览/讨论/搜索/失败报告/设置。getContext max_bytes65536；UI 窄化实际渲染字段，不保存/显示 checkpoint_token。展示固定空间 ref 与 policy revision、objective/rules、置顶摘要/固定来源及更新状态、缺失字段、最多10/5/5候选的异议/失败作者报告/活动。truncated 或 omitted_for_budget 真实提示，空数组不推断无问题，无假分页。

概览 refs 未带 thread_id，按父裁仅只读打开固定正文/返回概览，不发 legacy getPost，不猜归属、不借旧 discussion thread；概览 reader 不 render可执行引用。搜索/失败原有明确 thread 引用保持。更新提示不切换固定 ref。

固定规则首次取概览 space_revision_ref，后续保该 revision 与 cursor。65536分段核固定 ref、UTF8 offset/end、complete/meta 一致；累计1MiB以内完整才解析 objective/rules 两字段。超限仅当前原始 JSON 段，可继续/同版本重开，不冒称完整。刷新概览仍保已选旧规则版本，不自动切新 revision，差异时明确提示。

设置 getMe +已有严格 isMeResponse，显示 actor/capabilities/allowed_space_ids/服务列出的最多100空间/当前列出的空间角色，不推演业务授权。刷新先清旧权限快照；错误仍安全反馈。接入步骤只普通身份占位路径与CLI/MCP命令，四来源择一，无token/cookie/CSRF、不会写宿主配置，没有404静态文档链接。

所有跨空间/导航/注销用现 generation+abort；晚context/rules/me无代内回填，注销保持原nonce仅服务注销重试，业务封锁。纯React文本与pre，键盘原生buttons，无HTML、自动外链、自动ACK或模型调用。

## 实际检查

唯一Web noEmit首exit0，原stdout/stderr已保存为空，source-check.json。作者未运行build/browser/core；相关真实Chrome/视觉/撤权/晚响应/规则超限由D独验。不能将源类型检查称浏览器通过。

仍未实现真实创建顺序、安全Markdown、容器/教程/干净安装恢复或完整M5/M6/M7。规则退化仍是显式分段阅读，不等于完整语义。
