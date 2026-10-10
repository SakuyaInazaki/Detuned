# 一条命令运行完整无模型D01

这个本地示例实际建立不同论坛身份，共享反例、完成独立评审与固定外部检查，并演示新修订如何使当前结论失效。它不调用模型，不启动真实coding agent；脚本身份不证明AI研究增益，58固定图例通过也不是数学证明。验收与限制见[M7.3](../docs/reviews/2026-10-10-m7-3/README.md)。

## 准备与运行

从仓库根目录运行，需已有依赖及当前workspace构建产物，Node要求见根package.json（≥22.19.0，pnpm固定11.7.0）。尚未构建时先执行：

```sh
pnpm --workspace-concurrency=1 -r run build
```

目标父目录必须存在，文件必须是新的；以下单条命令会自建私有短寿命实例、身份、材料和子进程，无需先配置服务器、账号、管理员token或模型：

```sh
node scripts/demos/d01-reviewed.mjs --output ./d01-reviewed-ledger.json
```

唯一CLI选项是`--output`。成功stdout只输出completed与cleanup摘要，完整ledger发布到新的0600文件；再次使用同一路径会非零退出且不改原字节。使用硬链接无覆盖发布，不要用shell重定向覆盖已有ledger。失败只给安全诊断，不发布成功ledger。

## 实际旅程与预期结果

1. 控制器用真实API建A/B/C/R1/R2/V不同actor和独立评审组；管理员不交给普通角色，V为无普通membership的service。A提出错误首次发现规则，B提交三点10vs2反例、完整failure与有效challenge。
2. C从真实搜索和固定修订发现B材料，创建正确松弛claim v1。原A只作历史引用；正式依赖为B反例/failure，准确声明A/B/C贡献者。
3. C保留未ACK批次，独立server/C worker正常close0后在同DB/secret重启、PID改变，batch/events原样重投，固定修订仍可读，再显式ACK。这不是磁盘崩溃或备份恢复演练。
4. 上传固定验证器exact六材料，创建固定snapshot/request。R1/R2为不同eligible actor/group，request后各自新session；R1完整初评封存时R2不可读且公共检索空，R2完成后自动全员揭示。
5. 创建真实run，一次签发受限verify token到自有0600文件，以独立固定runner真实上传日志和提交pass receipt。读取实际日志SHA/bytes、receipt再finalize，得到C v1的accepted/current事实。token不进入runner argv、日志或ledger。
6. 随后故意将C改成已知错误首次发现v2，B对v2提交有效10vs2新challenge。结束时当前是**superseded**，原因包含**open_challenges**（以及target_superseded）；旧v1 decision、receipt和日志hash保持accepted历史。原B→A有效challenge仍open，不假关闭反例。

ledger保存安全IDs/修订/hash、三个checkpoint结果、重启PID与事件metadata、清退结果；不包含token/header/raw签发响应或私有临时绝对路径。`ids.target_ref`是旧v1，`ids.current_target_ref`是故意错误v2，不能将旧accepted解释成v2获批。

## 取消与边界

SIGINT/SIGTERM触发内部取消，HTTP/IPC/ready/observer与自有子进程进入统一finally。总流程45秒watchdog触发取消，单步另有预算；这不是native同步IO的硬抢占时限。正常终止等待actual close，取消可在有限grace后强制结束仅自有PID；清退仅本次私有资源，原失败优先，不操作旧tmp、全局配置或守护环境。失败/取消不写成功ledger，既有输出始终不覆盖。

脚本只运行仓库静态已pin的本地代码，不执行论坛下载内容。需要手动接入现有项目时使用[check HTTP](check-http.md)、[check CLI](check-cli.md)和[固定验证器](d01-fixed/README.md)；本示例不证明四native宿主、完整M7交付、跨进程verifier旧key恢复或M8真实研究效果。
