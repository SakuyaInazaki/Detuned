# 获取独立源码工作副本

仓库按用户要求保留完整跟踪内容，包括依赖、平台二进制、缓存和历史审查。普通clone或`git archive HEAD`可能包含这些大文件；以下只减少显式新工作副本，不删除原仓库内容、不改ignore、不重写历史。安装构建都在运行服务的目标机器完成。

## 使用当前本地工作区

在已有完整仓库根目录，用系统Node即可导出（不要求已安装依赖或已构建）：

```sh
node scripts/export-source.mjs --output "$HOME/Detuned-source-new"
```

目标必须为不存在的绝对目录，父目录已存在且由本人控制，且位于仓库外。复制默认只覆盖Git跟踪文件的**当前工作树字节**：包括已修改/已暂存文件，已删除文件不复活；这不是HEAD快照。导出时停止编辑源码，脚本在逐文件读取前后检查身份、大小与修改时间，检测到变化即失败；仍不提供跨文件原子快照。新副本没有.git，不适合原地提交推送。原仓库仍是完整历史的唯一来源。

尚未跟踪但确需传输的源码，逐项显式加入，例如：

```sh
node scripts/export-source.mjs --output "$HOME/Detuned-source-new" --include scripts/new-helper.mjs
```

include可为相对文件或目录，须先检查其中无凭据；不自动收集未跟踪或忽略文件。路径禁止绝对路径、`.`/`..`与符号链接；任意剩余符号链接（含祖先目录）都会停止。固定排除规则不能被include绕过：任意node_modules、.pnpm-store、dist、.git、AppleDouble，根scratch/test-results，以及docs/reviews主体。保留整个`docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/`，普通typed-write回归直接导入其中legacy代码。

其余跟踪源码、配置、锁文件、tests/fixtures、scripts/history-fixtures、examples、templates、Dockerfile和已有Web源码均保留。脚本不生成校验/manifest文件、不执行hooks或帖子。失败后仅保留它刚创建的partial输出供检查；重试换新目录，不覆盖旧输出。

跨机器可把**这个轻副本**流式传输，不先archive完整仓库。先在远端创建一个不存在的新目录，再在本地执行（替换受信主机、两端绝对路径）：

```sh
ssh -T -o BatchMode=yes YOUR_TRUSTED_HOST 'umask 077; mkdir /ABS/remote/Detuned-source-new'
```

```sh
set -o pipefail
COPYFILE_DISABLE=1 tar --no-xattrs -C "$HOME/Detuned-source-new" -cf - . | ssh -T -o BatchMode=yes YOUR_TRUSTED_HOST 'tar -xf - -C /ABS/remote/Detuned-source-new'
```

第二块发送端为macOS bsdtar，`--no-xattrs`已在本机bsdtar3.5.3只读核对支持，配合COPYFILE_DISABLE避免AppleDouble和扩展属性噪音；Linux发送端先核tar支持此选项，不支持时省略该发送端选项，接收端不需要Mac参数。第二块使用bash或zsh的pipefail；任一端失败都须停止，不把不完整副本当成功。SSH主机名在本地解析，mkdir/tar的路径在远端解释；所有目录由本人控制。不接受未知host key，不传token。传完按[环境准备](environment-setup.md)安装目标平台依赖。

## 获取GitHub固定版本

在新目录执行以下命令。`sourceCommit`替换为明确要使用的**完整40位提交ID**，该提交必须已在远端存在；本地未推送修改应使用上面的工作区导出，不能把main称为当前本地版本。

```sh
set -eu
sourceCommit=REPLACE_WITH_FULL_40_HEX_COMMIT
case "$sourceCommit" in *[!0-9a-f]*|'') exit 2;; esac
[ "${#sourceCommit}" -eq 40 ]
GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 clone --filter=blob:none --no-checkout --depth 1 https://github.com/SakuyaInazaki/Detuned.git Detuned-source
cd Detuned-source
GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 fetch --filter=blob:none --depth 1 origin "$sourceCommit"
git sparse-checkout set --no-cone '/*' '!**/node_modules/' '!/.pnpm-store/' '!**/dist/' '!/scratch/' '!/test-results/' '!/docs/reviews/' '/docs/reviews/2026-10-03-m2-2-a/implementation/core/fixtures/'
GIT_TERMINAL_PROMPT=0 git -c http.version=HTTP/1.1 checkout --detach "$sourceCommit"
[ "$(git rev-parse HEAD)" = "$sourceCommit" ]
```

这只改变新副本配置。filter推迟下载blob，sparse减少物化，浅历史不包含全部历史对象；Git服务端不支持filter时仍可能传输大对象，应停止核对而非声称轻量成功。网络错误明确停止；再次操作前先检查已有目录。不能在原工作区直接执行这组sparse命令。

轻副本保留普通回归所需冻结fixtures；显式**再生成**旧fixture可能还需要完整Git对象和被省略的原审查证据，须回到完整原仓库执行其配方。轻副本不是历史证据归档替代品。

官方规则：[git clone](https://git-scm.com/docs/git-clone)、[git sparse-checkout](https://git-scm.com/docs/git-sparse-checkout)、[git fetch](https://git-scm.com/docs/git-fetch)。
