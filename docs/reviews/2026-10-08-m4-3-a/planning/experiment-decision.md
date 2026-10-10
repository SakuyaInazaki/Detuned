# 父选择第二关准备 2a

明确允许owned源码目录原workspace+原lock依赖安装，不允许root build/test/native/desktop或任何lifecycle脚本，不改主Detuned依赖。暂不运行第三方官方代码/CLI/model；2b待父具体批准。

命令：`pnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile --registry=https://registry.npmjs.org --store-dir=<author/runtime/dependencies-path.txt所记新ownedstore> --fetch-retries=1 --fetch-timeout=60000`，cwd仅固定checkout。

最小显式env：PATH工具路径；npm userconfig/globalconfig=/dev/null；XDG cache/config/data、store均owned；Git系统/用户配置禁用、helper空、终端prompt/askpass禁用。无HOME/CODEX_HOME重设，无model/forum/user token。公共registry/artifacts网络可require_escalated；拒绝即停报，不绕行。

单次安装10分钟墙钟/新增owned目录2GiB停止；监督器≤20s检查，记录child PID/真实exit与预算结果，超界只终止本次owned进程组，保日志不重试/不升级/不改lock。监测不是OS硬磁盘quota，瞬时增长可能跨越检查间隔。

安装结束核所有tracked source/lock与before SHA，记录实际产物/资源；ignore-scripts下native/esbuild等未build是准确限制，不自动启scripts修复。父再依runner与官方tests事实定2b，不因install成功就称MCP宿主认证。

## 父追加 attempt2 决策（首轮证据保持）

C已确认首轮source/lock/主仓保护与PGID清退；父准同checkout/store、同frozen/ignore-scripts/ignore-pnpmfile/registry/最小env/版本参数再一次安装，复用缓存，不清空重装。原before基准195047424B不变，累计新增总预算6GiB（6442450944B），不是额外6GiB；最低剩余空间6GiB，墙钟10分钟，≤20s监督。新attempt2 receipt不覆盖首轮，任何失败不自动重复。

容量核查时available约11.06GiB、已新增约2.35GiB，6GiB总预算尚有约3.65GiB余量，在量级上可容许，同时守6GiB可用空间底线；不保证网络/大artifact必成功。只杀本次owned组，网络仍public-only审批。完成后核真实exit/source/lock/linked版本，2b官方执行继续等待父具体范围。
