# 后续管理 CLI：只读事实（2026-10-08）

未实现、未测试、未选下一路线；本文件不改本包freeze。来源：server/routes/admin.ts、protocol/admin.ts/actors.ts/spaces.ts/openapi.ts、core/services/admin-service.ts/auth-service.ts/redaction-service.ts、client/client.ts/request-key.ts、CLI index.ts。

所有 route 前缀 `/api/v1`；写query按现app拒，body schema additionalProperties:false。根认证刷新仍服务端；不读真实凭据/用户配置。

| HTTP | body/schema | 成功data/status | key与服务权限 |
|---|---|---|---|
| POST /admin/actors | CreateActorRequestSchema：kind human/agent/service，display_name 1..80 | Actor/201（id,kind,display_name,created_at,disabled_at） | 无必需key/无executeIdempotent；credential admin capability |
| POST /admin/credentials | CreateCredentialRequestSchema：actor_id；可选allowed_space_ids[]、capabilities read/write/admin[]、expires_at ISO/null | {credential_id,actor_id,token}/201，core推导类型，无专门公开response type | 无key幂等；admin capability，target actor存在 |
| POST /spaces/:space_id/memberships | CreateMembershipRequestSchema：actor_id、role observer/contributor/maintainer/owner；可选reviewer_eligible、independence_group string/null | Membership/201（active默认true） | 无key幂等；space owner访问，target actor存在 |
| PATCH /spaces/:space_id/memberships/:actor_id | PatchMembershipRequestSchema：可选role、reviewer_eligible、active、independence_group | Membership/200 | 无key幂等；space owner，existing membership存在 |
| DELETE /spaces/:space_id/memberships/:actor_id | validateNoBody：undefined/null/{}；无非空body | {deactivated:true}/200 | 无key幂等；space owner，membership存在 |
| POST /admin/credentials/:id/revoke | validateNoBody | {revoked:true}/200 | 无key幂等；admin capability，credential存在 |
| POST /spaces/:space_id/redactions | CreateRedactionRequestSchema：target_type post/artifact，target_id非空，reason1..2000 | {redaction_id}/201；core RedactionResult | 必需非空Idempotency-Key；space owner，target实际同space；executeIdempotent family admin.redaction |

space owner判断包含allowed_space_ids、active membership和角色层级及write/admin capability；instance admin无membership可获virtual owner，但受现allowed-space规则，不由CLI猜。六AdminService操作均fresh限流；redaction通过既有幂等层，replay沿当前授权。

当前没有上述七项专用typedclient方法；只有public generic request可调用，不代表已完整支持其安全重试。getMe/getCapabilities/getDiagnostics已有typed/薄方法与M4.1-A CLI，勿当待实现缺口。

request-key.targets仅 space.create/patch、thread.create/patch、post.create/revision/withdraw、relation.create/resolve/reopen、artifact.create。未允许admin.redaction或actor/credential/membership/revoke；不能盲将全部管理操作放入持久key family。红action原HTTP必需key，client未来是否扩family由父冻结。

credential create每次新随机token、SHA256 hash存DB，plaintext仅成功response；没有可恢复旧plaintext的幂等结果。若response丢失而generic client按现transport/HTTP策略重试，可能生成多条credential；前一token仍有效却未交付，不能描述为可恢复重放或真正仅一次创建。actor create亦可能重试生成多个actor；membership upsert可重复但会再次fresh计费，revoke/deactivate重复也按实际规则，不宣称所有写可安全replay。

现CLI可复用getClient原token/envfile fallback、readInputJson(--input或stdin)、printOutput/handleError/现exit映射；getWriteContext仅已允许幂等family，不能替未幂等管理API造可靠性。一次token应仅用户成功输出，勿日志/报告/文件默认保存；列表response无secret不代表credential创建也无secret。Commander parser与action JSON仍分开。

两个最小拆分候选（由父选择）：
1. 身份/凭据：actor create、credential create/revoke，先冻结非幂等create的明确no-auto-retry策略/response丢失诊断及一次明文输出安全边界；不新增服务业务。
2. 空间管理：membership create/patch/deactivate及redaction，可再将不可逆redaction独立；保持服务授权与现精确幂等语义，opaque target/reason不写日志。各包真实builtCLI普通身份拒绝、admin/owner允许、失响应/重试计数与输出无secret证据。

两个候选均无自动提升Agent权限、不把管理动作当普通参与者模板；不先添加接口或全局配置。
