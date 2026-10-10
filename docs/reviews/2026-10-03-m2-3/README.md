# M2.3 搜索与分页：本机工程验收通过

2026-10-03，父代理读取独立验证与只读审查后接受 M2.3。M0/M1 当前 core+C、M2.1 附件及 M2.2 A+B 继续通过；整个 M2 仍待 M2.4 A+B，不能据此宣称完整 v0.1/v0.2 已可用。

搜索现在支持精确、区分大小写的全部标签筛选。旧 CSV 行为保留，新增 `tags_json` 无损保留空格、逗号与空字符串；client 使用该 carrier。q trim 后按 Unicode 码点检查，短查询也搜索标签文本，字面符号不作为高级 FTS 运算符执行。签名 cursor 绑定当前身份、空间、归一查询与 ID DESC 位置，24 小时有效，续页可改 limit。旧裸 ID 或无效 cursor 返回400，去掉 cursor 重取第一页。

HTTP data 仍为数组，必含分页 meta。共用 client 与 `forum_search` 返回 `{data,meta}`，MCP/Pi 保留 meta，旧工具数组消费者改读 `result.data`。候选上限5000、items JSON 上限256 KiB，超限422，不能把截断前缀伪称完整结果。实际 app/client 长编码 URL 已通过有限64 KiB原生传输配置。试用见 [搜索示例](../../../examples/search.md)。

独立正式测试 **252/252，24 文件**，新 core9 与 contracts5；当前版本化 **29/29** 全部 exit0。独立 SQ01–08 与真实 native 长 URL 首跑通过，SQ09 由当前命令及 integrity 完成；旧 KV 与三份真实历史成功 HTTP 夹具的原键/新键/重启/脱敏/撤权回归保持。正式条目与探针不累加。详见 [独立验证](verification/verification.md)、[覆盖审计](coverage-audit.md)、[只读审查](verification/readonly-final-audit.md) 与 [两单元交付](implementation/README.md)。

原 R21 JSON-only 清单历史28/29及失败证据保留；当前29采用 M2.1 的 media-aware ADv2，不能称原历史29全绿。验证期间120产品/config/test与34当前规范材料稳定，1953旧证据、4 SQL/archive、2 schema/profile保持；正常构建24 tracked dist与4新增search-cursor输出单列，详见 [integrity](verification/integrity.json)。开发夹具错误与实际修复前反例分别保留在单元交付，独立验收首跑没有产品失败。

限额不是 SQLite VM/CPU 时间或整个 envelope/context 硬预算；ID DESC 不是时间、相关性或读快照。SQLite 两搜索分支保留非 ASCII case 行为，无 NFC/case rewriting。CLI search 仍只输出 data，无 cursor 选项。MCP stdio/Pi 安装校验器与受控执行是本机适配层契约证据，不是四真实宿主或模型认证。16条 ignored date-time 警告不能证明格式值校验；Node22、干净安装、远程 CI、10万/长负载、真实宿主与模型均未测。

下一包由主代理按已批准 [M2.4-A 任务](next-task.md)直接分派给 gpt-6.1-sol，用户无需手动转交。A 先做限长 context 与一致 checkpoint，B 后续补固定引用和继续读取；A通过不等于完整 M2.4 或整个 M2。Web、正式评审、专用 CLI/MCP 上传仍未完成。开发编排不改变论坛自身不启动参与者 Agent 的边界。
