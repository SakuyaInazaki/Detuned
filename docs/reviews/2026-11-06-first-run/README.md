# 首次运行、源码取用与诊断

任务M7.14依据用户提供的外部首次协作报告`cld-fable.md`，修复可复现的安全诊断缺口，并补全从系统Node开始的私有工具链、固定版本/当前工作区轻量源码流程及CLI/MCP操作说明。报告描述的模型会话属于外部观察，不能代替本次独立验证。

## 行为与入口

- [环境准备](../../../examples/environment-setup.md)：固定官方Node22.19.0与pnpm11.7.0，无Corepack/latest、全局安装或profile修改；新私有目录失败不覆盖重试。
- [源码取用](../../../examples/source-checkout.md)：GitHub固定提交partial+sparse，或tracked当前工作树字节导出加显式untracked include；保普通测试必需的legacy fixtures，原完整仓库历史不改。
- [操作对照](../../../examples/cli-mcp-operations.md)：CLI read四种kind与MCP独立读取入口；[SSH路径](../../../integrations/codex-claude.md#claude-通过-ssh-运行远端桥)区分本地启动器和远端wrapper/token/Node。
- [正式评审](../../../examples/review-cli.md)：恰好N名合格actor、冻结材料贡献者集合、submitted_count与封存边界。诊断实现和具体回归以候选代码与实际验证记录为准。

## 报告问题处置

| 外部观察 | 当前处置与证据边界 |
|---|---|
| MCP kind/body被吞、proposal落成note | 报告无原始调用payload，不能重建当时层级；真实SDK的flat/wrapped两模式均保存合法kind、正文与structured，畸形层级拒绝且无写入；未复现原指控，不猜测归因 |
| validation仅path/rule，缺预期形状 | 补安全expected_type，固定输出字段白名单，核对敏感字段不泄漏 |
| revision/expected_version似乎仅接受字符串 | 真实SDK两模式证明JSON整数可用、数字字符串被拒；CLI命令行参数另行解析，不改协议为字符串 |
| read kind比MCP少 | 保既有API，单独提供操作对照，修正用户入口 |
| proposal structured似乎不校验 | 真实SDK两模式均拒绝proposal的空structured且无写入，补防回归，不宣称修复不存在的豁免 |
| 隐藏正式评审条件 | 明确贡献者集合与恰好N人；安全诊断不返回封存身份或内容 |
| failure两个示例含义模糊 | 并列unverified与provided入口，provided须真实固定证据 |
| status缺submitted_count、snippet显示b标记 | 指向review_request计数，避免为进度读封存意见；说明snippet是原始高亮数据 |
| SSH两端路径混淆 | 本地ssh绝对路径、主机别名、远端wrapper及其资源逐项列明 |
| 工具链缺从零路径、Corepack默认版本问题 | 新prepare-tools脚本使用私有Node自带npm精确安装，不依赖系统pnpm/Corepack |
| 当前工作区全量archive过大 | 新export-source复制受控轻量文件集合，不修改完整跟踪内容；保测试引用的legacy fixtures |
| 最快开始平台语义模糊、README臃肿 | 根入口收缩，先确定服务机器，安装与故障排查独立成指南 |
| 同OS用户无token隔离 | 保持明确限制；普通独立论坛身份不冒称OS隔离，不自动建立沙箱 |

## 验证状态与限制

主代理已核验[独立结果](results.json)。实际导出的轻量候选副本最终单次后端187文件1134项全通过，0失败/待执行；原有timeout与竞态断言保持。修前两文件16项中14通过、2失败，分别证明expected_type与正式评审静态资格诊断缺口；候选相关8文件42项全通过。MCP合法kind/body、整数和封存原有行为仅补回归，不冒称本次修复了报告无法复现的归因。

从系统Node26.11.1、无pnpm/Corepack的空私有环境开始，固定工具冷安装32.387秒退出0；前缀含空格与单引号，打印的准确命令实际执行得到Node22.19.0/pnpm11.7.0。真实GitHub固定提交79e23bec的partial+sparse取用14.103秒退出0，必需文件无缺失、排除文件未物化、两项legacy fixture保留。叠加明确候选修改与六项显式未跟踪文件后，以系统Node导出583个文件；没有复制平台依赖或审查历史主体。

该导出副本使用新私有工具与依赖，frozen install72.803秒、esbuild重建0.615秒、九后端build10.822秒、typecheck10.022秒、lint9.951秒均退出0，未借用基线依赖。原文init、前台serve与setup成功；两个不同普通身份的四次me/spaces读取前后全表计数不变（不扩称所有行字段不变），SIGINT完整关闭并退出0，smoke共1.335秒，无模型调用。

脚本四项边界在Node26与固定Node22各自4/4通过，独立于Vitest1134项，不累加计数。覆盖当前dirty字节、删除不复活、显式include、历史fixture保留、固定排除、输出覆盖/路径逃逸/符号链接拒绝及确定性读取中变更拒绝。最初一次检查因源码overlay尚未完成而找不到脚本，退出127；保留为编排准备错误，不计产品修前红例。

最终构建的608项已跟踪后端产物中601不变，仅同步7项对应诊断修改的dist，无新增模块，Web未变。主代理独立核验23项源/test/fixture/config/dist字节绑定；操作对照最后修正spaces为space list，仅作源码逐项静核与实际built help核验，不声称整表业务均实跑。唯一自有验收根经身份、marker、自有进程与挂载归零检查后已清退；操作者重连与主代理独立禁共享新SSH均确认该目录不存在（ENOENT/errno2，退出0），清退闭合。

只使用Arch现有主机上的唯一自有有界目录；不使用VM、容器守护进程或Colima，不改模型/全局Agent设置，不进行前端开发。没有在Mac安装、构建或运行重测试。平台分支存在不等于全部平台认证。轻量工作副本不是历史证据归档替代品；旧fixture显式再生成仍可能要求完整历史。
