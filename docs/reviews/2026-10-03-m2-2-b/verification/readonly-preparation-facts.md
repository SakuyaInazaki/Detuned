# DTO 批准前只读事实

基线 HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44，加全部已验收但未提交工作。baseline.json 记录 114 source/config/test/material、32 当前文档、1839 先前 review/evidence、4 SQL/archive、2 schema/profile、208 tracked + 28 untracked dist；不遍历或输出 node_modules 内容。上包 dirty 内容是本轮基线，不能还原。

当前 ContextService 先 space 授权，但 pinned 条件仅同空间/active/固定版存在，没有 summary kind 限制；recent_failures 使用 category counterexample、evidence_state provided、attempt 回退 summary，正是本包批准消除的事实伪造。recent_activity 当前未按 visibility 过滤。openChallenges 当前直接投影 source issue/impact 或 summary 回退，没有共享端点隐私投影。

现有预算实际代码：先计 JSON.stringify(result) 字节，超限仅 recent_activity=[]、recent_failures.slice(0,2)，不重新计算、不裁 pinned/blocking；因此 baseline 并不能保证完整 context 必然≤max_bytes。父规范本包只要求新增字段进入该已有计量/截断，不自改为完整 M2.4 预算重构。最终验收报告须区分本包新字段计入和旧全文/envelope 缺口；若实现计划不同由父裁决。

当前 SearchService findings 合并 proposal25+claim25；failures 仅旧 SearchResultItem；open-questions 含 question 与 raw openChallenge。DTO 与关系枚举新增路径待批准，验证者只提供有限隐私/版本/保真反例，不自选架构。

未运行产品检查/正式suite/旧命令，本文件为源码事实，不是失败实测日志。
