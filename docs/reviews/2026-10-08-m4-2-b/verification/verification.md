# M4.2-B 独立验收（父已接受，2026-10-08）

统一实际结果为 **615/615 项、88/88 文件、新15组（A5+B4+C6）**。本轮 source noEmit、唯一 build、新三文件15/15、旧 MCP runtime/lifecycle12/12、typecheck、lint、完整默认 suite 均首次在 C 冻结窗口通过。完整 suite 46.66s。current29 为四门禁加24原始兼容探针及既有 A.1 第11适配，29/29；没有把原第11脚本算作成功。所有32条实跑记录见 [commands.json](commands.json)；机器结果见 [final-results.json](final-results.json)。本轮 C 无首失败，作者开发期失败仍保留。

## 独立真实路径

C 的六组位于 [正式测试](../../../../tests/contracts/m4-mcp-binding-independent.test.ts)，通过真实 SDK1.30.1、built MCP 原生子进程及私有 HTTP 服务。固定 native transport 只运行本包 built MCP，解析实际 JSON-RPC stdout，拥有确切子进程并等待真实退出码；不使用 SDK transport 自动 kill 作为 clean shutdown 证据。每 child 20s watchdog，五组60s、关闭组90s均在首次运行前固定。

1. initialize/listTools 八工具为0 HTTP、0 session。未知工具、顶层/嵌套未知字段、真实 union 分支与 subscribe allOf 不合法组合在预备前拒绝，安全固定错误不回显 marker。实际广告为 anyOf，不假称 oneOf。
2. 两条真实 SDK tools/call 一起写入同一 stdin，产生两个实际 HTTP 业务写；capabilities、me、session 各一次。第二空间新增一次 session，另一独立 actor 进程的实际 post author 与 session actor/space 精确匹配，没有凭新 session 声称新身份。
3. HTTP 代理先完整收到真实上游 capabilities 响应再持有下游；一名等待者取消，另一名继续完成，仅一个 cap/me/session/业务请求。
4. 两等待者全取消，真实下游连接清退至0，无 session/业务；随后新的显式调用再次 capabilities→me→session 并成功。没有旧 call 自动循环重启。
5. 代理完整收到真实上游 session 201 正文且存储行数增加1后，才断下游。请求一次、业务0；同空间第二 call 无新 HTTP。新 runtime 重连可以成功，新 session 行另增1；不声称丢响应时提交回滚。
6. capabilities 与已经提交的 session 初始化两屏障分别验证 stdin EOF、重复 SIGTERM；真实退出0、watchdog未触发、实际 HTTP 资源0、无晚业务、无 ACK、consumer ack/batch 不变。session 屏障实际已提交1条，关闭不撤销它。

代理仅固定 allow/hold-cap/hold-session/drop-session 策略，转发真实服务合法 envelope，没有生产故障 flag、任意 SQL/命令 IPC。真实权限和写入仍由服务端判断。旧 callTool-only 工厂及上一包生命周期12项另行通过，默认完整 suite 原入口通过。

## 失败、保护与限制

A 新5组 source 首次通过，source noEmit 首次 mock opts TS7006 后仅类型注解修复通过。B 首4组3pass1fail 是 max_bytes1024 低于4096的 fixture；正确4096后该组通过。B 首 noEmit 跨库 schema metadata/Map 类型问题经父批准可信静态类型桥修复；对象及完整 keywords 未改。原日志全部保留，不称作者所有检查首绿。两方向只读互审均无新增阻断，见 [A审B](../author/session/peer-review-validation.md) 与 [B审A](../author/validation/peer-review-session.md)。

[完整性记录](integrity.json)核实 HEAD、5308份旧审查材料、SQL/archive4项、持久化 schema2项、五状态文档原字节不变；265源码/config/tests、51当前规范 docs 的 delta 都在授权 A5/B6/C1 内，作者 freeze0失配。构建后 dist208 tracked/208 untracked 与后续快照一致。稳定快照在门禁执行中捕获，准确文件名为 stable-during-final-gates.json，不声称先于所有门禁。owned MCP/CLI进程和私有目录残留0，没有 kill 用户进程。有限103新归档文本 token-pattern扫描无匹配，不推广为所有研究正文脱敏证明。

完整 suite 自带40MiB材料实际执行一次，未另起大材料、600s、模型或四宿主验证。session 仅诊断关联，无八工具 session_id wire 或逐帖审计；已开始 session 创建失败直到重连，全局只读失败在实际 finally 后仅新显式 call 可恢复。原 close 预算不能硬抢占非合作 native 同步工作或任意 fetch/backend。无 SQL/迁移/依赖/全局配置变更；未表示完整 M4 完成。
