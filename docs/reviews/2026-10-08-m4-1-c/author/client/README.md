# A交付：M4.1-C 七项既有管理写client

父冻结后、C fresh READY后实施。client API与planning/frozen-contract.md一致：六AdminService动作single attempt，redact沿业务幂等重试与持久scope。无server/core/SQL/schema2、依赖/lock、M4-B validator或全局错误行为变动；未build/fullsuite/current29。

## 变化

private requestWithBody末尾retryBudget默认this.maxRetries，原五个fetch/body/HTTP retry判定用局部budget。六新wrapper固定0；不另复制JSON请求框架、不更改globalmaxRetries。原write/upload等默认不变。无body revoke/deactivate真的undefined，全部path ID encode。返回原JSON envelope data typed，仅原信封验证，不增加深校验层/业务规则；timeout/Abort/错误对象保持。

redact沿write/prepareWriteKey，operation admin.redaction space required target=null。same tuple/logicalID更改type/id/reason复用同key，服务payload摘要409；store v1不改、原冲突/token变更/取消不发业务请求。没有target payload长度规则、正文/hash或token写入store。

protocol/admin.ts补四现wire strict DTO及Static：CreateCredentialData含credential_id/actor_id/token，RevokeCredentialData revoked:true，DeactivateMembershipData deactivated:true，RedactionResult redaction_id。ID复用ActorSchema.properties.id，不用内部token_hash CredentialSchema。core已有独立同形RedactionResult interface不改。index既有wildcard自动公开，不需改index。

OpenAPI实际只有packages/protocol/src/openapi.ts generateOpenApiSpec()运行时函数，无持久JSON/YAML生成工件/专用CLI命令。七现response补success envelope及正确201/200 schemas，原body/权限/key/header不改；不声称生成了schema文件。C统一build生成dist，A不改dist或其他schema。

## 真实检查与首失败

- source-first：5groups，4pass1fail。通过组包括6wrapper×6 failure变体（fetch网络/上游abort，body网络/abort，HTTP429/503）全部1attempt、各6timeout/userabort、原threadwrite/redact重试、4DTO/7OpenAPI契约。
- 首失败为作者fixture：initial_post漏CreatePostRequest必填title/summary，HTTP拒绝后.data undefined；fixture还错误取initial_post.id而非initial_post.post.id。保首日志，修必填并先断言201、按真实shape取id，未改产品或弱化assert。
- source-fixture-fix：仅该变更group1pass、其它4未重跑。真实app.inject/SQLite（无模型/loopback外网）redaction replay+changedreason409/一条redaction，persistent scope targetnull、显式冲突、token改变/准备取消覆盖。
- source-noemit首exit2，仅新test类型：当前Node类型lib无HeadersInit global及未contextualtyped scope。修为Headers逐项构造及RequestKeyScope显式注解，产品无改。source-noemit-final含newtest及protocol/client/sourcealiases exit0。

全部首失败和必要修复run原日志保留，没有把末次单group通过填成“5组首次全绿”。C将在最终source窗口统一运行全部5正式与业务/CLI独验；A不重复whole5或启动build/fullsuite。

## 边界

六非幂等动作不自动重试不等于保证没提交；transport/timeout/response丢失结果可能未知，credential唯一token可能没交付。只指南说明，不改旧class/code/message/CLI退出框架，不额外保存token。真实权限生命周期/CLI行为由B/C验证；本包不赋予来源账号admin、不给M6评审资格，不引入宿主Agent或身份新策略。
