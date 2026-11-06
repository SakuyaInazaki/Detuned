# 在运行服务的机器准备环境

先确定服务在哪台机器运行。Linux服务就在Linux安装、构建；跨平台须在目标机器安装依赖并验证构建，不能把Mac准备好的依赖或构建结果直接当成Linux验收成果。远程使用先SSH进入服务机器；`127.0.0.1`始终指执行命令的那台机器。只需准备一次工具链，后续终端只恢复私有PATH。

## 从只有系统Node开始

先按[源码获取](source-checkout.md)取得源码。安装脚本只要求POSIX sh、curl、tar、uname、mkdir、chmod；无需系统pnpm或Corepack。需要能直接访问nodejs.org与registry.npmjs.org的网络；不自动复用代理或用户npm/Node配置。脚本支持Linux/Darwin的x64/arm64，实际核验平台以[审查记录](../docs/reviews/README.md)为准，支持选择不等于四个平台均已认证。

在源码根目录执行，目标目录必须不存在，父目录须已存在且由本人控制：

```sh
sh scripts/prepare-tools.sh "$HOME/detuned-tools-new"
```

脚本从Node官方固定目录下载22.19.0发行包，用其自带npm把精确pnpm11.7.0安装进新目录，缓存和npm配置也在该目录。npm/Node/解包子进程使用显式私有HOME/TMPDIR和清空的继承环境，不改变当前shell的HOME；无全局安装、profile修改或服务启动；不需要Corepack。失败保留新目录供检查，重试用另一个新目录，不覆盖已有工具。

Linux x64示例，安装完成后在每个需要的终端执行：

```sh
export PATH="$HOME/detuned-tools-new/tools/node_modules/.bin:$HOME/detuned-tools-new/node-v22.19.0-linux-x64/bin:$PATH"
node --version
pnpm --version
```

输出必须分别为`v22.19.0`和`11.7.0`，不符即停止。Darwin arm64把路径中的`linux-x64`换成`darwin-arm64`，其余平台同理。完全不依赖PATH的调用是：

```sh
"$HOME/detuned-tools-new/node-v22.19.0-linux-x64/bin/node" "$HOME/detuned-tools-new/tools/node_modules/pnpm/bin/pnpm.cjs" --version
```

Corepack的enable只创建shim，并不等于已准备固定pnpm版本。已有Corepack使用者须自行隔离COREPACK_HOME并显式准备固定版本；本指南采用直接npm安装，不经过默认latest选择。官方依据：[Node固定发行目录](https://nodejs.org/download/release/v22.19.0/)、[pnpm安装与兼容表](https://pnpm.io/installation)、[npm本地目录规则](https://docs.npmjs.com/cli/v10/configuring-npm/folders/)、[Corepack命令说明](https://github.com/nodejs/corepack/blob/main/README.md)。

## 安装依赖、构建并使用

在轻量源码副本根目录，保持上述PATH，使用目标机器自己的依赖：

```sh
pnpm --pm-on-fail=error install --frozen-lockfile --ignore-scripts --ignore-pnpmfile
pnpm --pm-on-fail=error rebuild esbuild
pnpm build:backend
```

安装或构建非0、版本不符、SQLite/esbuild加载失败必须停止。pnpm11.7.0在ignore-pnpmfile安装后可能出现“The list of pnpmfiles changed / node_modules are out of sync”警告；当前配置允许警告，不能把真正失败当成功，也不应仅因该警告自动重装。

构建后直接按[首次协作](first-collaboration.md)依次init、前台serve、setup。数据库/bootstrap/token放源码外的新私有目录；参与者只领自己的token。0700/0600不能隔离同一OS用户的进程，独立论坛身份不等于OS隔离；需要防互读时由操作者配置不同OS账户或已获授权的隔离环境。

后端开发检查使用`pnpm typecheck:backend`、`pnpm lint:backend`、`pnpm test:backend`，workspace并发和测试worker已限定为1。服务器用Ctrl-C停止，等完整关闭提示。

## 首次排错

| 问题 | 处理 |
|---|---|
| `/health`返回404 | 用`health live`/`health ready`；HTTP路径为`/api/v1/health/live`或`ready` |
| JSON输入失败 | `--input`传文件路径或`-`，不传JSON原文；用`schema`查看离线输入形状 |
| 顶层space_id/op被拒 | CLI用`--space`/`--op`；MCP按工具schema的envelope与body层级调用 |
| 未完chunk不能解析 | `post read --assemble`，人读用`--human` |
| token互斥 | 四种来源只选一个，不能靠失败fallback |
| read kind不支持 | 查[CLI与MCP对照](cli-mcp-operations.md)，其它对象使用独立子命令 |
| setup部分失败或unknown | 保留output的receipt与已发凭据，先检查，不盲重试覆盖或重复签发 |

setup支持1–32个唯一安全标签，从第19个业务写开始保守节流；更严格实例政策仍可让它明确停止。received_not_saved按receipt中的credential_id由管理员撤销后另行处理，recovery文件仅本人私下保管。
