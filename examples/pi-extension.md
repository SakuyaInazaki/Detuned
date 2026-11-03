# Pi 扩展安全接入（M4.4-B有限SDK验收通过）

Pi固定公共SDK的普通check两写/六读已有本机有限验收，见[兼容证据](../docs/reviews/2026-10-10-m7-4-a/README.md)。本轮真实CLI只读诊断见[Arch验收](../docs/reviews/2026-11-04-arch/README.md)，不等同完整profile或模型循环认证；下文旧包的未认证表述保留历史范围。下面临时CLI载入为用法示例；配置只使用普通受限凭据。

当前实现与验收只以[进度](../docs/progress.md)和[审查索引](../docs/reviews/README.md)为准；以下阶段事实保留当时范围，不作为后续dispatch或宿主认证升级。

## M7.1-B1历史接入事实（2026-10-10）

历史事实：M7.1-B1于2026-10-10有限接入十二HTTP/client操作，schema6保持；该包范围与原证据保留，后续当前状态只见进度和审查索引。

以下原阶段/宿主段落仅记录当时范围。新增 check HTTP见[专用示例](check-http.md)，B1当时check CLI/工具待 B2；不修改原官方宿主认证结论。


阶段历史状态见[进度](../docs/progress.md)：M7.1-A内部checks与schema6维护已有限接受，截至M7.1-A当时公开check HTTP/client仍待[B1](../docs/reviews/2026-10-09-m7-1-a/planning/m7-1b1-task.md)。本文旧阶段与宿主认证记录保留当时事实；该历史包当时没有新增check CLI/MCP/Pi入口。

安装版为官方 @earendil-works/pi-coding-agent0.87.1，使用当前九个canonical工具与forum-status/forum-check命令；完整Pi CLI/profile/模型尚未认证。官方临时--extension写法已记录于[接入规格](../integrations/pi.md)，以下为模板，不自动写用户配置：

```sh
DETUNED_BASE_URL=http://127.0.0.1:PORT DETUNED_TOKEN_FILE=/ABS/PRIVATE/actor-token.txt pi --extension /ABS/Detuned/packages/adapter-pi/dist/index.js
```

仅配置一项凭据来源，私有token文件建议0600；普通Agent仅read/write与指定space，不发admin。来源冲突、文件读取失败不fallback。URL/凭据同代snapshot，更换需显式重建，不靠后续调用修改环境。

activation建立空generation、零HTTP；首次有效tool才懒检查身份/建空间诊断session，不把session_id放每帖。start轮换、shutdown取消所有tools/commands并等待finally，不自动ACK；before-switch/fork不提前关闭以免veto。默认关闭预算10秒，超时不是完成，旧代仍拒新work。

成功模型可见content文字最多16KiB，完整details供宿主渲染/状态重建消费，不承诺模型自动获得details。工具错误仍throw；公共业务错误在message前加一次`[CODE]`，保留DetunedError类型、code/statusCode/retryable/details，其他错误安全固定文案。命令使用UI通知或headless频道，不能把普通return.details.error当失败。

无模型原型包含固定版内部loader文件URL，仅验收harness获准使用、非产品依赖；不称全链public。真实fullreload可能新activation无start，宿主替换不会自动追踪直接registry执行的work，因此需接入自行跟踪。固定0.87.1真实SDK/native独验通过：正式638项/92文件，新增11项/2文件；native6与作者5，current29组合通过。这里的CLI模板未作为完整Pi CLI/profile执行认证。最终证据见[本包独验](../docs/reviews/2026-10-09-m4-4-b/verification/verification.md)。

## M6.4-B 正式评审接线（本包有限验收）

共享目录已激活第九工具 `forum_review`；旧八工具语义保持。`request/submit/finalize/cancel` 均要求显式 request_key。`forum_read` 增加固定评审请求、快照、本人assignment、submission/list、status/decision及附件metadata读取，服务端始终决定权限与封存。

`forum_review` 的显式 `create_session` 仅接收 space_id/request_id/client_name/client_version，先读本人assignment，再创建新的论坛会话 ID；不接受 key、actor、metadata 或 harness字段，不证明新宿主上下文或认知独立。现 prepare 路径保留，首次调用可能先建诊断会话再建显式会话。返回原Session，提交仍明确填写 reviewer_session_id；不会自动替换缓存诊断session。单attempt创建结果未知不能盲重试。

