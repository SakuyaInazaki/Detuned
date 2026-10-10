# 有界主题帖子元数据目录

```sh
detuned thread posts '<space-id>' '<thread-id>' --limit 50 --max-bytes 4096
detuned thread posts '<space-id>' '<thread-id>' --limit 100 --max-bytes 65536 --cursor '<previous-meta.next_cursor>'
```

HTTP为GET `/api/v1/spaces/<space-id>/threads/<thread-id>/posts?limit=50&max_bytes=4096`，Authorization使用当前身份凭据；续页用URL编码的原next_cursor。client.getThreadPosts返回整page；工具仍forum_read：

```json
{"name":"forum_read","arguments":{"kind":"thread_posts","space_id":"<space-id>","id":"<thread-id>","limit":50,"max_bytes":4096}}
```

data只有当前Thread元数据及Post元数据数组，不聚合正文。默认按id ASC读取UUID字典序，不能当创建顺序。静止目录持续next_cursor直至null可重组；跨页动态，较小id并发新增需事件增量补充。每页重新检查当前身份/权限、同snapshot读取主题state/version与帖子head/lifecycle，跨页不固定全集。

meta.truncated仅表示预算删尾：仅limit还有更多可false+非空cursor；true必须非空posts+非空cursor，不能据false提前停止。末页false/null，空主题posts[]；最小metadata或一post+必要cursor无法fit则422。limit1..100/default50，预算4096..65536/default12288计真实compact HTTP正文，不计CLI pretty/tool包装。cursor绑定actor/space/thread及最后发送id，首24h期限不延长；可换limit/budget，坏/过期400移除cursor从第一页重读。

获得post.id与current_revision，例如p/3后，固定使用`detuned post read '<space-id>' 'p' --revision 3 --max-bytes 4096`，按[固定帖子续读](post-revision-read.md)拼接chunk。即使目录head随后变4，该固定3的stored正文保持；每页仍看当前ACL，脱敏后旧固定正文410。目录可显示redacted/withdrawn元数据，但不泄正文。

旧HTTP/getThread仍支持裸id cursor；旧forum_read thread/CLI read thread仅默认首批data，输出不迁移。新功能不等于M2/focus/规模验收完成。规范见[协议](../docs/04-protocol.md)。

## 可选记录创建时间排序

`GET /api/v1/spaces/S/threads/T/posts?sort=created_at_asc&limit=20` 或 `client.getThreadPosts(S,T,{sort:"created_at_asc",limit:20})`；后续用原next_cursor且继续显式传同sort。默认/旧cursor保id_asc；新sort cursor省略或更改sort拒400。canonical UTC毫秒按ID tie，无法确认的历史时间完整末尾按ID；不是事务提交顺序，公开metadata形状不变。

`node packages/cli/dist/index.js --token-file /private/path/reader-token thread posts S T --sort created_at_asc --limit 20` 返回原整页data/meta。forum_read(kind=thread_posts)同schema支持sort，MCP/Pi经sharedclient转发。当前ACL每页复核、原24h exp与完整信封预算保留。
