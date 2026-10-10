# M3.1：可靠增量消费与有界等待

2026-10-06父接受本机工程结果。持久单待确认批次可重投/跨进程恢复，ack响应丢失可重复确认且游标单调；公共消费者仅投public，当前身份/空间权限/归属/ACL epoch每次核查。新strict event_ack与精确legacy四键兼容，注入Clock floor秒24h、等号有效、过期可repoll原batch取新cursor。

poll默认即时，显式wait_ms支持最长25秒；无新增可扫描事件时默认100ms重检，已有pending/可推进空匹配batch立即返回，128实际等待槽上限返回retryable429。等待无跨await事务，取消/断连不ack；已持久批次在取消后仍可恢复。shutdown取消等待、可用连接retryable503，MCP SDK取消复用共享client。

## 实际独立验证

- 唯一build/typecheck/lint/fullsuite通过：354/354正式测试、39文件；current29/29。新core11/contracts7/recovery2含总数，不叠加互审或探针。
- T08真实新服务/客户端进程恢复、ack响应丢失/乱序/伪造、并发poll单batch、500过滤扫描/空批次，D01步骤4固定材料和未确认事件恢复通过。
- 20独立消费者有限三轮覆盖事件唤醒→显式ack、无事件截止、用户取消/服务关闭不ack；当前ACL/Clock/投影核验另有证据通过，不等于新600秒规模窗口。
- built MCPstdio真实SDK signal→HTTP→默认core等待取消及Pi0.87.1官方已装validator→execute→共享client路径通过，仍8工具；不是四个真实宿主会话或模型认证。

[独立报告](verification/verification.md) · [覆盖核对](coverage-audit.md) · [执行命令](verification/commands.json) · [20consumer原结果](verification/wait20-first.json) · [SDK原结果](verification/tools-real.json) · [保护核对](verification/integrity.json)。3190旧证据原字节保持，获准源/规范变更与正常dist变化分别记录。运行期稳定与验收后状态索引更新分开。

## Before与范围

独验before真实复现私密事件混入、重复ack错误through_seq与Clock问题；core首3项红后11项绿，protocol合法wait立即返回及真实MCP取消未断开有首失败原档，沙箱listen EPERM和自有probe路径错误不当成产品反例。见[core交付](implementation/core/README.md)、[protocol交付](implementation/protocol/README.md)。只读双方互审不算重新执行。

唯一产品变更在EventService、HTTP events route、MCP signal转发；无Port/Storage/DDL/通用crypto新增，旧formal未改。没有重跑C2 600秒；有限旧检查以commands/current29实际执行为准，不把所有历史probe记作本轮通过。M2共享记忆与本机工程完成保持；全M3备份/运维、Web与正式评审另包。下一任务：[已批准M3.2可选持久request_key](next-task.md)。
