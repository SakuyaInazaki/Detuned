# M4.1 CLI 缺口事实（只读）

依据 docs08 M4.1、docs04、protocol OpenAPI、CLI index 与 shared client。B2产品冻结，无实现/测试/current文档修改。以下候选包由父选择，不把M6未实现动作计为CLI缺口，不扩MCP任意本机文件上传。

| 现CLI命令/缺少入口 | 现client能力 | 真实缺口 |
|---|---|---|
| init/serve/backup/restore/import/migrate/export | 本地维护；exportSpace | 已实现；维护一次token/信号/资源guide主要是文档导航，不能重复立空接口 |
| context、space read、post read、thread posts | getContext/getSpaceRevision/getPostRevisionContent/getThreadPosts | 已实现整page/meta与cursor；旧read thread/post输出兼容仍data，不可全局悄改 |
| search | search→SearchPage{data,meta} | CLI无cursor flag，输出res.data丢next_cursor；limit parseInt宽松，与新strict入口需父定兼容 |
| publish thread/post/revision/withdraw、relate create/resolve/reopen | 对应写wrapper+可选持久key | 已实现；thread patch没有CLI入口（patchThread已有） |
| subscribe/poll/ack | subscribe/poll/ack | 已实现基础；consumer deactivate/delete缺CLI；subscribe目前只start/consumer-key，checkpoint/thread/event filter与poll wait_ms等完整HTTP选项未贯通 |
| 无space list/create/patch、thread list | listSpaces/createSpace/patchSpace/listThreads | HTTP与wrapper已有，只缺CLI命令与分页输出 |
| 无post revisions list、view | listPostRevisions/getView | HTTP与wrapper已有，缺CLI入口 |
| 无me/capabilities/session/diagnostics | getMe/getCapabilities/createSession/getDiagnostics | wrapper均真实存在，CLI缺身份/诊断入口；匿名health无专用wrapper，可按父范围增薄读取 |
| 无artifact upload/metadata/download | client只有generic JSON request，HTTP multipart与binary routes已实现 | shared client无multipart upload/binary download流方法，不能拿JSON request伪装；需有界正文lifecycle/取消/私有文件nooverwrite发布与CLI复用 |
| 无actor create、credential create/revoke、membership create/patch/deactivate | generic request可调用；无专用wrapper | HTTP/core已实现，需typed薄wrapper+CLI；无credential list/actor disable等HTTP不能虚报已有或本包自行扩server |
| 无redaction入口 | HTTP/core redaction已有，无专用wrapper | 可另小包接管理员动作，scope/幂等与权限仍server；不是M6封存评审 |

## 凭据与输出真实边界

CLI global实际仅 --url、--token、--json。token优先显式→DETUNED_TOKEN→DETUNED_TOKEN_FILE，文件读取失败被忽略；**当前没有 --token-file flag**。若指南写该flag即文档错误，应在下一批准包核修，不因旧说明假定产品已有。未实现持久全局配置或credential自诊断文件权限；本任务不改用户全局配置/存token。

printOutput非json/json当前都输出JSON（pretty），不同命令有data-only与page/summary/维护token shape；handleError --json向stdout输出api_version/error{code,message,details}，无request_id/status/retryable，非json向stderr。Commander未知/缺required选项发生在action外，未统一到该JSON错误路径；不得声称所有--json失败都是稳定envelope。输入JSON解析/本地FS等原生错误默认exit1，输入错误与服务错误统一需保既有兼容/父定scope。

退出映射现：validation/payload/exportlimit2，401/4033，修订/幂等/ACK/resync/snapshot等4，temporary/storagebusy/rate/exportunavailable5，其余1；QUOTA507、SERVICE_NOT_READY503与INTERNAL_ERROR当前落1。这个事实不等于应全局改码；新入口需明确兼容测试与固定敏感输出（尤其credentials明文仅成功一次，不证据/log/store）。HTTP/client业务权限/限额/幂等不复制到CLI。

## 最小可审阅候选包

1. 读取/诊断+search分页：新增me/capabilities/diagnostics（core admin判断不客户端猜）、现wrapper分页入口与strictflags；先明确老search data-only兼容或显式page选项，不一口气改全命令JSON。身份失败/普通actor403/health匿名/nextcursor续页与退出码真实CLI验收。
2. 附件：shared multipart upload和binary流download生命周期+CLI metadata/upload/download；输入正规文件、有效mime/metadata由server，幂等key与当前limit；下载newfile/private/tmp→完整EOF→sync/nooverwrite。server401/403/404/410/413/429/507、partial/cancel/已存在目标保bytes、stdout只摘要/原token不露；不扩MCP文件上传。
3. 管理身份/凭据/成员：typedclient+CLI core授权复用；成功credential明文只stdout一次，文件权限/输入及stderr泄漏验收，普通Agent不得获admin；创建/撤销后的me与业务实际失效、不把同actor新session算新身份。没有现HTTP支持的动作另报父。

各包只薄transport，不新业务或框架；真实builtCLI与 sharedclient/HTTP同错误语义，清晰列尚未运行检查，C统一build/gates。M4.2–4.5真实宿主认证及M5–7仍独立后续。
