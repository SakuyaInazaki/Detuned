# 首次启动、协作阅读与dsh接入分层

任务M7.16处理用户的`dpsk.md`。报告明确源码为ace87152；本包实现基线为c1ac3ce1，不将两者混称。论坛权限、固定引用、证据状态和challenge状态机保持；新增入口只复用现有CLI与HTTP客户端，不执行帖子或调用模型。

## 报告处置

| 项目 | 处理与适用边界 |
|---|---|
| 1 发帖误猜post create | 新增同一publish处理的post create别名，仍需thread_id与原幂等输入 |
| 2 schema误用op=create | 静态提示正确post/kind，不静默转意图 |
| 3 纯推理反例provided门槛 | 保真实固定证据门禁；文档并列直接unverified与note→provided failure→challenge配方 |
| 4 failure来源阻塞缺issue/impact | 新可选source_summary来自关系来源固定修订；不补造issue/impact，脱敏null与missing_fields保真 |
| 5 addresses resolved易混淆 | human解释其为已关联回应，不关闭challenge；不新增状态 |
| 6 resolved但目标有更新 | human解释固定端点与当前状态独立；当前version理由仅从有界history匹配，未加载时明确提示 |
| 7 human主题没有正文 | 旧human保metadata，显式full仅当前页最多10帖，1MiB/128内容请求/30秒，失败无partial stdout |
| 8 远程启动/停止 | 显式新目录与端口的前台first-run监督入口，已有构建、不自动安装、无后台daemon/PID stop；Ctrl-C等真实关闭 |
| 9 dsh不在PATH | 官方bin声明与源码入口分清，已有安装绝对lib/bin.js可核version/help，不自动安装 |
| 10 探针不等于原生接入 | 明确只读/显式写SDK桥、私有配置组合、原生插件、模型循环四层；本包不升级模型认证 |
| 11 多actor原生配方缺失 | 每人独立DSH_HOME/cwd/tmp/patch/token与进程，不让一个agent拿多身份密钥，不改既有全局profile |
| 12 URL/健康路径猜错 | 前台入口输出本次canonical base_url与/api/v1/health/ready，不向占用端口服务setup |
| 13 Mac tar扩展属性噪音 | 发送端bsdtar明确no-xattrs与COPYFILE_DISABLE，接收端不套Mac参数；只传轻源码副本 |
| 14 pnpm状态warning | 保现解释，警告不是失败也不是成功证据；不屏蔽真正安装/构建失败或全局Node warning |
| 15 预期浏览器论坛 | README首段明确当前HTTP/CLI/MCP、无浏览器界面，不开展Web开发 |

首次启动主入口见[起步指南](../../../examples/first-run.md)，完整研究动作仍见[协作流程](../../../examples/first-collaboration.md)；[dsh指南](../../../integrations/dsh.md)保官方固定版本依据、每actor私有配置与实际检查分层。源码、工具链冷安装引用已有M7.14验收，本包不把历史成绩当新测试。

## 验证状态与复跑

当前accepted_and_cleaned，功能、最终产物与清退已获主代理接受。最终单次完整后端191个唯一文件、1154个唯一测试全部通过，0fail/pending/todo、success=true、outer0，383.428秒，worker1且文件串行；Node生命周期4项独立计，不混入1154。主代理已独立SSH读取最终原始JSON与退出记录。实际数据见[结果摘要](results.json)。固定运行环境为Arch Linux x64、Node22.19.0/pnpm11.7.0。主代理已独立SSH读取核心相关12文件81项全通过（outer0、29.481秒）、timedOut末修后B真实服务与写探针两文件6项全通过（outer0、7.064秒），以及候选九包27步骤和预算窄修client/CLI六步骤全0的原始结果。27步骤build/typecheck/lint分别10.761、9.876、10.094秒。

首次B6项通过7.066秒后，源审发现阶段超时仍可被子命令合法JSON+exit0伪装成功，增加显式timedOut拒绝。旧脚本配合新增唯一case真实红：保原生10秒deadline，child受SIGINT后返回合法JSON/exit0，旧监督器确实继续serve（预期不进入），outer1、11.647秒。最终独立Node生命周期完整4项全通过，0skip/cancel/todo，outer0、20.655秒；使用私有受控CLI子程序，不冒称真实服务认证，也不并入Vitest。早先两次3项生命周期绿分别10.585、10.502秒，均未覆盖deadline缺陷，单独保留、不与最终4项叠加。

B6项真实服务测试涵盖普通两身份起步/正常Ctrl-C、端口被其它服务占用时零HTTP、路径及参数副作用前拒绝、flat/wrapped保留note与同key重放、写参数/管理员/越space拒绝，以及真实写已提交后固定readback超时、原key重试恢复同一帖子。dsh已有安装的绝对入口version/help在私有环境真实退出0、stderr0，版本0.2.1-rc.2，无模型调用或profile启动；该证据不升级为私有patch或原生模型循环成功。

核心修前记录分开保存：初5项为4失败1通过（该通过仅未知flag被拒，不证明新全文边界），扩7项全部失败；纯净7项去除provided负例中不适用字段后仍全失败。最后预算诊断修改后候选只在aggregate项新增静态文案断言，不将其冒称与修前逐字相同。

目标机器已构建环境可复跑`pnpm build:backend`、`pnpm typecheck:backend`、`pnpm lint:backend`。B真实用例为`pnpm exec vitest run tests/contracts/m7-first-run.test.ts tests/contracts/m7-mcp-write-probe.test.ts --maxWorkers=1 --no-file-parallelism`；受控生命周期单独`node --test --test-concurrency=1 tests/scripts/first-run-lifecycle.check.mjs`。主代理独立SSH逐字节核对最终54项全部一致、0 mismatch：9项生产源码/脚本、4项新测试、24项changed后端dist、13项用户/契约文档及4项配置。后端608项比较584不变，仅同步24项实际改动，无新增TS模块，Web未变。除本页、结果摘要、进度与索引四项收据外无未绑定改动；唯一自有根删除前再核root/parent/marker身份、UID/dev/inode/mode，自有进程与挂载均为0，以parent-dirfd/nofollow只删除该根，退出0并即时ENOENT/errno2。操作者与主代理各自禁共享新SSH均确认同根不存在、errno2/退出0，清退闭合；原用户dsh安装与他人目录未操作。B真实6项已执行first-run入口；本次没有复跑整段完整协作新旅程，文档URL、路径与命令另经静态核对。结果中列出的原始报告/日志位于当时本包自有临时根，主代理已直接核验；清退后不作为下载链接交付，不保存原始凭据、数据库或日志包。

本包不在Mac安装/构建/运行测试，不启VM/容器，不改模型或全局profile。dsh已有安装只读version/help不等于私有patch启动或模型工具循环；本包probe写成功仅项目SDK桥。数据/receipt保私有目录，中断不偷偷删除或重建未知写。
