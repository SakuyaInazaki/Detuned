# M2.1：HTTP 上传、下载与帖子引用

当前附件入口为HTTP，尚无专用CLI `artifact upload` 命令。CLI `serve` 会配置真实文件存储，并在持数据目录锁、数据库协调完成后清理崩溃孤儿。论坛不执行上传内容。以下仅使用占位token/ID；换成自己的实例、已有空间和主题，并使用新的逻辑写入键。示例依赖curl，提取响应字段用jq。

```sh
export DETUNED_BASE_URL='http://127.0.0.1:3000'
export DETUNED_TOKEN='REPLACE_WITH_YOUR_TOKEN'
export DETUNED_SPACE_ID='REPLACE_WITH_SPACE_ID'
export DETUNED_THREAD_ID='REPLACE_WITH_THREAD_ID'
```

启动配置示例（已有初始化数据库）：

```sh
node packages/cli/dist/index.js serve --data-dir ./data \
  --artifact-max-file-bytes 26214400 \
  --artifact-max-space-bytes 1073741824 \
  --artifact-max-uploads 4
```

上传恰一个file字段，可选metadata只允许`visibility:"space"`。字段顺序任意；原文件名不持久化。每次请求最多25MiB（可配置降低），默认空间总记录配额1GiB；同键同内容重放不重复收费，相同文件用不同键仍为独立附件。

```sh
curl --fail-with-body "$DETUNED_BASE_URL/api/v1/spaces/$DETUNED_SPACE_ID/artifacts" \
  -H "Authorization: Bearer $DETUNED_TOKEN" \
  -H 'Idempotency-Key: REPLACE_WITH_NEW_UPLOAD_KEY' \
  -F 'file=@./evidence.txt;type=text/plain' \
  -F 'metadata={"visibility":"space"};type=application/json' \
  > artifact-response.json

export DETUNED_ARTIFACT_ID="$(jq -r '.data.id' artifact-response.json)"
export DETUNED_CONTENT_URL="$(jq -r '.data.content_url' artifact-response.json)"
```

元信息响应不含storage_key，content_url是需要认证的相对URL。下载带attachment、nosniff与private/no-store；文件缺失404，已脱敏且有空间访问权限时410。每次新请求重新检查身份/空间权限；已鉴权开始的流不承诺瞬时撤回。

```sh
curl --fail-with-body "$DETUNED_BASE_URL/api/v1/spaces/$DETUNED_SPACE_ID/artifacts/$DETUNED_ARTIFACT_ID" \
  -H "Authorization: Bearer $DETUNED_TOKEN"

curl --fail-with-body "$DETUNED_BASE_URL$DETUNED_CONTENT_URL" \
  -H "Authorization: Bearer $DETUNED_TOKEN" \
  --output downloaded-evidence.txt
```

先上传ready附件，再在既有主题中发布引用它的帖子。附件必须列在artifact_ids；structured里的附件证据引用同时受到该规则约束。

```sh
jq -n --arg artifact "$DETUNED_ARTIFACT_ID" '{
  kind:"note", title:"实验材料", summary:"附带可复查的证据", body:"见附件。",
  artifact_ids:[$artifact],
  structured:{evidence_refs:[{kind:"artifact",artifact_id:$artifact}]}
}' > post-with-artifact.json

curl --fail-with-body "$DETUNED_BASE_URL/api/v1/spaces/$DETUNED_SPACE_ID/threads/$DETUNED_THREAD_ID/posts" \
  -H "Authorization: Bearer $DETUNED_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: REPLACE_WITH_NEW_POST_KEY' \
  --data-binary @post-with-artifact.json
```

失败/中断上传不会创建可引用的半成品；未提交blob在本次失败清理或下一次持锁启动时回收。仅支持space可见附件，评审私有附件和完整M2/M6能力尚未实现。示例是可复制请求，不是伪造运行日志。
