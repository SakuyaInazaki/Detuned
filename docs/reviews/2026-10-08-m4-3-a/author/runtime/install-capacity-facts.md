# attempt1 有限资源核查（2026-10-08）

只读安装末尾≤100行/日志、owned一级du、/private/tmp所在卷df及本地工具/runner metadata；没有重试、依赖扩审、用户配置读取或官方执行。

- 最后progress为resolved1393/reused0/downloaded1376/added1380；没有完成footer/完整链接成功。`added`是pnpm进度，不代表根bin已可运行。
- 末尾有慢网络warn，@electron-internal/extract-zip、@deepseek-ai/libreoffice-kit-darwin-arm64、playwright-core下载error(23)及“1 retries left”；末尾未见最终fatal错误。**确定中止原因是监督器size_budget/SIGTERM，不证明所有剩余下载只受预算影响**，上述网络/写入warning仍未排除，不从23臆断原因。
- /private/tmp所在Data卷df：available11602204KiB，即11880656896B（约11.06GiB）；当前capacity95%，仅当时采样，非预留磁盘。
- 同一du调用计算allocated：source1322276KiB、owneddeps1328684KiB，合2714583040B。原before195047424B，新增2519535616B（约2.35GiB）；监督采样新增2489044992B后TERM，收尾仍有少量增长。
- source最大一级node_modules1132172KiB；packages71896、.git37884、.agents26464、docs23692、apps10908、snapshots10356KiB。deps一级store1098356KiB、cache230328KiB，config/data/corepack各0。du为分配空间且跨路径计hardlink时按该调用去重，不称下载wirebytes。
- 本地pnpm来源 `/opt/homebrew/bin/pnpm`→`../lib/node_modules/pnpm/bin/pnpm.mjs`，其package metadata11.7.0，先前实际--version亦11.7.0；Node symlink指Cellar/node26.3.0。未改工具或global配置。
- 根node_modules/.bin不存在，root vitest/tsx/tsc链接不存在；但owned .pnpm里有Vitest4.1.8（多个peer实例）、tsx4.22.4、TypeScript6.0.3的已下载metadata。不能绕过未完整安装直接运行这些artifact，也不能称整套依赖已闭合。

若父另选最多6GiB**新增总预算**，在此已留产物基础上余量约3.65GiB；当时卷剩余11.06GiB在量级上足以容纳该预算，且1376/1393已下载，说明更大预算可能足够。但少数大artifact/展开/链接增长不能按包数线性推算，网络warnings未清，不保证成功。此前预算失败/原log保持；本页不批准重试、不选路线或自动清cache。