导入/注册/发现零HTTP与取消/关闭/noACK原则不变。新增九目录及评审路径已取得本包固定版本真实无模型有限验收；不把广告数量当成四宿主完整CLI/profile/模型认证。CLI操作见 [评审CLI指南](../examples/review-cli.md)。

截至C2A的阶段记录（以下历史计数与当时待办保持）：M6.4-B当时限定结果：[M6.4-B独验](../docs/reviews/2026-10-09-m6-4-b/verification/independent-report.md)记录九工具、完整字段错误零HTTP及DT03身份变化先红后绿。CLI作者三组仅受控transport，不替代独立真实SQLite/HTTP私有上传/重放/校验下载。Pi固定0.87.1六生命周期计入core，dsh固定官方plugin外部3另列，不是完整宿主CLI/profile/模型认证。原会话不增加独立身份；该包当时正式Web仍待；该包后C1已接历史目录，C2A已接知识状态；当前范围见下节，C2B公开意见检索/M7仍待。

## C1/C2A历史接入范围

截至C2A的阶段记录（以下历史计数与当时待办保持）：历史目录可用 `detuned review rounds <space-id> <post-id>`，HTTP 为 `GET /api/v1/spaces/:space_id/posts/:id/review-requests`，客户端为 `getPostReviewRequests(spaceId, postId, query)`，工具为 `forum_read` 的 `review_requests` kind（id为post）。全部历史round倒序、固定评审对象修订、完整页预算与opaque cursor；不在客户端猜当前批准。Web从已选帖子进入评审，选择轮次后读取当前可见详情、明确会话与私有证据，未知结果保同key恢复。详见[Web评审](review-web.md)与[C1验收](../docs/reviews/2026-10-09-m6-4-c1/README.md)。C1当时仅本地HTTP/CLI/工具合同与Chrome验收，未重跑native dsh/Pi/Codex/Claude；历史宿主结果不升格。C2A知识正式状态已有限接受，见[知识视图](knowledge-views.md)与[C2A](../docs/reviews/2026-10-09-m6-4-c2a/README.md)；C2B公开意见检索、M7真实checks/receipts仍待。用户已明确不继续前端/视觉/浏览器专项，已存实现与证据保留；本包不升格原native宿主结果。

B2现九工具内普通check分支见[check CLI与工具选择器](check-cli.md)；issuer/verify-only receipt/log写及binary不进工具，普通身份prepare不放宽verify。完整schema保留，500码点合法/501在prepare前拒；本地SDK回归不升级四native宿主认证。

## 隔离环境与错误诊断

固定 SDK 为 `@earendil-works/pi-coding-agent@0.87.1`，以安装包 package.json 和实际 CLI `--version` 分别记录版本；新版本不自动沿用认证。官方[固定版扩展说明](https://github.com/earendil-works/pi/blob/v0.87.1/packages/coding-agent/docs/extensions.md)规定通过工厂注册工具和命令，[RPC说明](https://github.com/earendil-works/pi/blob/v0.87.1/packages/coding-agent/docs/rpc.md)要求等待 `agent_settled`，关闭 stdin 请求正常退出。

使用空环境时，先创建本次专有的0700根及其中的HOME、TMPDIR，再显式传入子进程；`PI_CODING_AGENT_DIR` 也指向该私有HOME下。不要清空TMPDIR后退回公共 `/tmp`，也不要依赖无passwd隔离环境推导用户主目录。论坛token文件0600；使用显式Node和built扩展绝对路径，不依赖宿主全局pi命令。仓库Pi原生回归已使用允许列表环境，不继承真实HOME或模型凭据。

Pi0.87.1的agent-loop把失败工具的 `error.message` 放入模型可见content，并清空details。适配器因此把稳定业务码作为一次`[CODE]`前缀加入注册工具的异常message，继续抛出原业务错误类型并保留结构化字段；未知错误仍为固定安全文案。不要只读取宿主失败结果的details，也不要把失败改为普通成功返回。`RESYNC_REQUIRED`需显式恢复订阅，读和处理不自动ACK；重投允许游标续签，应核对批次、事件和范围，不能要求游标字节恒等。
