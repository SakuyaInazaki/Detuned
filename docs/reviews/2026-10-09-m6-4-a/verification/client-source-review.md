# M6.4-A B客户端独立静读

结论：限定B4及其既有executor接点，未发现可行动的新阻断。没有运行tests/build/type/lint/网络；B RC01–04为编写的fetch替身合同，不能替代D真实HTTP证明。受审四项实际hash绑定见client-source-review-hashes.json，全部命中Bfreeze。

- client.ts:644–691十二wrapper地址/方法对齐冻结HTTP；create与submit写确认由严格既有DTO返回，GET独立read DTO，所有review JSON通过reviewResponse:631–642的1MiB bounded reader与固定公共executor。HTTP成功码由server路由决定；client沿既有res.ok语义，不额外发明status认证。
- 明确可证关联：create核space/target固定ref；request核id/space；snapshot核snapshot id/space/manifest space；assignment核request；submission单读核submission id；list核request及每行request；submit核request/hash；cancel核request/space；decision/status核request。DTO不含space或调用方未提供assignment/actor时不猜这些身份，真实服务端ACL/binding仍必需。严格data字段/日期来自A guards，不能把静读称实际malformed-response通过。
- requestWithBody:236–551沿timeout/abort及每attempt finally释放reader/timer/外部listener；reviewResponse预取消拒请求。普通JSON body仍遵既有调用者持有请求对象契约，客户端不承诺深冻结caller对象；正文变更的新意图应新key，服务端semantic idem不能把新payload重放旧结果。此轮未改变旧JSON retry序列化行为。
- uploadReviewArtifact:679–691复用snapshotUpload，Blob.slice与metadataJson在首次IO前固定，SHA/bytes固定；每attempt新FormData，同key、同Blob，只有empty metadata，成功要求private readable union+space+同SHA/bytes，不能冒充public upload。artifact-transfer.ts未改，content下载不改固定URL/hash机制。
- request-key.ts:27只新增五family；create target null，cancel/finalize/submission/privateupload target requestID，全部space必需；tuple:34仍[1,serverNamespace,actorId,spaceId,operation,target,logicalOperationId]。prepareWriteKey:570–599保原显式key与logical互斥、无logical直接显式key、当前getMe identity域及token变更检查，不把assignment/密钥/body存入localstore。
- lock唯一delta为server importer的@detuned/module-review specifier workspace:*、link ../../modules/review三行；未改变外部pins/其他importer，client没有业务module依赖。

未检：实际HTTP/SDK、取消竞态时序、重试中network故障、全部旧客户端；这些由D单窗。A/B产品源均未因本审查修改。
