# 独立获取源码工作副本

仓库按用户要求保留完整跟踪内容，包括依赖、平台二进制、缓存、dist和历史。普通clone也会获取这些内容，.gitignore不会排除已跟踪文件。跨机器使用时，可新建独立的partial+sparse工作副本；以下命令只配置这个新副本，不修改原仓库、历史或全局Git配置。不要在已有工作目录执行sparse-checkout。

从不存在的新目录开始；服务端须支持partial clone。这里保留所有源码、测试、配置、锁文件、历史fixtures、examples/templates、scripts与Dockerfile，只不物化依赖、缓存、生成dist及临时工作/测试结果目录：

```sh
set -eu
GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 -c http.lowSpeedLimit=1024 -c http.lowSpeedTime=30 clone --filter=blob:none --no-checkout --depth 1 --branch main https://github.com/SakuyaInazaki/Detuned.git Detuned-source
cd Detuned-source
GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 -c http.lowSpeedLimit=1024 -c http.lowSpeedTime=30 sparse-checkout set --no-cone '/*' '!**/node_modules/' '!/.pnpm-store/' '!/packages/*/dist/' '!/modules/*/dist/' '!/scratch/' '!/test-results/'
GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 -c http.lowSpeedLimit=1024 -c http.lowSpeedTime=30 checkout main
```

本例读取公共仓库，禁用认证交互；每条命令临时指定HTTP/1.1与连续30秒低于1024B/s则失败的传输限制，不写Git全局配置，也不保证整个命令30秒内完成。超时/网络失败须明确停止，不能当已完整获取。首次默认网络传输曾停滞，恢复采用这些选项，不据此断言根因一定是HTTP/2。

`blob:none`推迟下载文件内容，sparse决定工作树物化范围；`--depth 1`仅取当前分支浅历史，需要历史时另行fetch。仓库远端的完整文件与历史未改变。Git官方建议通常使用cone目录模式，这里因须排除嵌套生成目录而使用少量固定non-cone模式；不启用实验性sparse-index。服务端忽略filter时可能仍传输完整对象，不能保证下载体积或时间；出现“filtering not recognized”等提示先核服务支持，不能把它误报为轻量下载通过。后续扩大sparse范围会按需下载对象。

在此新副本中按[README](../README.md)使用目标机器的私有Node/pnpm安装依赖和构建，不能使用仓库内Mac二进制。不要省略tests/fixtures、scripts/history-fixtures、examples、templates或Dockerfile；后端测试也使用历史与跨接口fixture。已有源码工作区不需要应用本指南，更不要为此删除、停止跟踪其依赖/缓存，或执行git clean。

官方依据：[git clone](https://git-scm.com/docs/git-clone)的--filter/--no-checkout/--depth，以及[git sparse-checkout](https://git-scm.com/docs/git-sparse-checkout)的set --no-cone与完整pattern规则。本指南只减少新工作副本取用范围，不发布另一份源码包，不创建release，也不改用户全局配置。
