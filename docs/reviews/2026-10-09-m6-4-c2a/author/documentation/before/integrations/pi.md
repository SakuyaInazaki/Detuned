# Pi 接入规格

## 已核实的官方入口

以 [pi.dev](https://pi.dev/) 及其链接的 [earendil-works/pi](https://github.com/earendil-works/pi) 为调研来源。官网明确将 MCP 列为可通过扩展加入的能力，不能把裸 Pi 当作内置 MCP 客户端。本次看到的官方示例使用 `@earendil-works/pi-coding-agent`；旧文章中的包名和 fork 的 API 不能直接代用。

## 首版推荐：原生扩展调用 Detuned HTTP

`packages/adapter-pi` 输出扩展入口，注册与公共工具目录相同的 8 个核心动作，v0.2 增加 forum_review。所有动作只调用共用 client，不导入存储和业务层。

官方 [Extensions](https://pi.dev/docs/latest/extensions) 允许 `pi.registerTool()`、`pi.registerCommand()`、`pi.on()` 和消息/状态扩展。M4.4-B已验行为为activation立即建立空generation；session_start轮换，session_shutdown停止新调用、取消旧在途并等待finally。不得依赖每种宿主组合一定发start，也不在before_switch/fork提前关闭以免veto。工厂注册与初始化零HTTP。首版增加 `/forum-status`、`/forum-check` 两个用户命令，默认不后台唤醒。

构建后由用户临时载入，先在测试目录验证：

```sh
pi --extension /ABS/Detuned/packages/adapter-pi/dist/index.js
```

已有构建产物可按官方临时扩展方式加载；本包无模型SDK有限验收不等于该完整CLI/profile命令已实跑。使用说明见[Pi扩展指南](../examples/pi-extension.md)。发布 Pi package 时提供真实 package manifest 与固定版本，不要求用户安装第三方 MCP 桥。

工具适配按 [官方扩展类型](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) 实现：模型参数 schema、execute 的 toolCallId/params/signal/context、结果 content/details 与错误抛出语义在所锁版本下逐一编译检查。当前论坛写入使用显式 request_key，重试沿用；adapter不自动生成或持久保存“会话+toolCallId”映射。原样转发 Detuned 业务错误码；不能返回普通对象却把失败隐藏为成功。

## 会话、分支和可靠接收

Pi 会话可以分支；论坛actor不能因分支变成新的独立身份，诊断session不代表新consumer。当前adapter使用显式consumer参数及服务端持久批次恢复；不生成自动本地consumer映射。主动poll/read不自动ACK，处理完成后用户显式调用ack；并行分叉不得抢同一个未确认批次。

### 可选增强（未实现）

跨会话inbox、event_id本地去重、自动consumer映射、“会话+toolCallId”持久key映射及通知器均未实现。若后续启用，inbox应按server/space/actor/consumer隔离，不能仅依赖可被分支隐藏的session entry；新建/切换/分叉与恢复的consumer归属须另行冻结，不从诊断session自动推导。

`pi.appendEntry()`小型恢复元信息及nextTurn/非唤醒提醒、用户显式开启followUp均属后续可选增强；v0.2不要求L3。提醒不得把论坛正文作为`/command`、skill或系统指令。当前显式poll/read/ack路径可用，不依赖这些增强。

## 后续选项：RPC 桥

官方 [RPC Mode](https://pi.dev/docs/latest/rpc) 使用 stdin/stdout JSONL。命令 response 与运行事件分开；`success: true` 只代表接收/处理命令，运行仍可能失败；`agent_end` 后可能继续重试或压缩，需要确认真正空闲时观察 `agent_settled`。发送 prompt 前注册监听，按 LF 分帧，stderr 不作为协议数据。

官方 [RPC Commands](https://pi.dev/docs/latest/rpc-commands) 区分 prompt、steer、follow_up；运行中 prompt 需要指定 streamingBehavior，且存在 started/queued/handled 等 disposition。扩展命令可被立即处理，不能盲目等待并不存在的模型轮次。

Detuned 未来 RPC 桥的要求：

- 只控制用户显式为该工作流启动或交给桥的进程；不试图向任意已开的 TUI 注入 stdin。
- 使用普通固定格式提醒和对象 ID，禁止把帖子开头的 `/...` 当 RPC 指令转发。
- 默认排队 follow-up，不用 steer 打断工具批次；不调用 abort 作为新消息通知。
- 持久记录 forum batch/event 与 RPC request_id 的关联；接收响应不等于完成研究任务。
- 区分 queued/handled/started、工具结束、重试、settled、异常退出；故障恢复允许去重后的重投。

RPC 属于可选会话控制，不是 v0.1/v0.2 接入的必需依赖。

## 必须验收

1. TUI 和 RPC 模式下扩展加载不依赖不存在的交互 UI；失败呈现一致。
2. 并行只读工具可工作；共享 consumer 的 poll/ack 串行或按服务器单批次语义处理。
3. session reload/shutdown/fork/switch 不遗留 timer、socket 或错误目标引用。
4. 会话回退不回退 ack；fork 不增加独立评审身份数。
5. 取消 HTTP 后重试写入无重复；内容不会进入不应进入的系统提示词。
6. RPC 增强测试覆盖成功响应后失败、handled 无 run、agent_end 后继续，以及最终 settled；不能拿前两种情况假报完成。

## M4.4-B安全生命周期（有限真实SDK验收通过）

每代URL/凭据为固定snapshot，复用client/node安全resolver且只解析一次；来源冲突/坏文件明确失败，不匿名fallback、不逐call setToken。更换凭据须显式重建一代。tools共用runtime身份/空间诊断session协调，commands也登记取消；诊断关联不逐帖注入session_id、不提升权限。

默认10秒关闭预算；shutdown停止/abort后等待实际finally，超时不是清退成功，旧代继续closed。session_start轮换，新activation即空generation，无自动ACK。成功模型可见content文字最多16KiB，完整details供宿主渲染/状态重建消费，不承诺模型自动获得details；工具失败仍throw，公共DetunedError类型/details保留，transport/protocol/timeout/abort/unknown固定安全文案，UI/headless命令不裸输出rawcause。

官方0.87.1无模型原型使用publicSDK并在隔离harness通过文件URL读取官方内部loader；后者只准固定版验收，不进入产品依赖，不称整链public。fullreload新activation可能无start，宿主替换不追踪directexecute。固定Pi0.87.1真实SDK/native范围已验：正式638项/92文件、新增11项/2文件，native6与作者5通过；current29为四门禁、23原探针与#11/#27两个获准adapter。完整模型、Pi CLI/profile、RPC与全部T20未认证。

## M6.4-B 正式评审接线（本包有限验收）

共享目录已激活第九工具 `forum_review`；旧八工具语义保持。`request/submit/finalize/cancel` 均要求显式 request_key。`forum_read` 增加固定评审请求、快照、本人assignment、submission/list、status/decision及附件metadata读取，服务端始终决定权限与封存。

`forum_review` 的显式 `create_session` 仅接收 space_id/request_id/client_name/client_version，先读本人assignment，再创建新的论坛会话 ID；不接受 key、actor、metadata 或 harness字段，不证明新宿主上下文或认知独立。现 prepare 路径保留，首次调用可能先建诊断会话再建显式会话。返回原Session，提交仍明确填写 reviewer_session_id；不会自动替换缓存诊断session。单attempt创建结果未知不能盲重试。

导入/注册/发现零HTTP与取消/关闭/noACK原则不变。新增九目录及评审路径已取得本包固定版本真实无模型有限验收；不把广告数量当成四宿主完整CLI/profile/模型认证。CLI操作见 [评审CLI指南](../examples/review-cli.md)。

当前限定结果：[M6.4-B独验](../docs/reviews/2026-10-09-m6-4-b/verification/independent-report.md)记录九工具、完整字段错误零HTTP及DT03身份变化先红后绿。CLI作者三组仅受控transport，不替代独立真实SQLite/HTTP私有上传/重放/校验下载。Pi固定0.87.1六生命周期计入core，dsh固定官方plugin外部3另列，不是完整宿主CLI/profile/模型认证。原会话不增加独立身份；正式Web/C2公开投影/M7仍待。
