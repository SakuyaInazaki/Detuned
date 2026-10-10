# 下一任务：M3.1 可靠增量消费与有界等待

父 Agent 已选择此路线；本文件只编排下一包，不授权本轮开始产品修改或重复实验。M2.4-C.2 的最终规模、回归和 D01 结论以本包最终独立报告与父验收为准，不在此预填通过。保留完整 C2 recipe/seed/bench/首次失败及所有历史证据。

## 目标与既有基础

复用当前 subscription/consumer/delivery_batch、显式 poll/ack、空间 checkpoint 和共用 client，补齐可靠消费完整正确性、真实进程恢复与有界等待。不是重写事件系统，也不扩大到整个 M3：持久 inbox/所有宿主认证、备份导入导出、运维全包另行裁定。依据 `docs/08-roadmap.md` M3.1，`docs/09-validation.md` T08/T04/T10 与 D01 步骤4，`docs/04-protocol.md` §5、`docs/03-data-model.md` consumers/batches，相关 `docs/07-security-operations.md` 权限和恢复边界。

开工先读仓库入口、当前进度与最新接受报告，窄读 EventService、StoragePort/SQLite 事件和批次事务、HTTP events route、protocol schemas、client 与 MCP/Pi 的取消链。捕获实际 fresh baseline：包括完整 C2 及 D01 新证据；不可硬抄旧证据数量。提出精确方法签名、Clock/Abort 接口与文件所有权，由父冻结后保存实质 before，再实施。core 是唯一权限、可见性、过滤、批次与确认业务判断处，接入层复用 HTTP/client，不复制状态机。

当前静态候选只作为复现输入，不称已证漏洞：poll 是否过滤当前 event.visibility/私有对象，重投是否按当前 ACL 重建；重复 ack 分支是否能绕过真实 through_seq 比较；cursor 是否足以绑定 actor/space/consumer/batch 与持久范围；expiry 是否实际复用注入 Clock 而非 Date.now。用真实合法固定数据及最小必要签名夹具分别证明条件、返回值和状态 delta；没有复现的项记录未复现，不为优化而改产品，不以缺 import/helper 当反例。旧同键成功与当前权限、脱敏投影兼容保持。

## 父冻结的 wait_ms 合同

- `wait_ms=0` 即时；`>0` 在无可投递 batch 时有界等待，直到新可扫描事件、授权变化、截止或 Abort；允许范围上限 25000ms，省略值与非法输入等精确 wire 默认在下轮只读接口阶段核现 schema 后由父冻结。
- 已有未确认 batch 重投或当前能生成 batch 时立即返回。过滤后 events 为空但扫描位置可推进的 batch 也立即返回，不等满时限；完全无新可扫描事件才等待。has_more 仍表示继续扫描，不是未读总数。
- 等待不持数据库事务/锁。醒后每次重新核身份、空间权限、consumer 归属和 ACL epoch，重新读取当前状态再决定返回；ack 同样按当前授权。授权变化唤醒/检测方式由父看现接口事实后选择最小实现，不新建通用 bus、框架或依赖。
- 用户取消/断连或截止必须释放等待资源；Abort 不自动 ack、不吞已有未确认 batch。客户端取消不等于服务端撤销一个已经持久化的投递：若取消与生成 batch 竞态，后续合法 poll 必须能恢复该 batch，不能跳过事件。超时错误与用户取消仍沿共用 client 的区别与非重试规则。

这是补齐有效等待能力并明确合同；旧 `docs/04-protocol.md:13` “长轮询最长25秒”是上限，不是最少等待，也不能据此宣称旧即时响应已违反等满时限。HTTP、client、MCP、Pi 共用取消/重投语义；保持8工具既有合法调用，等待行为不得悄悄确认任何读取。

## 有限验收矩阵

独立真实 HTTP 与新进程（非只重新构造 service）覆盖：

1. poll 固化 batch 后服务和客户端进程重启，同 batch_id/范围/event ID 顺序重投；处理边界前崩溃不推进 ack。ack 已提交但响应丢失后同 batch 重试成功、ack_seq 单调；旧/乱序 ack 不降游标。
2. 并发 poll 只出现一个 active batch；跨 consumer/actor/space/batch、篡改、未来位置、超期 token 明确拒绝且无半状态。注入 Clock 测等号/下一秒与重投 TTL 策略，精确策略由父冻结；不能用 sleep 猜时间边界。
3. 500 扫描窗口、100 匹配上限及 thread/type 干扰数据，确认过滤扫描 through_seq 不跳漏；有新增但零匹配返回可确认空 batch，完全追平 null batch；全过程明确 ack 才推进。
4. 当前撤凭据/禁身份/撤成员/read能力/ACL epoch，在 poll、等待中、重投与 ack 各阶段按当前规则拒绝或要求 resync；public/private 可见性与固定对象归属不泄漏。
5. wait0、wait>0 无事件截止、新事件唤醒、已存在/重投即时、空匹配扫描即时；授权变化与 Abort 屏障，取消前/持久化边界后/响应正文/退避阶段均不自动 ack。并发取消反复运行无遗留 timer/listener/连接、无长持事务阻塞正常写。
6. HTTP/client/MCPstdio/已装 Pi validator→真实execute 的合法/错误/取消一致；dsh/Pi 先核官方文档与安装版本，工具层模拟不冒充真实宿主或模型认证。D01 步骤4只验证材料及未确认事件恢复，不扩到研究评审。

保存 before/首失败/修正/最终证据和真实命令 exit；独验使用独立预期，不调用作者 assertions。新定向通过后冻结，独立一次适度正式/关键回归与 current29；任何旧正式断言修改先列精确区段给父，不能弱化覆盖。无进程恢复结果外推到断电、介质损坏或离线备份。

仅当修复影响吞吐/等待资源或新证据显示问题时，由父决定按原 C2 参数另版运行比较；保留原 recipe/权重/速率/预算和报告，不机械重跑600秒、不调整负载后沿原名称声称通过。资源阈值沿 C2 实际限制，等待延迟与普通服务 p95 分列。禁止模型调用、全局配置、安装、部署、commit/push/reset/clean、删除依赖/dist/证据或修改用户数据；不使用 deepseek-brainstorm。
