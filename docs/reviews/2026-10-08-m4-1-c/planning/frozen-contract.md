# M4.1-C 冻结：七现有管理写typed client

父冻结，C fresh READY（4755旧reviews/238source/47docs）后实施。A client.ts/request-key.ts/protocol admin.ts/openapi.ts/new m4-admin-client.test.ts及本包材料；B CLI，C独验与唯一build/gate。没有core/server/SQL、MCP/Pi/Web、身份策略或依赖/lock变更；M4-B validator不动。

公共方法（所有返回data，不包装meta）：createActor(CreateActorRequest,{signal}?)→Actor；createCredential(CreateCredentialRequest,{signal}?)→CreateCredentialData；revokeCredential(credentialId,{signal}?)→RevokeCredentialData；createMembership(spaceId,CreateMembershipRequest,{signal}?)→Membership；patchMembership(spaceId,actorId,PatchMembershipRequest,{signal}?)→Membership；deactivateMembership(spaceId,actorId,{signal}?)→DeactivateMembershipData；redact(spaceId,CreateRedactionRequest,requestKey?,WriteOptions?)→RedactionResult。

前六没有服务幂等，private requestWithBody末尾retryBudget默认旧maxRetries，六wrapper固定0，所有5处transport/body/HTTP重试判定一致用budget。timeout/Abort/envelope/错误类别原样，不加第二框架或CLI重试选项。无body动作body undefined；所有path id encode。只原JSON envelope验证，不造这七深校验；token仅成功返回一次，不log/key/defaultfile。指南提示response失去确认可结果未知，不修改servercode/全局错误。

redact走write/prepare，RequestKeyScope新增admin.redaction、space必填、target=null，与创建redaction记录语义相符。同tuple/logicalID改变type/id/reason复用同key由服务409；storev1不变，payload/hash不进store或logicalID，原显式冲突/token切换/取消/授权沿现规则。

protocol strict四DTO单源：CreateCredentialDataSchema/Data {credential_id,actor_id,token}；RevokeCredentialDataSchema/Data {revoked:true}；DeactivateMembershipDataSchema/Data {deactivated:true}；RedactionResultSchema/Result {redaction_id}；ID复用ActorSchema.properties.id，不使用内部token_hash实体。七success OpenAPI envelope：Actor/新credential/createMembership 201，patchMembership/deactivate/revoke 200，redaction201；既有body/permission/header/返回不变。core既有RedactionResult独立interface同形无barrel歧义，不改core。

OpenAPI仅src/openapi.ts generateOpenApiSpec()运行时生成（仓库无持久JSON/YAML或专用生成命令）。A更新generator并source测试调用；C统一build重建dist，A不编造生成工件、不改dist/其它schema。

作者有限检查覆盖六singleattempt全部failure类、原write/redact重试、持久redact tuple/identity/storecancel、DTO/OpenAPI无内部secret或伪header；真实权限/CLI生命周期由C。所有首失败保留，最后source noEmit含newtest，freeze后停写。
