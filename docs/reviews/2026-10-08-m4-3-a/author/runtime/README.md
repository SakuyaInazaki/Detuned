# A 第一关与2a receipt

官方source固定获取成功，init/fetch/checkout真实0，HEAD/tree在git-identity.txt。匿名source URL为公开deepseek-ai/deepseek-harness.git，source-path记录owned目录；未执行git hooks/submodules/官方源。

首次hash helper失败：tracked symlink `.claude/skills`误用read_bytes触IsADirectoryError，保hash-first-diagnostic；改按gitmode读取symlink文本、gitlinkOID或regular bytes，未follow私人路径。source-before含14208记录。

父授权2a唯一原workspace安装：install-supervisor.py/experiment-decision与install-start.json给精确命令、非敏感隔离env、PID47096及资源边界。pnpm11.7.0 help文本确认关键flags；预算采样日志为tool session4545，自有进程组。

**安装未成功**：101.3s新增allocated2489044992B超2GiB，owned group SIGTERM，installer exit=-15/stop_reason=size_budget，101.708s结果收尾。监督器本身exit0不当安装exit。install.stdout/stderr和install-result保原结果；进程组已不存在，产物保留不删、不重复试。

source-after-summary确认全tracked与lock未变，node_modules部分存在、Vitest/MCP client链接未完整。整个阶段没有build/test/model/profile/CLI或官方code执行；ignore-scripts+ignore-pnpmfile实际传入，安装失败不假称完整可运行依赖。

下一2b或更小安装方式由父裁定；本repo源码/依赖未改。C独核主仓保护与owned source/lock，不用本作者receipt冒充独验。
