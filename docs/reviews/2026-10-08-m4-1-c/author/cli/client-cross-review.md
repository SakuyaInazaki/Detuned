# B → A：管理写 client、DTO 与 OpenAPI 独立只读审查

2026-10-08。读取实际client.ts、request-key.ts、protocol/admin.ts、openapi.ts，并对照现server/admin与core AdminService/RedactionService wire。未运行实验或测试、未修改产品；结论为冻结范围未发现具体可达阻断，不以作者通过日志替代阅读。

## 单attempt与兼容

client.ts:223 的retryBudget缺省this.maxRetries；六新wrapper:583–605显式第四参数0，actor/credential/membership/revoke/deactivate都覆盖，无requestKey/WriteOptions伪接口。循环attempts先递增1；fetch unsolicited AbortError:316、network:330、body AbortError:384、body network:398、retryableHTTP:483全部同attempts<=retryBudget，因此0不进入retry。用户Abort/timeout本来直接error，不存在绕过budget的重试；唯一循环continue在outcome.retry，sleep后再循环，无额外六操作发包路径。

旧public request调用未传budget，原JSON/body/envelope/status/class.retryable/退出信息不改；artifact与旧10write同样默认budget。新wrapper没有自动生成key、转store或给普通actoradmin。即使返回的transport/HTTP error仍retryable=true，wrapper本次只有一次尝试，结果未知可能已提交是既有业务事实，不承诺token可恢复。

## redaction持久scope与身份

client.ts:607–609走原write，operation admin.redaction、space传入、target=null；request-key.ts:27只增加false target family，space.create之外仍要求space非null，格式store1不改。target_id/type/reason保持原wire/body，没有塞入scope、没有JSON target512上限；服务端admin.redaction幂等摘要与权限负责变body409。

原write→prepareWriteKey捕获token/getMe身份→check→store→再次check，Abort/credential切换不发业务POST；store完成后才构header/发送，晚store拒绝由race观察。explicitkey与logicalID互斥，store缺失拒；无logicalID沿原必需header服务端校验，既有HTTP六管理写没有被强加key。CLI取inputkey/extract是B边界，A不复制ACL或用户正文hash。

## DTO / 实际wire

protocol/admin.ts 四strictdata：CreateCredentialData{credential_id,actor_id,token}、RevokeCredentialData{revoked:true}、DeactivateMembershipData{deactivated:true}、RedactionResult{redaction_id}，与AdminService/RedactionService返回一致。string ID沿原ActorSchema.id，不误用含token_hash的CredentialSchema；无token_hash/storage秘密输出。Actor与Membership继续复用原schema，不新增日期framework。

openapi.ts:546–636七success均现envelope：actor201 Actor、credential201 CreateCredentialData、membership201/patch200 Membership、delete200 DeactivateMembershipData、revoke200 RevokeCredentialData、redact201 RedactionResult。redact独有必需Idempotency-Key参数；六其他route未伪标requiredkey，no-body路线沿原policy。这里只补规范，server业务/SQL不变。

## 有限结论

以上是代码与实际wire对照，未独立执行多种网络/取消故障矩阵；C负责真实built及计数。typed方法沿原JSON解析（不是新增全DTO运行时验证器），原默认retry仍可能影响直接generic request调用，单attempt保证只指这六新wrapper。plaintext credential只用户成功response一次，失response不代表未提交，也没有新增凭据状态查询/恢复服务。本包不认证完整CLI、四宿主或正式评审。
