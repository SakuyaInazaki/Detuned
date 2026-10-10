# M2.1 补充只读事实

## 1. 错误与权限

protocol/errors.ts:16/20 已有 PAYLOAD_TOO_LARGE、QUOTA_EXCEEDED；docs04:181/184 分别约定413/429。缺文件没有专门错误码：NOT_FOUND为404（errors.ts:7/docs04:176），CONTENT_REDACTED为410（errors.ts:15/docs04:180）。物理文件丢失但元信息存在的missing状态如何返回仍未编码/明确约定，不能声称已有文件缺失处理。

现写帖子/主题的 post-service.ts:121/277、thread-service.ts:109 用 requireSpaceAccess(auth,spaceId,'contributor')。auth-service.ts:154–180 先必须 read或admin，非observer再必须 write或admin，并同时检查空间membership/credential范围；因此沿用写权限意味着 read+write（或admin）且contributor门槛，而不只是write。下载现可复用observer/read门槛；当前尚无上传专有role/capability。

## 2. 持锁启动清理扩展点

storage-sqlite/src/lock.ts:12 acquire，:20独占O_CREAT|O_EXCL打开detuned.lock；:29–60仅确认PID不存在时回收stale锁；:69 release关闭fd/移除锁。

cli/index.ts:170–171先acquire；:180–183打开DB并openAndCoordinateDatabase；:185–187构造storage和验证secret；:189 buildApp；:212 app.listen。可把await清理置于storage/secret成功之后、buildApp或listen之前；该CLI路径此时已持dataDir锁且HTTP尚无监听，能避免本实例运行时HTTP上传并发。前提是所有写该文件根的产品进程都遵守同锁；不能保证外部手工写文件，也不能让直接buildApp测试自动拥有锁。当前buildApp无FS配置，需注入受限根。

shutdown在:194–207先app.close再db.close再lock.release；catch在:219–232同顺序释放。新增清理失败应抛入现catch，不提前放锁；启动创建的FS资源若需要关闭应在同资源释放链扩展。若将清理仅限此阶段则不会定期回收长运行进程孤儿，属于待父Agent选择的清理触发策略。

## 3. artifact幂等扩展点

idempotency-service.ts:13 IdempotencyResultRef union、:76 OperationFamily 均无artifact；protocol Artifact是实体可复用，但result_ref无Artifact读模型分支，未有可直接使用的artifact重放投影。StoragePort/findArtifactById可复用读取实体。

新增artifact.create至少需核对/扩展这些具体路径：:95 parseOperation（getExpectedKindForOperation:158委托此函数）；:610 validateStoredResultRefPrecheck；:940 validateResultRef；:1212 validateResultRefSemantics；:1390 extractResultRef；:1668 normalizeLegacyResultRef（保持旧11族格式与历史证明不变）；:2262 reconstructResult→:2324 reconstructFromValidRef。executeIdempotent:2582自身已有事务/hash/写记录协调，但新action不能用未知operation绕过上述白名单。实际新增分支是否所有函数均需改，由最终新result_ref形状决定；必须审阅全部这些路径，包括启动migrate调用，而不是只加编码器。

## 4. 32/19与历史29命令

- 现正式 r4-c-contracts.test.ts:428/:431/:549 硬编码32/19/32；新增3附件路由会自然改变这些数（multipart body在Fastify是否有body schema又影响body数）。
- 新 r4-c-route-contracts.test.ts:44–53 G01是完整实际集合与全body结构比较，无32/19硬编码；采集器collect-route-policies.mjs同为集合/全body比较。
- 老29命令内R21 check-c-completion.mjs:114–121仅输出operation/body/count，没有用32/19定通过；R22 check-c2-boundaries.mjs:162–175比较完整实际集合与spec集合及全部body结构，32/19只是当时输出值，不是硬编码门禁；R20 check-c-boundaries未发现32/19路由计数断言。
- 因R22 AE03直接采集全部实际路由，保持原脚本不改时它不会只看旧子集。若新增multipart requestBody与r.schema.body无同构值，AE03可能失败；若新三路由规范/实际schema同构则自然比较扩展集合，不需数量调整。为旧29探针“只观测旧子集”需要新的受控入口/封装或配置策略，当前旧脚本没有子集选项；不能直接声称可原样运行但自动忽略新路由。不改历史探针，具体兼容取舍由父Agent决定。
