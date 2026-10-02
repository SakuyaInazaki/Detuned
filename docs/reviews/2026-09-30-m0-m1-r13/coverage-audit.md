# R13 覆盖与交付核对

对象：[B.4-2R3 自报](../2026-09-30-m0-m1-r12/implementation-r4-b4-2r3/README.md)、实际源码、正式测试、R12 提示词。原自报与日志保持不变。

## 功能与正式覆盖

| 要求 | 实际完成 | 剩余 |
|---|---|---|
| V01 typed 已知事实 | 增加 Post/initial_post 修订存在和嵌套关系 source/target 检查；独立迁移三例全通 | 正式 V01 仅 helper toThrow，未覆盖迁移/重开 |
| V02 legacy 普通 Post | 字符串/重复 relation_ids、操作目标矛盾现已拒绝；独立两入口全通 | 初始帖与显式 null 的选择仍遗漏，W01/W02；正式 V02 仅 normalizer toThrow |
| V03 新 action null | 新编码分支拒绝 null；正式测试有业务/事件/结果零新增及重开快照 | 不再作为未修缺陷，归属应写 R12-F01 |
| V04 v1 时间冲突 | core 旧解析和 migration sync 均增加核对；正式测试原子拒绝并重开比较 | R12-F02 关闭，不要求重做时间规则 |
| V05 合法对照 | 正式有空数组 Post 精确重放、合法 ID-only 两次启动、只读快照；独立 V05 完整 Thread/patch 全通 | 正式只检查 Thread HTTP 201；不等于初始帖/patch 完整 data 检查。W03 发现 initial_post 额外空数组 |
| 类型关联 | 保留既有 OperationFamily 与穷尽 switch | 本次未完成业务返回/ref 关联；新增 helper 的元素类型仍含 any |
| L02-3c 及 Q | 保持前次有效实现、正式测试和独立证据 | 不重复列为待修 |

W03 的其他对照通过：无 initial_post 的合法完整 Thread、完整 Post 历史结果、合法 initial_post ID-only marker、重复启动、只读重放。其失败仅来自初始帖输出多出空数组；应与 W01 的非法数据被改写区分。

## 证据可信与不准确部分

本次 commands.json 25 条命令都有 stdout/stderr，共 50 个文件；没有上轮的猜测日志路径问题。before/after 的 83 个产品/测试指纹分别匹配 R12/R13 输入；两次只有三个代码/测试文件发生变化。after 的整体 diff hash 也匹配当前输入。before 整体 diff 与 R12 输入不同，源于期间文档变化，不影响产品指纹结论。

需要在新交付中勘误：

1. 操作族 `post.redact` 不存在，实际为 `admin.redaction`；不要改实现迎合报告。
2. 46 是六个独立脚本：R1 behavior 15、adapters 5、R2 remaining 12、CLI 3、R3 invariants 10、serve 1。正式文件 `m0-m1-regression.test.ts` 实际 11 项，不能写成 15；其他正式文件的真实数量见机器核对。两套统计不能混为一套。
3. `validateStoredResultRefPrecheck(storage, operation, spaceId, parsed)` 的 parsed 实际为 any；normalizer 的 parsed 也是 any。不能把签名写成已强类型。
4. V03 属 R12-F01，V04 属 R12-F02。新函数增加的事实检查没有自动关闭所有格式分支。
5. pnpm lint 递归执行九个子包的 tsc --noEmit，没有 Turbo。U06 已正确区分为响应 JSON；其要求是遇截断不能假报成功，不是宣称已实现自动恢复。
6. 附件称 R5 为 check-remediation-gates.mjs，实际 commands.json 正确运行的是 check-r4b-gaps.mjs。
7. 本轮 report 使用本机 file:// 链接，不便跨机器复用；下次采用仓库相对链接。此项属于文档整理，不单独阻断。

这些误差不应被扩大为“未真实执行”或“日志伪造”的指控。原始结果和机器核对支持本轮 V 修复、122 项通过等核心事实。下一轮保留有效证据，按实际断言汇报。
