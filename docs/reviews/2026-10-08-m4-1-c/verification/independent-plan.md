# M4.1-C 独立验收准备

当前四个正式case为tests/integration/m4-admin-cli-independent.test.ts，fixed helper tests/helpers/m4-admin-cli-worker.mjs。只有syntax/diff检查，未运行产品、noEmit或build；等作者冻结后统一。

1. 新真实CLI进程、省略input走私有stdin，创建agent/scoped read-write credential/membership，真实HTTP写成功；role observer写403、deactivate失权、revoke401、无自动admincap。成功credential token仅内存；日志检查以secret命中布尔返回，公开DTO/OpenAPI小检查并入该组，不另造镜像case。
2. 非空fixture中普通身份七动作拒绝，counts/membership角色与active/revoked摘要前后不变；spaceowner实际管理成员/脱敏允许，actor/credential仍无instanceadmin权。
3. 真实post/artifact CLI持久脱敏，不同进程同logicalId重复同redaction，改reason服务409；post/artifact直接读取410、redactions/idempotency+2；改observer后原key重放拒绝。仅直接对象，不重复T13九读取矩阵。key文件不含reason/token/targetid。
4. 固定private loopback代理在完整上游201 end以后丢弃response并destroy；typed actor/credential、builtCLIcredential各请求only1、实际row+1。丢失凭据不假称找回明文，response不归档。完整retryable503规范error envelope独立typed对照仍only1/DB不变。代理为控制故障，业务提交来自真实上游。

A负责六wrapper×transport/body/timeout/retryHTTP与默认旧retry不变；B参数/坏输入/token仅stdout和key冲突。C不复刻全面错误矩阵。没有新依赖/lock改动或schema/SQL业务改动；OpenAPI runtime source七成功response补齐属于父授权。保护基线4755旧review、schema2、SQL/archive与HEAD。credential只私有env/内存；不prettyprint含secret的结果；不跑模型、600秒或额外大材料。
