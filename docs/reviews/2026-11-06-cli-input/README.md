# CLI JSON输入与幂等意图提示

任务M7.15依据用户提供的外部体验报告`gmn.md`。报告未给所用提交ID，本包以当前基线`ace87152`对照，不能将其标为报告当时源码版本。本包补显式内联JSON、shell安全输入说明及要求显式幂等意图的CLI本地提示；保留服务端权限、幂等域与原写入事务，不迁移仓库历史、不开发前端。

## 报告处置

| 观察或建议 | 处理与边界 |
|---|---|
| 历史审查材料导致完整传输很大 | [M7.14历史验收](../2026-11-06-first-run/README.md)已有轻工作副本导出与GitHub固定提交partial+sparse真实证据；仍保全部原仓库跟踪历史，保普通测试必需legacy fixtures |
| 远端没有rsync | 现源码指南使用tar与SSH，不要求rsync；不另装同步工具 |
| CLI缺key显示HTTP header错误 | 要求显式幂等意图的写入在发HTTP前指向flag/body/成对持久key；check自动key与非幂等命令各自契约保持 |
| 内联JSON与zsh数组括号难用 | 显式`--input-json`对象，与`--input`文件/`-`互斥；提供单引号及quoted heredoc stdin，不隐式猜文件名 |
| 系统Node26构建失败 | package engines为`>=22.19.0`；M7.14已验私有22.19.0/pnpm11.7.0固定路径，不冒称所有Node26均不兼容或全部受支持版本均已认证 |
| 发布后希望更清晰反馈关联 | 文档解释现有`relations`返回值；仅顶层refs创建关系，structured引用不同；固定旧修订合法，回执不承诺latest，不新增查latest HTTP或高亮UI |

输入主说明见[CLI写入](../../../examples/cli-writing-events.md)，固定环境见[环境准备](../../../examples/environment-setup.md)。本包决定已记录[决策说明](../../12-decisions.md)。

## 验证状态

当前状态为accepted_and_cleaned，功能、产物与清退已获主代理接受，实际数据见[结果记录](results.json)。主代理独立读取修前最终七项的原始JSON与退出记录：同一候选测试文件在基线7项全部失败，退出1、3.881秒；先前六项红例退出1、3.697秒，原件另保，不与最终七项累加。新增第七项覆盖内联选项缺值/空值/重复后非法值的净化、setup省略输入拒绝，以及publish/relate省略保持空对象而不读stdin。

候选九包build/typecheck/lint共27步骤均退出0，分别10.675、9.864、10.034秒；相关12文件61项全部通过，外层退出0、66.900秒。实际最终单次完整后端188个唯一文件、1141个唯一测试全部通过，0失败/待执行/todo，success=true，外层退出0、378.542秒；worker1、文件串行，原timeout与行为断言保持。相关测试覆盖key三路径与原优先级、check自动key/管理例外、20对象命令输入选项、setup与持久重放，以及既有固定关系回执；不将相关成绩累加到全量。

原文内联/quoted heredoc烟测只换SPACE/THREAD占位符，以环境提供URL和普通身份凭据，两条不同帖子正文中的数组和单引号逐字保留，relations均按示例为空；真实SIGINT完整关闭且退出0，共1.368秒，无模型调用。Arch未安装zsh，实际使用无用户rc的`/bin/sh`，不冒称zsh实测。主代理已独立SSH读取烟测、相关、27步骤及完整回归的原始JSON与退出记录。

运行环境为Arch Linux x64、Node22.19.0/pnpm11.7.0。本轮实际构建同步5项changed CLI dist，主代理独立核验最终14项源/test/dist/指南契约/package/lock字节一致；未生成checksum文件。报告第1/2/5项引用M7.14既有源码取用与冷工具链实测；本包未复跑完整冷起步和两身份旅程，不将历史成绩计作本包新测试。唯一自有根经root/marker/父目录身份再核、自有进程与嵌套挂载均归零后，以parent-dirfd/nofollow仅删除该根，退出0并即时ENOENT；操作者与主代理各自禁共享新SSH均确认同根不存在（errno2，退出0），清退闭合。

本机不安装、构建或运行测试；不启VM/容器、不调用模型、不改全局配置。外部报告的模型协作闭环只作为其观察，不升级本包宿主或科研收益认证。清退仅涉及本包唯一自有根；操作者与主代理的新SSH核验事实见结果摘要。

结果中的`evidence/`路径指当时本包自有临时验收根内的原始文件，主代理已直接读取；清退后不作为可下载交付，不交付原始token、数据库或日志，持久保留的是本页与结果摘要。

## 简明复跑

在目标机器的新工作副本按[固定环境](../../../examples/environment-setup.md)准备后，依次运行`pnpm build:backend`、`pnpm typecheck:backend`、`pnpm lint:backend`和`pnpm test:backend`。后者已固定worker1、文件串行。相关测试文件与精确命令见结果中的candidate_focused；原文两例用本人普通凭据和真实SPACE/THREAD替换占位符，按[CLI写入](../../../examples/cli-writing-events.md)执行，不重用旧token或验收数据库。
