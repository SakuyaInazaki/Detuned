# Check HTTP与共享客户端（M7.1-B1）

2026-10-10，十二操作获本机有限功能接受；schema6未变化。check CLI与普通MCP/Pi分支尚待B2。本例假定已有真实评审请求、冻结check profile和合格verifier actor，不创建伪formal记录、不执行论坛内容。所有ID放入URL时须encodeURIComponent；下列`SPACE`、`RUN`等URL变量均已编码，JSON中的ID使用原值。`API`为可信本地服务地址加`/api/v1`。token只通过本地环境提供，不提交/写日志。

## 十二操作

1. 普通空间owner/maintainer创建run。`create.json`为`{"request_id":"原请求ID","snapshot_id":"固定snapshotID","check_name":"冻结check名","verifier_id":"已授权actorID","expected_request_version":1}`；expected版本取真实当前请求，不固定猜测。返回201白名单run，保存其真实id、version和两个冻结hash。

```sh
curl "$API/spaces/$SPACE/check-runs" -H "Authorization: Bearer $ORDINARY_TOKEN" -H 'Content-Type: application/json' -H 'Idempotency-Key: check-create-1' --data-binary @create.json
```

2. 读取run；普通当前可读身份或绑定run的verify身份。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN" -H "Authorization: Bearer $ORDINARY_TOKEN"
```

3. 普通空间owner/maintainer签发一次明文凭据，返回credential_id/token/expires_at，旧run凭据同事务撤销。无Idempotency-Key、无自动retry；丢失结果须明确再签发而非盲目重试。ttl_seconds范围60..86400，默认3600。权限先按allowed_space_ids与核心空间身份判断；无membership且scope允许时，既有admin规则可虚拟owner；已有低角色或inactive身份不被覆盖。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/credentials" -H "Authorization: Bearer $ORDINARY_TOKEN" -H 'Content-Type: application/json' --data '{"ttl_seconds":3600}'
```

4. 绑定verify读取固定snapshot。sharedclient先整对象schema/scope绑定，再对canonical JCS UTF8实际WebCrypto SHA核manifest_sha256；curl本身不完成这个校验。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/snapshot" -H "Authorization: Bearer $VERIFY_TOKEN"
```

5. 读取snapshot内明确固定post修订。`POST`已编码，`REVISION`为无前导零正十进制safe integer；不能借此读取任意当前帖子。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/posts/$POST/revisions/$REVISION" -H "Authorization: Bearer $VERIFY_TOKEN"
```

6. 上传真实bounded日志。multipart恰一个file、可选metadata仅空对象；不提交任意visibility/owner/check_run_id。返回201 ready日志，保存真实artifact id。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/artifacts" -H "Authorization: Bearer $VERIFY_TOKEN" -H 'Idempotency-Key: check-log-1' -F 'file=@local-check.log;type=text/plain' -F 'metadata={};type=application/json'
```

7. scoped metadata读取，`ARTIFACT`已编码。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/artifacts/$ARTIFACT" -H "Authorization: Bearer $VERIFY_TOKEN"
```

8. scoped content读取。sharedclient构造精确同origin路径，不抓任意metadata URL，验证bounded size/MIME/SHA/EOF，并处理cancel/迟到body disposal。下面curl仅展示HTTP路径；应用应使用typed download及现安全发布机制，不覆盖既有文件。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/artifacts/$ARTIFACT/content" -H "Authorization: Bearer $VERIFY_TOKEN" --output newly-created-private-log.bin
```

9. 提交真实执行回执。`receipt.json`全部字段如下，hash、log ID与时间必须来自该次真实run/执行；pass必须exit_code0。不能把这个结构模板当成功证据。

```json
{"receipt_id":"local-check-receipt-1","observed_snapshot_sha256":"替换为run的64位小写hash","observed_check_config_sha256":"替换为run的64位小写hash","result":"pass","environment":"实际环境","execution_steps":"实际执行步骤","tool_versions":{"checker":"实际版本"},"started_at":"2026-10-10T01:00:00Z","finished_at":"2026-10-10T01:00:01Z","exit_code":0,"logs_artifact_id":"真实ready日志ID"}
```

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/receipt" -H "Authorization: Bearer $VERIFY_TOKEN" -H 'Content-Type: application/json' -H 'Idempotency-Key: check-receipt-1' --data-binary @receipt.json
```

10. 读取该run回执（无回执仍按真实服务错误处理，不合成null回执）。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/receipt" -H "Authorization: Bearer $VERIFY_TOKEN"
```

11. 普通空间owner/maintainer invalidate，expected_version取当前run版本，reason非空且最多500 Unicode码点；墙钟回拨不替代因果版本判断。不会伪改已有历史决策事实。

```sh
curl "$API/spaces/$SPACE/check-runs/$RUN/invalidate" -H "Authorization: Bearer $ORDINARY_TOKEN" -H 'Content-Type: application/json' -H 'Idempotency-Key: check-invalidate-1' --data-binary @invalidate.json
```

`invalidate.json`：`{"expected_version":2,"reason":"真实失效原因"}`，版本以当前读取为准。

12. 普通read身份查询当前请求required checks目录；`REQUEST`已编码。冻结check名单最多32项，每项仅latest run或明确null及receipt_id或null，不提供全attempt/凭据/私有意见。verify不能读取此目录。

```sh
curl "$API/spaces/$SPACE/review-requests/$REQUEST/check-runs" -H "Authorization: Bearer $ORDINARY_TOKEN"
```

## 客户端边界

对应方法：createCheckRun/getCheckRun/issueCheckRunCredential/getCheckSnapshot/getCheckPostRevision/uploadCheckArtifact/getCheckArtifact/downloadCheckArtifact/submitCheckReceipt/getCheckReceipt/invalidateCheckRun/getRequiredChecks，均以spaceId开头。普通create/invalidate支持既有WriteOptions.logicalOperationId持久恢复；verify receipt/log的CheckWriteOptions只有signal，运行时也在文件/HTTP/getMe前拒logicalOperationId，只接受显式key或每调用随机key，重试保持同key。issuer拒key并retryBudget0。所有响应整对象及crossfield绑定验证，不静默丢弃坏项。

check错误和成功响应均private,no-store。verify只访问其绑定run固定材料/log/receipt，不能genericartifact/getMe/空间/私有评审或普通binding.prepare。上传日志不是独立通过，pending/not_required或历史accepted不是当前检查通过。完整证据见[本包](../docs/reviews/2026-10-10-m7-1-b1/README.md)。
