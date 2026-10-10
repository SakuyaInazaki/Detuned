# M5.3 构建输入核定（2026-10-09，只读准备）

没有 pull/build/run/install，没有改锁或产品；owned VZ 保持无 host mount、无业务 TCP 转发。本轮只读公开 registry HTTPS manifest，不读用户 Docker config/auth；匿名 registry bearer 仅内存使用、未输出。默认 sandbox 首次 DNS `gaierror [Errno8]`，受管仅公开 registry 的第二请求成功。以下 digest 是实际响应，不是猜测浮 tag。

## 基底 pin

- registry：`https://registry-1.docker.io/v2/library/node/manifests/22-bookworm-slim`。
- 索引：`sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392`；Docker-Content-Digest 与原 response bytes 自算 SHA256 相等。
- linux/arm64/v8 platform：`sha256:b20fe038d9592822dd534600a1ddf467e985178aa3fed60ec441a056c2cc45bd`，OCI manifest1931bytes。
- registry annotations：created2026-10-06T01:48:14Z；官方 source `https://github.com/nodejs/docker-node.git#81f419144a1251854c6d9afb09eaa39928e724e8:22/bookworm-slim`；Debian base `sha256:a1b86db52ce3daef089e45aabe36dfec4091f82464c25c1fdcf03de197cbe82a`。
- 建议 builder/runtime 同 `node:22-bookworm-slim@sha256:c3de60...` 完整索引 pin，并本包显式 linux/arm64；需要单平台完全固定可直接用上述 platform digest。尚未拉取或核实际 `node --version`，不能凭 tag 断言补丁版本。

## 现锁与安装实际事实

根 packageManager `pnpm@11.7.0`，Node engine>=22.19.0；lock9.0、TypeScript5.9.3、better-sqlite3 13.0.3、esbuild0.28.2、Vite7.3.7。workspace 包路径为 packages/* 与 modules/*，`workspace:*` 链接必须保留原目录相对关系。CLI 的运行闭包为 client/core/protocol/server/storage-sqlite 加 Commander；server 再含 Fastify/cookie/cors/multipart/static，protocol含TypeBox/ajv-formats。Web dist 是独立静态工件，runtime不需React/Vite执行。

workspace当前同时有 `allowBuilds:{esbuild:true}` 与 `onlyBuiltDependencies:[esbuild,better-sqlite3]`，verifyDepsBeforeRun:warn，Playwright3个精确release-age例外，Viteoverride7.3.7。不为了容器关release-age、不刷新锁、不新加 approve-builds。

**13.0.3 与旧SQLite安装假设不同**：已锁 better-sqlite3 package 无 install/postinstall、gypfile:false，随 tar 包带 `prebuilds/linux-arm64.node`/linux-x64/linuxmusl等，engine>=22；默认binding选择平台。不能直接声称需 node-gyp/g++，也不能拷 Darwin node_modules 当 Linux运行验证。esbuild确有 `postinstall:node install.js`，对应Linux optional binary在锁内。推荐先 frozen+ignore-scripts+ignore-pnpmfile，随后只明确 `pnpm rebuild esbuild`（实际批准行为是否与两字段兼容需首次构建证实），不运行其他第三方脚本。better-sqlite3须 builder 中真实 Linux 开/查询/关 smoke，失败留原始 ABI/平台原因，不自动加编译路线或改锁。

## 最小多阶段方案

1. builder与runtime相同digest/架构。builder固定安装pnpm11.7.0（公开registry、空user/globalrc），copy根manifest/workspace/lock与全部对应workspace manifest，再 frozen ignore-scripts安装；仅明确esbuild rebuild。无Playwright浏览器下载。
2. copy所需源码/tsconfigs；至少 `pnpm --filter @detuned/cli... run build` 加 Web build，或全workspace build由根选择。storage-sqlite build依赖 `src/schema.sql`、`scripts/generate-schema.mjs` 和 `tests/fixtures/historical-v1-schema.sql`；不能仅COPY packages忘此历史schema fixture。generation在builder使用Linux SQLite，不变repoSQL。
3. runtime保 `/app/node_modules/.pnpm`、root node_modules symlink布局及必要 packages/{cli,client,core,protocol,server,storage-sqlite}/node_modules、package.json、dist；Web仅dist。最小首包可直接复制builder完整Linux node_modules而不做pnpm prune/deploy（尺寸不是目标），避免破坏相对workspace链接；后续优化另验。
4. 用既有node非root用户，whole-data-volume给明确data-dir，TLS cert/key独立只读挂载，显式CLI serve flags，exec形式直接node CLI dist保signal。创建目录/权限应由交付约定处理，不启动时递归chown未知用户材料。

根需冻结：采用索引pin+arm64还是平台pin；首包完整Linuxnode_modules可接受；是否允许公开pnpm固定安装+唯一esbuild rebuild。现无需锁修复的源码证据，但 frozen install与真实Linux开闭尚未执行，若失败不得预填成功或静默改flags/lock。后续只在自有Unixsocket上受限build/run，不能继承用户registryauth。
