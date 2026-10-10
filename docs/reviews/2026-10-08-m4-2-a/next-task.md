# 下一任务：M4.2-B MCP schema 校验与惰性诊断 session

M4.2-A 已由父于2026-10-08按有限范围接受，以[本包README](README.md)与[最终验证](verification/verification.md)为准；本任务书不复制验收计数。以下为父选定下一包方向，已于2026-10-08由父读定版，C fresh baseline 后实施，不把计划写成已完成。

## 范围与事实边界

使用已安装 SDK 默认 AjvJsonSchemaValidator 在 MCP 层校验 protocol 单源 DETUNED_TOOLS 的完整八广告 schema。无新依赖、SQL/schema版本或工具字段；SDK 不进入 protocol/client。unknown/invalid 在任何 preflight HTTP 前返回固定安全 VALIDATION_ERROR，不 coerce/remove/default，不回显 Ajv 文字。保持 legacy structured Record fallback；不前移服务端幂等之后的新写业务规则。

主 stdio 组合根默认绑定身份/空间诊断 session；原 factory 仅注入 client.callTool 的方式继续兼容。新增一个明确可选 sessionBinding 配置，提供同一 client 的 getCapabilities/getMe/createSession 与固定 client_name/version，不加通用 hook 或 CLI/env 开关。main 使用同一个 DetunedClient，client_name=detuned-mcp、version取包实际版本（当前0.1.0）；不从 tool args 取 actor/host session，不存 secret。

factory import、构造、start、initialize、listTools 均零HTTP/零session；仅 schema 有效的真实 call 进入 prepare。第一次 capabilities 确认现 API_VERSION，me 用 MeResponseSchema 校验并记录认证 actor。visible_spaces 最多100，不作为完整ACL白名单；每个空间通过真实 createSession observer 门禁确认。SessionSchema 校验返回并确认 actor/space 匹配，成功后才 dispatch 原 callTool。

八工具现在没有 session_id 字段，结果与参数均不注入它。session 只是 runtime/诊断关联，**不是逐帖审计绑定**，不新增 SQL、不声称历史写追踪；新会话不是新身份。没有公开 session 查询/幂等恢复入口；createSession 当前 single attempt。

## 并发、取消、失败和关闭

- runtime global capabilities→me 单flight；per-space session 单flight。相同空间并发复用，不同空间独立；凭据与URL在一个runtime内固定。
- 每flight持有自有controller与真实pending登记。取消一个等待者只脱离该waiter；仍有waiter则不abort共享工作，最后waiter离开才abort。
- close同步abort所有flight，等待其finally，纳入M4.2-A同一10s默认deadline与关闭Promise；重复close不延长，不新增独立timer/destroy/ACK，不脱离owned追踪后台初始化。
- 原call内每阶段只尝试一轮，不循环重启；HTTP读方法原有有界重试保持，createSession仍single attempt。global capabilities/me失败或最后waiter取消后，待真实finally结束可清除失败flight，后续新的显式toolcall可再初始化；global成功可缓存，close后禁止重启。
- session一旦已调用createSession便可能提交；失败/最后waiter取消缓存terminal失败到重连，后续同space重抛安全映射失败不再HTTP。不猜撤销；尚未开始createSession而只有global失败不锁死space。
- 首失败不匿名fallback、不继续业务。指南区分只读初始化失败可由新显式call重试与已开始session创建失败必须新runtime重连；响应丢失可能已创建无害session。不能称取消或失败回滚了session，不新造errorcode或后台重试。

## 文件边界与协作

主代理负责接口冻结、取舍及验收；gpt-6.1-sol 子代理执行划定边界。下轮开工先重读AGENTS、规范入口与本任务书，保护旧证据/fixtures/SQL/archive/dirty；不安装、模型调用、global配置、commit/push。

- A：mcp bridge/index 接线、新 session-binding.ts、新 session 正式test，planning契约与 author证据；factory wire仅A写。
- B：mcp 新 tool-validation.ts、新 schema 正式test、docs04/06/ADR/示例指南；先发安全validator导出签名给A。me/session可复用该接口；caps只核API_VERSION，不造全部能力新契约。
- C：独立真实SDK/native HTTP测试、fresh保护与统一build/typecheck/lint/full/current兼容gate。作者先有限source定向及含新test noEmit，首失败真实保留；具体路径与归属由父最终确认。

## 必要真实验收

1. 八schema合法输入、unknown/nested未知字段、oneOf、subscribe allOf；legacy structured重放不改。invalid/unknown零HTTP，发现全过程零HTTP/零session。
2. 同space并发只有一轮preflight与一个session；跨space各自session，双actor隔离。一个waiter取消另一成功；全取消释放；区分global取消后新显式call可重启与createSession已开始后取消终止缓存。关闭在preflight/session屏障取消，晚响应不调度业务。
3. session已提交后响应丢失：服务行数1、callTool0；重复请求不再建session。错误返回actor/space fail closed；固定安全错误无响应正文/凭据泄露。
4. 真实native正常publish/poll/ACK由显式工具触发，无隐式ACK；原A生命周期、旧CLI/Pi/SDK回归保持。非合作底层任务仍沿原有界失败边界，不虚报clean。

完整M4宿主认证、dsh/Pi真实loader及模型会话仍后包；本包不扩大工具、身份策略、通知后台或逐帖session审计。
