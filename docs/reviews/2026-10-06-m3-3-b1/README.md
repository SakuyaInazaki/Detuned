# M3.3-B.1 空间权限过滤 NDJSON 导出审查

2026-10-07 Asia/Shanghai：本机有限工程验收门禁通过，父已接受有限本机工程范围。本包于2026-10-06开工；命令原时间戳、首失败、旧审查原字节保留。

实现经HTTP/shared client/CLI导出当前授权空间的public research白名单固定历史及关系/解决、authorized artifact manifest和脱敏墓碑。原actor IDs仅source attribution，不导出身份权限、凭据、会话、consumer、幂等或私有binding。file-backed readonly WAL snapshot使用keyset逐row读取，实时复核身份/ACL/脱敏，end+EOF严格校验完成；CLI完整新文件不覆盖既有目标。SHA链不是来源认证，未知研究正文不承诺自动秘密脱敏，正式review/check仍not_enabled，完整M3尚未完成。

实际最终全套414tests/48files全通过，无unhandled，新21（A11+B6+C4）包含在总数中。current29全部当前通过；全workspace build一次，relation_resolution PK keyset窄修后storage必要增量build一次，最终typecheck/lint各一次，fullsuite一次。三新targeted首18/20+1夹具unhandled、两个C纠错run及作者初版真实产品schema缺陷（check_profiles Array→Record）/旧dist开发编译报错记录分别保留，不能改写成全过程稳定零失败。

独立真实T0屏障先建snapshot，另一HTTP writer真的完成revision才release，新写不混入T0；本space脱敏/同actor撤membership中止无end。固定raw流十种坏边界及CLIpartial不发表通过。40MiB同formal实际完整执行两次（首次targeted、最终fullsuite），wire各42,399,852 bytes；server每次仅1heap样本，采样不足，结合单row/line机制及receiver样本仅支持有限工程判断，不能证明硬RSS上限。未额外跑600s负载、模型宿主、import或介质灾难。

验收证据：

- [独立验收与首失败归因](verification/verification.md)
- [最终机器摘要](verification/final-results.json)
- [所有实际C命令](verification/commands.json)
- [源码/旧证据/SQL/schema保护核对](verification/integrity.json)
- [有限凭据归档扫描](verification/credential-evidence-check.json)、[真实残留进程/临时目录清退](verification/cleanup-check.json)
- [独立代码检查与采样限制](verification/independent-code-review.md)
- [A core/storage交付及有限作者probe](implementation/storage/README.md)、[A对B互审](implementation/storage/transport-cross-review.md)
- [B transport/client/CLI交付与before](implementation/transport/README.md)、[B对A互审及r.id closure](implementation/transport/storage-cross-review.md)
- [父冻结契约](planning/frozen-contract.md)、[下一任务计划（未实施）](next-task.md)

保护基线为3623个旧review文件（包括整个M3.3-A）、171source、SQL/archive4、schema profiles2。最终181source与gate窗口完全稳定，旧fixture assets/HEAD/全部旧review保护通过。执行期父授权example-only文档delta单列，tracked dist208中35changed，untracked68→92（24added、4changed、无删除）为正常构建效果。owned export进程0、known private export dirs0；有限本包文本credential shape扫描无命中，不等于全部研究文本脱敏。

当前用户入口：[导出使用示例](../../../examples/space-export.md) · [当前功能状态](../../progress.md#当前功能状态与未完成能力)。下一包[M3.3-B.2本地新实例逻辑导入](next-task.md)尚未实施，representation、附件与provenance在下一轮冻结；完整迁移、M3.4及M4宿主/M5/M6/M7仍待后续。旧M3.3-A物理备份恢复与M2/M3.1/M3.2验收保持。
