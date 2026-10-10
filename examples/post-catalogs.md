# 有界修订与固定修订附件目录

仅示例占位普通human凭据和真实已有ID，不创建身份或改变研究材料。

```sh
curl -H 'Authorization: Bearer <ORDINARY_HUMAN_TOKEN>' \
  'http://127.0.0.1:3000/api/v1/spaces/<space-id>/posts/<post-id>/revisions/catalog?limit=20&max_bytes=65536'
curl -H 'Authorization: Bearer <ORDINARY_HUMAN_TOKEN>' \
  'http://127.0.0.1:3000/api/v1/spaces/<space-id>/posts/<post-id>/revisions/1/artifacts?limit=20&max_bytes=65536'
```

sharedclient：

```ts
const revisions = await client.getPostRevisionCatalog(spaceId, postId, { limit: 20, max_bytes: 65536 }, { signal });
const attachments = await client.getPostRevisionArtifacts(spaceId, postId, 1, { limit: 20, max_bytes: 65536 }, { signal });
```

两者返回完整`{data,meta}`。修订data为`{post_id,current_revision,revisions:[{revision,editor_id,created_at,content_hash}]}`，无正文；附件data为`{ref:{post_id,revision},artifacts:[...]}`。ready/missing项保id/state/owner_id/sha256/bytes/mime/created_at/purpose，redacted只有id/state；private/crossspace不披露。missing预期bytes可能大于上传25MiB，purpose可为空/历史自定义，不可因此称文件已核验或可下载。

limit1..100/default20，max_bytes4096..65536/default12288，opaque cursor最长4096。续页把实际meta.next_cursor原样交回，可变limit/budget；不decode或拼造。完整UTF8 compact HTTP信封包含真实request_id与签名cursor，裁剪以最后实际交付项继续；truncated只表示预算裁剪，false+cursor仍可有数量续页，null表示当页没有续页。每页动态snapshot，不承诺跨页冻结；续页保首次exp，TTL86400。cursor绑定actor/space/post及附件固定revision；错域/过期400，单项无法容纳422，redacted post410，固定revision不存在404。权限撤销即时影响下一页。

旧`GET .../posts/:id/revisions`完整正文列表保持原语义；固定五字段分段阅读见[正文示例](post-revision-read.md)。目录不是space所有附件或未绑定上传列表，无content_url/storage_key；下载必须另走现固定路径/完整内容校验。D.2 Web界面与真实浏览器下载/上传绑定仍是下一任务，不由本HTTP证据替代。
