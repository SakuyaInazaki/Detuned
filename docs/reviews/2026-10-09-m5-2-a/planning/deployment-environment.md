# M5 部署环境补项（2026-10-09，只读）

沿用 E2 [部署现状](../../2026-10-09-m5-1-e2/planning/m5-deployment-facts.md)，不重复旧能力认证。CLI TLS B2 继续冻结。

## 唯一本机 daemon 探测

`/opt/homebrew/bin/docker version --format '{{json .Server}}'`，Python subprocess timeout=8 秒，env 仅 PATH、明确 `DOCKER_HOST=unix:///var/run/docker.sock`、新 owned 空 DOCKER_CONFIG（finally删除）。实际 exit1：`failed to connect to the docker API at unix:///var/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /var/run/docker.sock: connect: no such file or directory`。完整安全收据：[docker-local-receipt.json](docker-local-receipt.json)。

这只证明指定 socket 不存在，不能断言机器所有 Docker runtime 不存在；本轮不遍历用户 Desktop socket/context、不启动 daemon、不读用户配置、不列举 images/containers，也未 pull/build/run/login。继续容器实跑需要父确定可用本机 socket/运行条件，不能静默改用远程 context。

## 官方约束核对（全部同日查阅；候选未构建）

- [Docker multi-stage](https://docs.docker.com/build/building/multi-stage/) 支持 builder→runtime 选择性 COPY，编译工具不必留在最终层。[官方 Node 镜像说明](https://github.com/nodejs/docker-node/blob/main/README.md) 给 Debian slim 变体；候选同一 Node22 Debian bookworm-slim 基础用于构建/运行，实施时固定实际 patch/tag+digest/架构，不把浮动22标签计作可复现 pin。本轮未拉镜像/确认digest。
- [Node 镜像最佳实践](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md) 支持 node 非root用户与直接 exec Node 的信号路径。不要用 shell/pnpm wrapper 吞 PID1 SIGTERM；Detuned 已有关闭链，不自行更换 shutdown。root阶段只准备文件ownership，运行非root，卷UID/权限需实测；不对宿主用户文件递归chmod/chown。
- [pnpm install](https://pnpm.io/cli/install) 的 frozen-lockfile 拒不匹配且不更新锁；ignore-scripts禁止依赖生命周期。固定项目 pnpm11.7.0，不能从滚动文档采用标注12.7才有的新allow-build flags。现workspace有 onlyBuiltDependencies esbuild/better-sqlite3、allowBuilds.esbuild 与 verifyDepsBeforeRun:warn；Linux冷安装下native脚本实际允许/获取方式需明确测试，不能假设 ignore-scripts 后有可用SQLite。
- [better-sqlite3 官方故障说明](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md) 指出 node-gyp 系统编译工具与平台安装问题。Linux目标必须在builder内生成/取得对应NodeABI+架构+glibc addon，不能 COPY 本机 Darwin node_modules；源码fallback常需 Python/make/g++。仅父明确批准的native构建可执行，不能借安装放开全依赖脚本。runtime须保Linuxnativeaddon与实际共享库，必须真实DB开闭验收。
- [Docker volumes](https://docs.docker.com/engine/storage/volumes/) 的独立持久卷保whole data-dir；TLS cert/key用[read-only bind mount](https://docs.docker.com/engine/storage/bind-mounts/)显式文件，不烘焙进COPY/ARG/ENV或构建context，.dockerignore应排私有data/certs/token/evidence。ro挂载不代替权限/信任验证，文件必须nonroot可读。CLI初次init与restore是显式临时命令、成功token只私有输出；普通启动不能每次自动init/覆盖或打印新secret。

## 三项需要父裁与建议

1. **实跑条件**：明确本机可用daemon socket或另一个已授权干净Linux执行环境；当前默认socket缺失，不自动启动/安装Desktop或访问用户context。
2. **构建/安装预算**：固定Node22 Debian slim patch+digest/目标架构、pnpm11.7.0及唯一native脚本授权；建议多阶段保相同glibc/ABI，原锁frozen，先允许必要builder工具与官方registry/native获取来源的有界预算，再真实冷安装/DBtest。workspace依赖可先保正确布局，不在未经验证时用pnpm deploy假定内部workspace产物均可搬移。
3. **部署配置与出口**：建议单Detuned进程、wholedata卷、固定trustedassets、显式TLS只读挂载、精确httpsorigin/端口和nonrootUID；本包TLS通过后再验证容器信号/health/普通human/Web、卷重启与offline新卷恢复。projectLICENSE/公开分发与D01/20client预算仍待裁，容器通过不等于公网CA/续期/model/所有平台认证。

仅上述报告/收据写入本包planning；未创建Dockerfile/compose、改依赖/install、运行容器或修改全局设置。


## 补充：官方已知本机 socket（独立收据，首结果不覆盖）

2026-10-09 查阅 [Docker Desktop Mac 权限说明](https://docs.docker.com/desktop/setup/install/mac-permission-requirements/) 的 `$HOME/.docker/run/docker.sock` 默认路径，以及 [OrbStack 官方 FAQ](https://docs.orbstack.dev/faq#cannot-connect-to-the-docker-daemon-at-unixorbstackrundockersock) 的 `.orbstack/run/docker.sock`。只 stat 两个确切路径与 `/Applications/Docker.app`、`/Applications/OrbStack.app`，四项均 ENOENT；未递归枚举 HOME、未读 config/context/credentials，也未启动应用。因为没有任何 socket 存在，没有追加 daemon API 请求；原空配置/env-i/8s version 方案保持备用。独立原始结果：[docker-known-local-sockets-receipt.json](docker-known-local-sockets-receipt.json)。

结论限于这两个官方路径及原 `/var/run/docker.sock`：当前没有可用明确 socket/daemon版本/架构证据。仍不能外推其它私有安装位置/所有容器后端均不存在；进一步路径或执行环境须父明确授权，不自动安装或遍历用户context。


## 最后一项：Colima/Lima 公开默认路径

`command -v` 确认 `/opt/homebrew/bin/colima` 与 `/opt/homebrew/bin/limactl` 存在；未执行 status/list/start 或读取 profile。依据 [Colima 官方 FAQ](https://colima.run/docs/faq/) 的当前 `~/.colima/default/docker.sock` 与旧版 `~/.colima/docker.sock`，以及 [Lima 官方 Docker example](https://lima-vm.io/docs/examples/containers/docker/) 的 docker instance `sock/docker.sock`、[官方 LIMA_HOME 默认](https://lima-vm.io/docs/config/environment-variables/) 为 `~/.lima`，仅 stat 三个确切路径，全部 ENOENT。没有可用 socket，故未发新 version API请求；独立收据：[docker-colima-lima-receipt.json](docker-colima-lima-receipt.json)。查阅日期2026-10-09。

至此停止环境搜索。已确认 Colima/Lima CLI 存在但这些公开默认 Docker socket 未存在；没有运行VM/安装/修改设置。若采用它们，启动哪一个私有/现有runtime与其数据保护边界由父另裁，不能把 CLI 存在或默认 socket 缺失当作全部后端状态证明。
