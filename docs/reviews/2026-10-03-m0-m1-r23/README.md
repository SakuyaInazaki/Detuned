# R23：C.3-GATE 验收与 M0/M1 收尾

**父 Agent 验收结论：C.3-GATE 通过；M0/M1 当前核心与 C 工程验收通过，B 继续保持验收。** 本机锁定环境独立验证 **183/183 正式测试、14 文件、29/29 既有命令** 全部通过；AC 6/6、AD 5/5、AE 5/5、U 8/8。实际路由采集器核对 **32 操作、19 body schema**。下一阶段为 M2.1 附件；M2 尚未实现，不宣称完整 v0.1/v0.2 可用。

## 审查与修复经过

原 [C.3 交付](../2026-10-02-m0-m1-r22/implementation-r4-c3/README.md) 的180项/13文件/29命令通过属实，R22-F01/F02/F03三组功能修复接受。本轮原交付复跑证据封存在 [verification](verification/verification.md)。[Pi/client 审查](pi-client/findings.md) 和 [契约审查](contracts/findings.md) 确认有限出口仍缺正式断言、共享请求约束、完整路由政策采集及准确说明；没有把这些缺项抹去，也不将分表说明错误称为新产品故障。

用户授权使用 GPT-6.1 子 Agent，父 Agent制定方案并负责最终验收。两个子 Agent按文件所有权定向完成 [C.3-GATE](implementation-c3-gate/README.md)：单元 A补 Pi 精确输出、验证后执行、错误透传与真实退避取消；单元 B复用当前请求政策并新增完整路由正式契约。独立验证 Agent在产品/测试停写后重新构建并统一验证；这属于本轮开发授权，不改变论坛核心自身不启动 Agent、不调用模型的边界。

## 已关闭的有限要求

| 项目 | 最终验收依据 |
|---|---|
| R22-F01 Pi写入 | schema运行时保真，准确官方SDK类型边界；八工具、七union分支正反例；publish及relate经过安装版0.87.1校验再在临时服务执行 |
| R22-F02正文生命周期 | 200/409正文兑现后取消/timeout优先、200传输中断与恢复、永久TLS白名单、坏JSON禁重试；409正文中断保留HTTP DetunedError/status且不重试 |
| Pi与退避正式补项 | 两命令八输出组合精确内容/级别/渠道隔离；注册工具坏JSON与409完整字段；进入真实backoff后取消及资源归零 |
| R22-F03与完整当前契约 | 共享现有范围/默认/枚举/非空政策，32 method/path与全部19 body正式结构比较；CSV/未知重复query/no-body/认证/header/poll说明与代表HTTP断言 |
| 交付准确性 | 最终按真实输出统计；最低支持与实际Node分离；新采集器与政策表；[C.2/C.3新勘误](implementation-c3-gate/contracts/errata.md)，历史原文保留 |

## 证据与完整性

- [最终独立验证](final-review/verification.md)、[29命令记录](final-review/commands.json)、[正式测试原始输出](final-review/observed-tests.txt)、[准确覆盖及32操作表](coverage-audit.md)。采集器另行通过，不计入29命令。
- 最终源码基线为HEAD `b8dacd56779a007a2e7045b682bca0c036fdfc44` 加未提交工作；[stable-before](final-review/stable-before.json) / [stable-after](final-review/stable-after.json) 是最终验收快照；pre-stable材料保留但不作最终基线。
- [integrity](final-review/integrity.json)：96项产品/测试/配置/材料验收前后无改变；1336项历史审查材料无改变，冻结SQL与archive原字节保持，HEAD不变。最终build更新6个既有dist文件，记录单列，未添加/删除dist文件。

## 范围与下一阶段

实际环境为Node v26.3.0、pnpm11.7.0、安装版Pi0.87.1。Node22、干净安装、远程CI、Pi/dsh/Codex/Claude Code真实宿主认证与模型研究评估均未运行。SDK参数校验、受控输出和临时服务测试不能替代宿主认证。

M2.1输入见 [规划审查](m2-planning/findings.md)：下一包实现流式附件、哈希/配额、授权下载与孤儿清理，并明确文件系统与数据库恢复窗口。本轮未实现附件、Web、正式评审或外部验证回执，未发布、部署、提交或推送。
