# M4.2-B MCP 完整参数验证与惰性诊断 session

2026-10-08 独立工程验收完成，**父已接受有限本机范围**。真实结果 **615/615 项、88/88 文件、新15组（A5+B4+C6）**。唯一 build/typecheck/lint/fullsuite 各一次，current29 为四门禁加24原始探针和既有 A.1 第11适配，29/29；旧第11未重跑。新专项首次15/15、旧 runtime/lifecycle12/12。作者开发期 fixture 与静态类型失败原日志保留，C 本轮首次检查均通过。

本包八工具全 schema 参数验证发生在任何 HTTP 前；发现仍0 HTTP/session。main 使用惰性 capabilities→me 和按空间 session singleflight，单等待者取消不取消他人，全取消观察真实 finally；只读全局失败后新显式 call 可以重启，已开始 session 创建失败直到重连。本包 session 是诊断关联，不逐帖注入 session_id、创建新身份或复制服务业务权限。

C 六组真实 SDK/native 子进程与 HTTP 验证发现/非法参数零请求、两并发业务写只一次预备、不同空间与 actor 隔离、取消共享 flight、完整上游 session201 已提交后丢响应一次/同进程终态/重连、EOF及重复信号初始化关闭无晚业务/ACK。实际退出码不借 SDK自动 kill；代理与屏障是可信测试控制，非生产故障入口。

证据入口：[独立报告](verification/verification.md)、[机器结果](verification/final-results.json)、[实际命令](verification/commands.json)、[保护核对](verification/integrity.json)、[A交付](author/session/report.md)、[B交付](author/validation/README.md)、[冻结契约](planning/frozen-contract.md)。5308份旧审查材料、HEAD、SQL/archive、持久化 schema、五状态文档保持；owned进程/目录0，源码delta均在授权范围。

完整 suite 自带40MiB一次；无额外大载、600s、模型/四宿主/全局配置检查。支持本机 SDK1.30.1 标准入口；不证明任意自定义 validator/backend 可以合作关闭，原统一预算不能硬抢占 native 同步工作。完整 M4 尚未完成。
