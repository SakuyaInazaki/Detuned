# M7.5-A：隔离 clean install / 最低 Node 只读执行方案

状态：root已选择完整158文件backend路线；D实现runner、B独审后才执行；本作者未下载可执行包、安装、运行版本/build/test或创建 fixture。E 已完成，任何 E 文件不再改。

## 已核事实与固定材料

root package.json：node>=22.19.0、pnpm>=9.0.0、packageManager pnpm@11.7.0；lockfileVersion9.0，根 manifest/lock/workspace 原字节冻结。官方 [pnpm v11.7.0 manifest](https://github.com/pnpm/pnpm/blob/v11.7.0/pnpm/package.json) engines>=22.13，与22.19.0兼容；现有 /opt/homebrew/lib/node_modules/pnpm/package.json 静态一致。只将现有固定 package-manager 视为工具链，不能复用任何工程 node_modules/global cache；不可自动调用Corepack下载/升级另一pnpm。

[Node22.19.0官方release及内嵌SHASUMS](https://nodejs.org/en/blog/release/v22.19.0) 给定独立包 URL https://nodejs.org/dist/v22.19.0/node-v22.19.0-darwin-arm64.tar.gz ，SHA256 c59006db713c770d6ec63ae16cb3edc11f49ee093b5c415d667bb4f436c6526d。SHASUMS文本 URL https://nodejs.org/dist/v22.19.0/SHASUMS256.txt 本次web直读返回error，hash从官方release内嵌表核得，非猜测。未来下载必须有限字节/时间，先核官方hash再安全解压私有路径、拒绝绝对/..逃逸及外指symlink，绝不执行未核包。校验不是本次实测下载成功。

后端闭包九包：protocol/core/client/storage-sqlite/module-review/server/cli/mcp/adapter-pi。除 storage build/schema脚本外均tsc；storage generate 会写 fixture src/schema.ts，所有副作用只在copy中，与原src校验对照。原 root scripts build/type/lint 会包含Web，因此只跑显式包序列，不运行pnpm build。原root dev依赖Playwright随root install可能下载库，但PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1，不浏览器安装/执行、不copy/buildWeb。Pi固定0.87.1 dev SDK用于现有validator测试，其未批准installscripts不能启用。

现repo pnpm-workspace.yaml allowBuilds仅esbuild=true，onlyBuiltDependencies历史esbuild/better-sqlite3；Docker既有批准路线 install --ignore-scripts --ignore-pnpmfile，再rebuild esbuild、SQLite smoke。better-sqlite3锁定13.0.3 engines>=22、gypfile=false、tar包prebuilds且无install脚本；仅esbuild显式rebuild，不运行任何其它dependency生命周期、node-gyp、prebuild下载器或新脚本。若SQLite预编译不工作，保失败交root，不自行源编译/装Xcode。

## 已定私有 fixture 与有界命令

D runner在root审核后才创建一个自有0700root，所有 HOME/config/cache/store/state/tmp/download/work/output 其下。env从零构造：PATH=<verifiedNode>/bin:/usr/bin:/bin、HOME=<privateHome>、TMPDIR=<privateTmp>、XDG_CONFIG_HOME/XDG_CACHE_HOME/XDG_DATA_HOME/XDG_STATE_HOME、PNPM_HOME、NPM_CONFIG_USERCONFIG/GLOBALCONFIG 两个新空文件、NPM_CONFIG_CACHE私有、CI=true、PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1；不继承代理/token/NODE_OPTIONS/npmrc/Agent环境、不读取用户HOME配置。pnpm私有配置固定registry/store/cache/state/virtualstore（禁globalVirtualStore、sideEffectsCache及package-manager auto-management）、network/child concurrency1。D核固定pnpm入口/版本及它是否试图访问外部工具state；若不满足隔离，停止报告，不能偷偷复用缓存。

显式copy清单在ownership内逐文件pin，禁止node_modules/dist/旧review/用户数据/全局cache；安装前证明这些不存在，安装后锁及manifest原字节未变。root暂定全fixture2GiB（Node包、解压、store、modules、output合计，不只workdir）；监控allocated和logical bytes并分别报告，hardlink去重不能掩盖上限。超过停，保最小receipt/hash与失败适用条件。root已定上限：download120s/install600s/esbuild60s/每包build60s/fulltest900s；全流程共享1800s绝对截止，含cleanup90s。各阶段cap不相加生成新总预算，始终取剩余绝对deadline；未执行。构建/测试按单阶段串行，worker1；测试内部原受控竞态/断言/timeout不改。

所有命令在fixture/work cwd，使用 verified Node绝对路径执行固定 /opt/homebrew/lib/node_modules/pnpm/bin/pnpm.mjs（下文 P）；严禁PATH落到现系统node、npx/latest/全局安装。

1. verifiedNode --version / P --version 核22.19.0/11.7.0，然后 P install --frozen-lockfile --ignore-scripts --ignore-pnpmfile --registry=https://registry.npmjs.org --store-dir=<privateStore> --network-concurrency=1 --child-concurrency=1；用私有配置禁globalstore/cache复用。
2. P rebuild esbuild；verifiedNode --input-type=module -e "import Database from 'better-sqlite3';const db=new Database(':memory:');if(db.prepare('SELECT 1 AS n').get().n!==1)throw Error('SQLite smoke failed');db.close();"。SQLite已批准同种smoke；无额外native构建。
3. P --filter @detuned/protocol run build；依序 core/client/storage-sqlite/module-review/server/cli/mcp/adapter-pi 相同命令，每包完整闭包已先构建，workspace并发1；禁止-r全workspace/Web。
4. 早先8 focused是未选择备选，以下列表仅记录历史方案，不能执行它来替代root选定158文件完整backend。已定唯一fulltest命令见末节，worker1/fileserial，保既有timeout/断言，不新写测试：
- tests/contracts/m7-check-http-client-independent.test.ts
- tests/contracts/m7-check-cli-tools-independent.test.ts
- tests/contracts/m4-mcp-wrapped-independent.test.ts
- tests/integration/m7-check-domain-independent.test.ts
- tests/integration/m7-fixed-verifier-independent.test.ts
- tests/integration/m7-d01-reviewed.test.ts
- tests/integration/m7-d01-reviewed-independent.test.ts
- tests/integration/m7-local-startup.test.ts

上述未选择8focused方案覆盖真实builtCLI init/readiness/normalclose/reinit/restart、checks HTTP/sharedclient/CLI/MCP/Pi validator、固定验证器及D01独立身份/两评审/检查/重启与取消故障。所有子进程均由D runner登记自有PID/组、实际close/组absence；test自建孩子若外runner无法证明全部归属/沉降，不清退root、不声称全局absence。最终原工程manifest/lock/source/dist未变；fixture源schema生成漂移单列；receipt输出安全摘要不输出签发token/私有原日志。

## 网络、剩余与失败条件

只允许nodejs.org固定包/文本，以及registry.npmjs.org锁定包meta/tar；现锁未见自定义http/tarball resolution，lock integrity核验。GitHub/npm镜像/模型域无需允许；esbuild来自npm平台optional包，若意外fetch其它域即停核。测试网络仅loopback临时自有服务；不加载原native宿主、不发prompt/model。install/esbuild仍可能写manager状态，须落私有cache/store/state，不能用日志absence证明未读用户配置。原批准脚本允许不等于任意deps脚本授权。

已证全量测试有排除档案依赖：tests/integration/m2-typed-writes.test.ts直接import docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/legacy-{post,thread}-service.js；因此若完全排除这两历史fixture，不能宣称完整backend；root已选精确两file例外，旧967/155仍不作本次计数。build另需tests/fixtures/historical-v1到v5-schema.sql，属现必要工程fixtures，列清单且保原字节。root已选完整backend并明确例外允许下节精确2个旧review源码fixture，不复制整个档案；广泛native会话仍不纳入此包。

已选158文件完整backend若实际通过，证明固定macOS arm64/Node22.19.0/现有固定pnpm11.7.0及锁的干净工程依赖安装、后端built闭包和158文件现有验证的本机行为；不能证明pnpm工具也干净安装、Linux/跨平台/全九工具全部行为/四完整宿主模型会话、D02研究价值或维护者许可证/发布许可。网络可达、磁盘2GiB内闭包、最低Node预编译SQL可用仍需实际验证，当前不据此称缺环境或要求用户许可。

## Root-selected complete backend (execution awaits runner review)

The actual old-review source closure is two regular files totaling27402 bytes: legacy-post-service.js SHA63888521f6d792785a149bd246f2a9a7735faee180b96431559eaf25f531e7ec; legacy-thread-service.ts SHA408328902c356c1610bb68605639e3b5043abe3e88e5faa260aafa630e40bdd8. Both exactly match source-package accepted provenance implementation/core/README.md lines36–37, no fabricated new seal. The imported .js thread specifier is resolved from existing .ts by Vitest. Post imports current artifact-references/protocol; thread additionally current ports/auth/idempotency. No other archive import found in current test TS sources. This is below root50files/5MiB cap; root has approved exact two-file copy to retain historical replay coverage, without copying whole review.

Default vitest config excludes docs/reviews, dsh-runtime and scripts/integrations/web. Current static default testfile count160 includes2 Web pure input-parser contracts (m6-knowledge-web-input and m6-review-web-input importing packages/web/src), not actual browsers. They remain excluded under current nofrontend scope. Remaining158 includes protocol/storage tests and existing backend contracts/integration; selected supplementary copy allowlist in ownership enumerates all tests/current fixtures/three helper scripts/Dockerfile/scale helper and two provenance fixtures. Node factories/owned process proofs are actual own Node/MCP children, Pi native lifecycle uses fixedSDK/loader with loopback; imports of native host probe modules use helpers/factories only, not full Codex/Claude host functions. Static search found no browser/VM/Colima/Docker executable invocation in selected tests; m7-delivery-layout reads Dockerfile text only. Playwright/browser and dsh standalone .spec files are excluded by original config; test:e2e is not run. This is static assurance, not runtime network/process census.

Root已选择完整backend：保相同clean install与九包串行build，唯一执行 P exec vitest run --maxWorkers=1 --no-file-parallelism --exclude tests/contracts/m6-knowledge-web-input.test.ts --exclude tests/contracts/m6-review-web-input.test.ts；fixture只有已枚举158个backend testfiles，不复制另2Web parser。使用原vitest config与原testtimeout/assertions，不新增timeout弱化或备选重跑。D须静态确认两次exclude参数在固定Vitest3.2.7按数组合并，或使用同一158文件显式argv取得完全相同唯一范围。fulltest900s与总1800s包含cleanup90s，不继承旧8focused每file60s。只有实际完整receipt/count才称本包backend158file结果，不以旧967/155算术代替。storage schema-generation可能临时写fixturecopy，并restore/核source；不运行档案重生fixture generators。

## 静态copy闭包核对与文档尾项

DL01/DL02 的workspaces()遍历fixture实际packages/modules目录，checkLayout仅从@detuned/cli递归production workspace；九后端包已覆盖，不需要Web manifest/config文本或Web源码。Dockerfile已在补充白名单，只读文本，不启动Docker。历史闭包2文件哈希对应旧accepted M2.2-A implementation/core/README.md36–37；该旧包无独立SHA256SUMS文件，不捏造sealed manifest，仅以真实已存provenance pin和本次实际字节复核记录来源。

本包完成时统一修正公共README/progress/reviews等当前E已封存却仍留“待封存”的措辞；现在仅记待办，不改公共metadata、不改任何E封存内容。
