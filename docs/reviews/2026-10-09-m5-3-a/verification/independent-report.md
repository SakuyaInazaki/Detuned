# M5.3-A 独立验收

有限 Linux arm64 容器交付、D01 固定演练与最终 runtime 的 HTTPS/持久卷恢复范围通过。Linux 核心结果是 **699 tests / 105 files 组合通过**，不是最终版本一次整套全绿；本包未重新运行 Mac current29，也未把 Node HTTP 结果当作浏览器验收。

| 实际执行 | 结果与版本覆盖 |
| --- | --- |
| 作者完整 Linux workspace build | 第三次 exit0 / 129.563s，完整输出独立核读；407 packages frozen install 32.1s，仅 esbuild postinstall，SQLite native 真开闭；健康辅助器修复后仅 COPY 层 1.911s，未重装或重编译 |
| Linux typecheck / lint | UID1000，首次均 exit0，实际 gate 15.236s / 14.448s；依赖状态 warning 如实保留 |
| Linux core 首次 | exit1，686 pass +13 fail /699，102 pass +3 fail /105 files，248.40s，无 timeout；仅两个 Mac 绝对临时目录与一处根目录 Ajv 解析错误 |
| 三受影响正式文件复验 | exit0，38/38、3 files，12.39s；补回13失败，保持原全部业务断言，未重102成功文件 |
| D01 最终 v2 + 独立只读 preload | exit0，27.478s；20进程阶段25.724s；29 child 最终6自然exit0、23 SIGTERM，零SIGKILL |
| 最终 runtime 真容器 | 第三次 transport 已通过 + 第四次 remaining-only exit0；实际 Docker stop/start、默认 origin 健康、离线新卷 restore 全通过 |

原始完整 stdout/stderr、exit/argv/计时见 [gate summary](gate-summary.json)、[完整输出哈希审计](complete-output-audit.json)、[build 输出核读](build-output-audit.json)。Linux 首整套 [stdout](gates/linux-core-first.stdout.log) / [stderr](gates/linux-core-first.stderr.log)、[定向 receipt](gates/linux-core-targeted.receipt.json) 保留真实失败及修正组合。最初 driver 的流式 command.stderr_sha256 错误地绑定空 capture buffer；审计明确以完整实际日志文件 SHA 为准，历史 receipt 未改写。

执行绑定为 builder `sha256:c085ace64bf18dead58e77bdfdf6046bfe3b1897d53b356dd6da653d47f313ef` 与最终 runtime `sha256:2190f6a9739816322aee3164691acc2ec53d70da7dd7f7801ce2892fa43fcbc2`。官方 Linux arm64 platform digest `b20fe038d9592822dd534600a1ddf467e985178aa3fed60ec441a056c2cc45bd` 的实际 Node 是 v22.23.3、pnpm11.7.0。最终 runtime UID1000，实际 PID1 为 exec Node CLI；SQLite native 与整个核心套件在 Linux 实际运行。完整冷构建前两次工具失败（unsupported progress flag、重复 npmrc 路径）及 inspect 模板失败原证据保留。最终 .dockerignore 加强秘密排除是在原构建之后，不能冒称原构建已经使用最终排除字节；最终 health helper 已通过独立 COPY 层进入该绑定 image。Vite chunk、下载慢与 pnpmfiles 警告未隐藏。

D01 A v2 的停服重启 oracle 在同一空间逐集合核 posts/revisions/events/post.create idem/relations 前后相等，原4/4/9/4/2集合保持；C persistent key 重放只对应一帖子、一事件、一幂等结果。真实 C 通过 search 和固定版本读取两份材料，再写预设改进模板及有来源非正式汇总：这是材料接续固定演练，没有模型或独立科研推理。真实 server 与 C worker 均有新 PID，原 pending batch/events 不变，只有明确 ACK 才推进；附件完整 SHA/bytes、恢复后的同 actor 新 scoped credential、旧 token 拒绝与旧签名 ACK 拒绝均通过。

