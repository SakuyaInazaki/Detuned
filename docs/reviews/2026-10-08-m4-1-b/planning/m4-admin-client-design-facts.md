# M4.1-C 管理写typed client/CLI：只读事实（待父精确冻结）

本页不实现或测试；M4.1-B产品freeze保持。范围七条现HTTP管理写，server/core不扩业务。

## 1. 同一executor的单attempt切入点

client.ts request→private requestWithBody共用envelope/HTTP/transport/timeout解析；目前没有per-call retry参数，五处attempts<=this.maxRetries控制fetch abort/network、JSON-body abort/network和HTTP retry（见client.ts:305/319/373/387/472）。
最小候选是private executor末尾一个retryBudget=this.maxRetries，所有现判定使用该局部budget；六新管理wrapper固定传0。不修改全局maxRetries，不另复制框架，不暴露CLI重试开关；旧request/write/upload保持原默认。预算0使第一次transport/HTTP429/502/503/504立即原错误，不能只禁止HTTP retry而遗漏响应body或网络retry。该改动仍需父批准具体API/位置。

## 2. body与公开response准确事实

- actor create POST /admin/actors：CreateActorRequestSchema / CreateActorRequest；返回ActorSchema / Actor，201。
- credential create POST /admin/credentials：CreateCredentialRequestSchema / CreateCredentialRequest；201实际data={credential_id,actor_id,token}。
- credential revoke POST /admin/credentials/:id/revoke：无body（validateNoBody）；200 data={revoked:true}。
- membership create POST /spaces/:space_id/memberships：CreateMembershipRequestSchema / CreateMembershipRequest；201 MembershipSchema / Membership。
- membership patch PATCH /spaces/:space_id/memberships/:actor_id：PatchMembershipRequestSchema / PatchMembershipRequest；200 MembershipSchema / Membership。
- membership deactivate DELETE同membership路径：无body；200 data={deactivated:true}。
- redaction POST /spaces/:space_id/redactions：CreateRedactionRequestSchema / CreateRedactionRequest；201 data={redaction_id:string}。

来源：protocol/admin.ts:5–48、actors.ts:10–39、spaces.ts:38–47；server/routes/admin.ts:24–158；core/services/admin-service.ts返回值；core/services/redaction-service.ts:14定义RedactionResult接口。
**不存在**公开CreateCredentialResponseSchema/type、RevokeCredentialResponseSchema、DeactivateMembershipResponseSchema或RedactionResultSchema。openapi.ts:540–633这七responses仅description，不存在能Static提取的响应schema。CredentialSchema是含token_hash的内部登记实体，不能冒充一次性token响应。
候选最小补齐protocol/admin.ts四个现wire response Type.Object及Static导出（字段按既有真实返回、strict shape），同步OpenAPI响应schema；不改server业务。也可只公开interface，但无法宣称从已有runtime schema单源提取，需父决定响应runtime验证是否本包范围。client不能为返回type引入core依赖（AdminService有Node crypto）。一次token只成功输出，不日志/持久store；CLI禁止普遍“脱敏返回”把唯一token丢失。

## 3. redaction持久key scope

core/redaction-service.ts:64–77实际payload={target_type,target_id,reason}，业务幂等tuple是actor.id/spaceId/operation='admin.redaction'/key；target不独立进入core幂等主键，由payload摘要判断同key冲突409。auth与目标同space存在性在execute前及action内重查。post和artifact两种target都支持。
client RequestKeyScope目前operation白名单包括旧10family+artifact.create，不含admin.redaction；store v1 tuple仍[1,serverNamespace,actorId,spaceId,operation,target,logicalOperationId]，无payload fingerprint。
候选新增admin.redaction需space必填/target必填；target建议JSON.stringify([body.target_type,body.target_id])避免两kind同ID碰撞。其**编码结果**必须≤512 UTF8 bytes，schema target_id仅minLength1无上限，所以持久选项的本地长度限制须明确（JSON转义/类型开销计入），不能声称支持任意wire ID；显式key路径仍原server裁决。namespace≤4096、actor/space/logicalID≤512、operation≤128、空白拒等现约束保持。reason/hash不进store或logicalID。

## 4. 结果未知提示与错误类别

现公开ClientTransportError、TimeoutError、UserAbortError、ClientProtocolError；HTTP错误DetunedError沿code/status/retryable。CLI index.ts:60 handleError只序列化code/message/details，mapExitCode无上述class专门判断，通常exit1；内部class flags不在当前JSON输出。ClientTransportError即使新管理单attempt，retryable字段仍可表示运输本身可重试，不能解释为“该管理动作可安全重试”。
候选A仅指南明确：六非幂等管理写无自动retry；response丢失不能确定服务是否已提交，核当前状态再决定，credential一次token丢失不得靠盲重复创建找回。保现CLI错误输出最小兼容。
候选B仅六新wrapper/CLI catch对上述本地错误补固定安全message，保原对象class/code/status/details/exit，例如“管理请求未获得可确认结果；若已发送，结果可能未知，请先核对服务状态。”不能把用户提前abort或确定HTTP400/403/429都断言“已提交未知”，不新增servercode，不打印raw cause/SQL/token。是否指南足够或需条件提示由父决定；精准sent/responsephase跟踪是额外实现面，当前error没有这两字段。
