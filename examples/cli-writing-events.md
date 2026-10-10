# 空间、会话与事件消费 CLI

凭据来源仅选择一个：`--token`、`--token-file`、`DETUNED_TOKEN` 或 `DETUNED_TOKEN_FILE`；冲突或所选文件失败会拒绝，不再 fallback。文件建议0600。见[安全错误与凭据指南](cli-errors-credentials.md)。

复用现 `--url`、`--token` 或 DETUNED_BASE_URL/DETUNED_TOKEN/DETUNED_TOKEN_FILE；支持显式 --token-file，不修改用户全局配置。服务端负责身份、权限、修订、幂等与订阅规则；以下为占位ID/私有文件路径。

```sh
node packages/cli/dist/index.js space create --input /private/path/space.json --request-key SPACE_CREATE_INTENT
node packages/cli/dist/index.js space patch SPACE_ID --input /private/path/space-patch.json --request-key SPACE_PATCH_INTENT
node packages/cli/dist/index.js thread patch SPACE_ID THREAD_ID --input /private/path/thread-patch.json --request-key THREAD_PATCH_INTENT
```

space输入例 `{"slug":"research","objective":"research goal","rules":[]}`，patch例 `{"expected_revision":1,"objective":"updated goal"}`；thread patch例 `{"expected_version":1,"title":"updated title"}`。已有space read/list、thread posts/list保持。三写输出原wrapper的res.data：space写是space/revision对象，thread patch是Thread对象；不加外层envelope。输入省略从stdin读，--input -同样可用，读取/解析失败固定safe exit2。

三写也支持JSON request_key（先提取不进wire），或 --request-key-dir与--logical-operation-id成对；沿现flag优先与冲突规则。任何显式key来源含null/empty与持久选项并用都拒。有意新写换logicalId，重试同意图保留ID；不把业务正文塞进store。

```sh
node packages/cli/dist/index.js session create SPACE_ID --input /private/path/session.json
```

session JSON必需client_name/client_version，例如 `{"client_name":"local-client","client_version":"1","harness_session_id":"optional-session-reference"}`。它创建同actor的新会话记录，不是新的独立身份；重复相同harness_session_id不会据此保证幂等。client单attempt，没keyflags。失响应/取消/超时结果未知，可能已提交，不盲重试假称找回原session。

```sh
node packages/cli/dist/index.js subscribe --space SPACE_ID --consumer-key local-reader --thread THREAD_ID --event-type post.created --event-type post.revised
node packages/cli/dist/index.js subscribe --space SPACE_ID --consumer-key checkpoint-reader --checkpoint-token 'CONTEXT_CHECKPOINT_TOKEN'
node packages/cli/dist/index.js poll --space SPACE_ID --consumer-id CONSUMER_ID --limit 20 --wait-ms 25000
node packages/cli/dist/index.js ack --space SPACE_ID --consumer-id CONSUMER_ID --batch-id BATCH_ID --next-cursor 'DELIVERED_CURSOR'
node packages/cli/dist/index.js consumer deactivate SPACE_ID CONSUMER_ID
```

--thread与--event-type可重复，组成arrays。省略start且无checkpoint为beginning；显式checkpoint flag而省略start构造context_checkpoint。start=context_checkpoint必须非空checkpoint_token；其他或省略start配token在共享HTTP/core/tool规则中拒，CLI显式冲突不改写或忽略。此严格组合有意修正旧silentfallback。checkpoint取自真实context，不造token；复用既有consumer不会重新定位起点。

订阅保兼容--request-key转发，但可靠复用依据consumer_key+filters，不是论坛业务幂等或RequestKeyStore；不存在消费者时重订阅同key得到新consumer，按指定start初始化，不复活旧cursor。读取/poll不自动ACK，ACK仅接入端处理确认，原ACK行为保持。

poll limit严格1–100、wait-ms严格0–25000（默认0），非法本地exit2且不发HTTP。默认client每attempt30秒，最长25秒poll等待留网络余量；有原有界重试，整个命令不承诺25/30秒总时长，无新增超时flag。

consumer deactivate终止消费者及其待确认操作批次，保留论坛事件/帖子；重复不存在仍成功。旧cursor/ACK不能恢复已停用消费者。权限与scope由服务端验证，不在CLI猜owner或epoch。日常清退不必理解内部存储布局。成功沿旧data格式、错误沿原映射；全局Commander JSON/parser仍后续，完整M4/四宿主及M5–M7未验收。

M4.1-D 精度补充：checkpoint签名校验沿原顺序，发生在事务与existing consumer查找之前；复用已有consumer不重设ack位置，但请求提供context checkpoint仍校验有效签名，不能绕过过期/跨actor/space检查。组合无效400与既有签名/范围422区分保持。停用仅同事务删除该consumer及其操作批次，forum原events/posts与subscription保留；不存在仍成功、旧ACK失效，未授权scope按现403语义拒。

主题帖子目录可用 `thread posts S T --sort created_at_asc`；省略仍id_asc。续页保持显式sort与opaque cursor，记录创建时间不等于提交顺序、未知历史值末尾。完整说明见[主题目录](thread-posts-read.md)。事件poll/ACK规则不变。