20 clients 是 **20独立进程共用普通C身份**。独验 preload 只在 A 自有目录 finally rm 前对源和恢复 SQLite 做短只读事务：两库 smoke 均21帖子首修订、21全部修订、21 post.created events、21 post.create idem（帖子数以每post唯一revision1投影，依存库post外键及backup/restore有效性，未声称该项直接COUNT posts），其中 race key各1、unique titles20。原 rm 始终执行，观测不改变业务、重试或时钟。首 preload 把 title 错投影到 posts，且抛错挡住作者最终 receipt，故首次不能推断 D01 原结果；完整失败/首源码保留。修正为实际 post_revisions 投影并先对真实 schema 核7查询后，只复验该窗口；最终作者 receipt 完整，[Linux D01 receipt](gates/linux-d01-second.receipt.json) 含真实全部 child exit/signal 和独验计数。

最终 runtime [第三次 transport](runtime-third.receipt.json) 独立证明 strict CA、错误 CA (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`)、错误 hostname (`ERR_TLS_CERT_ALTNAME_INVALID`)、匿名真实 bundle 两资源、普通 human HTTPS cookie 登录/固定正文/单次写入/CSRF拒绝/退出后旧 cookie401，Cookie Secure/HttpOnly。没有浏览器、系统信任或宿主 profile 改动。[第四次 remaining](runtime-fourth.receipt.json) 用真实同容器 Docker stop/start（StartedAt变、自然exit0，stop73ms）验证 pending/业务 key 与完整附件持久；没有以同容器子进程重启替代容器重启。

默认 `https://localhost:8443` authority 与 `https://127.0.0.1:3000` 连接分别验证：镜像内原生 health helper strict CA 成功，正确 HTTP Host200、错误Host403，错误CA/hostname仍拒绝。TLS servername 与 HTTP Host 不能互相替代。停服离线 backup 后，在独立新 named volume 的不存在目标 restore；旧凭据401、旧签名ACK409，新凭据同actor、新签名 pending、显式ACK与附件SHA正确，业务对象不重建。disabled actor 来自仅 owned offline DB 的 synthetic 历史 seed，恢复后未激活，不能称公开API禁用流程演练。

自有 runtime 失败永久保留：首次 Docker stdin 参数缺失；第二次登录status夹具错用200（真实契约201）；第三次误比较重签 cursor 原文；第四次只执行剩余组。修正 cursor 检查验证当前私有 secret、相同 binding 与 batch/events，而不是要求 exp 原文不变；第四次 expiry_changed 实际为 false，未声称观察到了变化。四轮31个登记 container/volume资源均清退，六个 builder 测试容器也已清退；[最终只读资源检查](resource-final-check.json) 自有前缀 containers/volumes 都空。D01最后目录和29child清退，测试私有证书不进repo/日志/image。owned VM及bound images是等待根决定的故意保留环境。

源码差分审阅核了 Dockerfile 固定平台/全Linux闭包/nonroot exec、compose whole-data与readonlyTLS、健康HTTPauthority/TLSname/CA分离及所有origin输入拒绝、manual-only workflow无push；A源审首健康Host阻断由root授权COPY修闭。D01 v2实质oracle修闭，三旧fixture可移植性差分只改 tmpdir 与现有compiler依赖链。没有其它产品 API/下层业务改动；不能声称 GitHub workflow已执行或完整 docker compose CLI 编排已实跑。

[完整保护结果](integrity-final.json)：8055旧review、4 SQL/archive、2 schema、HEAD、lock `ea84a3709fe9a54b1a1fb1e0e9403ab9fd6e363ed8a3ecf7ba0cbf536be94f4f`、208 tracked +263 untracked宿主dist、59当前规范及5入口均未变。322原source中仅根批准三fixture变化；[supplement-before](supplement-before-manifest.json) 是失败后取得、哈希精确命中fresh的原字节，不冒称开工前copy。37 fresh exact-before副本和当前原路径均匹配。A v2三文件/B七文件/portability三文件冻结哈希全匹配，git diff --check0。新包装/脚本8源码路径、2示例属于授权集合；optional helper不存在而未造placeholder。

Mac TLS的699/105/current29仅作为已接受历史基础复用；Linux四gate的build来自真实作者全构建，type/lint/core由D真实执行，core以限定组合收口。旧current25未打包进image或Linux重跑，旧浏览器、600秒性能、跨架构、公网部署、GitHub CI与模型评估都没有在本包执行。下一动作应由根根据这份有限验收决定；尚未改当前metadata或开启下一fresh。
