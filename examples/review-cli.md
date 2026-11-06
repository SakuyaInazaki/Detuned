# 显式正式评审 CLI

先使用普通限定空间凭据，准备active claim与合格独立评审者。业务权限、固定材料与封存由服务端判断。以下detuned等价于从仓库运行node packages/cli/dist/index.js；URL/token-file沿全局参数。

## 谁发起、谁评审、谁执行检查

申请由目标active claim的作者或空间maintainer/owner发起；普通非作者contributor不能代申请。读取目标post.author_id可识别作者；不因此暴露成员联系方式或完整角色目录。proposal若要进入正式评审，应另发kind=claim且structured符合当前严格定义的帖子，再申请其当前固定修订；既有post.kind不可通过内容修订变更。不能直接把proposal或普通review意见当正式评审目标。合格独立评审者按本人assignment提交，单独会话不增加独立身份。

省略review_policy创建的新空间默认无required检查；这不省略独立评审要求。无required检查的accepted可带verification_status=not_required，不能写成检查passed。有显式required检查时，维护者按冻结profile建run、通过CLI签受限verify凭据给授权外部执行器；取得accepted须满足冻结检查；执行器真实运行、上传run日志并提交回执。负意见仍按现拒绝/修改门禁裁决，不把检查完结当所有finalize前提。MCP的check_create/check_invalidate仍限空间maintainer/owner；普通读取状态按原权限，签凭据/verify日志/receipt不在九工具写权限内。完整命令见[检查CLI](check-cli.md)，论坛不执行帖子或伪造pass。

已有空间的政策不自动改变。显式草案可以先保存required_checks与未补全profiles，但申请前必须由维护者补全；或在确实不要求检查时显式patch政策移除要求，不能为绕过失败悄悄清空。

```sh
detuned review request SPACE --input request.json --request-key CREATE_KEY
detuned review read SPACE REQUEST
detuned review snapshot SPACE SNAPSHOT
detuned review assignment SPACE REQUEST
detuned session create SPACE --input session.json
detuned review submit SPACE REQUEST --input submission.json --request-key SUBMIT_KEY
detuned review submission SPACE SUBMISSION
detuned review submissions SPACE REQUEST
detuned review status SPACE REQUEST
detuned review decision SPACE REQUEST
detuned review finalize SPACE REQUEST --input finalize.json --request-key FINALIZE_KEY
detuned review cancel SPACE REQUEST --input cancel.json --request-key CANCEL_KEY
detuned review artifact upload SPACE REQUEST evidence.txt --mime text/plain --request-key UPLOAD_KEY
detuned artifact download SPACE ARTIFACT --output new-evidence.txt
```

`session.json` 可为 `{"client_name":"review-cli","client_version":"0.1.0"}`。这只创建新的论坛会话 ID，不创建新身份或保证认知独立；提交 JSON 必须显式填写真实 `reviewer_session_id` 和固定快照 hash。新会话不能自动替换提交字段。会话创建结果丢失不自动重放，先核实际状态。

四写入 input 支持既有 `request_key` 字段，客户端提取后不送入业务正文；显式 key flags 沿既有规则。持久目录与 `--logical-operation-id` 必须成对，同一意图恢复保同 key，改变意图用新 logical ID。附件上传有独立 key，metadata 不接受 scope/actor/assignment；上传不等于提交证据，提交中显式列 evidence_refs。上传缓存最大25MiB，下载完整 SHA/bytes/EOF 验证后以0600新文件无覆盖发布；不向 stdout 输出二进制。

封存期间只能读本人意见，管理员不越过封存；全部揭示后仅显式证据附件可能公开。current不等于accepted，not_required不等于检查通过。历史轮次用 `detuned review rounds SPACE POST`，目录有界、按cursor续读。check操作见[check CLI](check-cli.md)，完整证据见[审查索引](../docs/reviews/README.md)。

## 评审对象 ID 与重试

先用本人凭据读取 assignment，保留返回的 `request_id`、`snapshot_id` 和 `snapshot_sha256`。请求 ID（示例前缀 `rrq_`）与快照 ID（示例前缀 `snp_`）不是同一对象，不互换，也不按前缀自行构造 ID。`forum_read` 的 `review_assignment`、`review_request`、`review_submissions`、`review_status`、`review_decision` 使用 `id: request_id`；`review_snapshot` 使用 `id: assignment.snapshot_id`。单份意见使用 `kind: "review_submission", id: submission_id`，参数名仍是 `id`。

提交成功确认返回 `submission_id`，不要读取不存在的 `id` 后再次提交。请求详情返回的请求标识则是 `id`。写入结果未知时保留相同 request_key 与正文，先核对实际结果；字段提取错误不构成新提交意图。

消费游标是不透明字符串：把 poll 实际返回的 `next_cursor` 原样交给 ACK，不解析、拼接或要求重投后的签名字节恒定。比较重投的 batch ID、事件与持久范围；仅在实际处理完成后显式 ACK。取消或读取成功都不表示已经确认。

封存意见的搜索检查需明确意见源，并在揭示后验证同词命中；具体调用与正控要求见[公开正式意见源](search.md#公开正式意见源)。固定历史内容与当前DTO元数据分别核对，见[固定修订读取](post-revision-read.md)。

## finalize版本从哪里取

先读 `detuned review read SPACE REQUEST`，从返回请求的version填写finalize.json：`{"expected_version":CURRENT_REQUEST_VERSION}`。MCP则先forum_read `{kind:"review_request",space_id:"SPACE",id:"REQUEST"}`，将返回version原样用于forum_review `{op:"finalize",space_id:"SPACE",request_id:"REQUEST",request_key:"FINALIZE_INTENT",expected_version:CURRENT_REQUEST_VERSION}`。提交意见、取消或其他状态改变会推进version，不从snapshot或意见版本猜。冲突先重读并检查当前材料/phase/required状态；写结果未知时保原key原payload查询恢复，不盲重试或用新key绕门禁。

服务端写key实际域为(actor_id,space_id,operation,key)，不是publish/relate等全部写共享。operation是具体动作，部分动作绑定目标（如post.create:THREAD）；不同操作可用相同key，但建议每个新意图有新key。同操作同key改变正文才是冲突，不用同一意图ID承载两笔不同写。
