# M3.2 可选持久 request_key：本机工程验收通过

2026-10-06，父接受。调用者显式提供私有store与稳定logicalOperationId后，共用client的10个业务write方法与CLI publish/relate七分支在发包前持久取得key；进程退出或提交后响应丢失可按同一逻辑操作恢复。相同正文的两次有意写使用不同ID。旧显式key行为和输出兼容，新持久选项与任何显式key并用明确拒绝。

每次从getMe取得当前actor，准备期凭据变更或Abort不会继续业务发包；同actor轮换凭据可恢复，当前权限仍由服务端判断。文件store采用私有权限、严格record校验、临时文件fsync与无覆盖原子发布/目录fsync，竞争读取同一winner；成功、失败与取消均保留key。正文、响应、token、header和附件不进入store；基础client入口不导入Node FS，可选实现由独立`@detuned/client/node`提供。

[使用示例](../../../examples/request-keys.md) · [独立验收](verification/verification.md) · [最终结果](verification/final-results.json) · [完整性](verification/integrity.json) · [下一包M3.3-A](next-task.md)。

最终正式测试373/373、42文件，新增19项已含总数；当前29最终组合通过。build/typecheck/lint各执行一次。fullsuite执行三次：首次旧C2测试按Buffer分块解码stdout导致UTF-8 replacement字符；第二次该夹具已修，新KCLI02多进程七分支测试触发默认5秒门禁；授权仅修流decoder、合理有界case/child门禁后第三次通过。业务断言未减弱，原失败及后续定向结果保留，不能称全部首跑或唯一fullsuite通过。C新增验收的字段/ACL预期修正与本机sandbox EPERM也分别记录，未据此改产品。

真实新server/client/proxy进程的提交后丢响应恢复、八进程同scope竞争、同actor凭据轮换、当前权限与取消、损坏拒绝及CLI七分支完成。本地store字段隔离验证与真实HTTP认证验证分开报告，不将store-only隔离扩大为全部跨服务业务认证。双向源码互审不计测试重跑。

最终执行窗口source/config/tests、文档及mutable前后逐hash稳定，3345旧证据（含完整M3.1/H-R1/C2）、4SQL/archive、2schema保持；授权源码/测试变化与正常dist输出另列完整性清单。父接受后的导航/进度同步不属于该执行窗口零变化声明。

此结论限本机可选恢复：目录需防同OS用户恶意替换，最小元数据仍可能暴露对象关联；人工清理会失去恢复依据。没有自动ack、MCP/Pi新schema、宿主配置改动、模型调用、公开发布或推送。未重跑600秒规模窗口，未做四宿主完整认证或介质备份认证。M3.3备份/导出、M3.4运维及完整M3仍待后续，下一包按本目录任务书实施。
