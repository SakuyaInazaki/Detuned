# M0/M1-R4-C.3-GATE 交付与独立验收

父 Agent 已根据 [最终独立验证](../final-review/verification.md) 接受本有限收尾包：183/183正式测试、14文件、29/29命令，AC6/AD5/AE5/U8全通。原C.3的180/13/29通过事实保留；本轮从正式欠项与说明勘误出发完成定向修复，不重启B，不扩大到M2。

| 单元 | 所有权与完成行为 | 交付证据 |
|---|---|---|
| A Pi/client | adapter-pi schema准确局部类型；C03精确八组合、安装版校验后publish/relate真实执行、错误完整字段；C02真实退避取消、409正文中断禁重试 | [记录](pi-client/README.md)、before/after哈希及局部原始日志 |
| B 当前请求契约 | protocol共享现有政策、server最小接线、OpenAPI传输/安全说明；新G01–G04比较全部路由/body及代表HTTP边界；docs04/runtime与旧报告新勘误 | [记录](contracts/README.md)、[采集器](contracts/collect-route-policies.mjs)、[勘误](contracts/errata.md) |
| 独立验证 | 产品/测试停写后构建并统一全量回归、实际路由采集、历史/冻结/源码完整性 | [verification](../final-review/verification.md)、[commands](../final-review/commands.json)、[integrity](../final-review/integrity.json) |

工作方式由用户授权GPT-6.1子Agent，父Agent负责方案与最终门禁；没有让论坛启动Agent或模型。A局部首次沙箱EPERM、随后新增relate测试返回结构预期修正均单独保留，不作为产品故障；最终验收使用stable-before/after版本，不使用协调中的pre-stable运行替代。

原C文件合并两个命令用例为一条完整八组合，27变26；新增路由文件G01–G04共4项，所以全套180→183、13→14。详细逐文件数与采集表见 [覆盖核对](../coverage-audit.md)。最终只在本机锁定Node26.3.0/pnpm11.7.0环境验收；Node22、干净安装、远程CI、真实四宿主与模型未测。M2.1是下一包，M2/Web/正式评审等规划能力未交付，不宣称完整v0.1/v0.2可用。
