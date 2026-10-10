# M4.1-A 读取与诊断接口事实（2026-10-08）

只读核当前源码；未修改产品/冻结文档、未运行测试或安装。主路线读取/诊断/searchpage由父已选，精确命令契约待fresh后冻结。B.2已按有限范围由父接受，当前证据以本包README/verification为准，不复制计数。

1. **Client可匿名构造，无需改变受保护路径。** `packages/client/src/client.ts:165` DetunedClientOptions.token?:string；:191构造直接存optional token，不拒undefined或空字符串。:204 request URL始终base+/api/v1+path，:220仅token truthy时加Authorization。`getCapabilities(opts?:{signal})` :554直接request('/capabilities')，没有独立anonymous开关，但no-token client已经匿名。标准server `app.ts:253`仅按protocol `request-policies.ts:29`精确route模板白名单 capabilities/health/live/health/ready跳过auth，其他仍401；无需泛化请求auth策略。

2. **现health导出是envelope schema，并没有独立data type别名。** `protocol/src/operations.ts`导出 LivenessEnvelopeSchema / ReadinessEnvelopeSchema；分别 data {status:'alive'} / {status:'ready'}；同文件 FileSample、StorageOperationalStatus、OperationsDiagnostics及schema，diagnostics envelope已存在。client:558 `getDiagnostics(opts?:{signal})`已薄request<OperationsDiagnostics>('/admin/diagnostics')。没有 getLiveness/getReadiness；可增加两个薄wrapper通过现request拿data/meta，不改变protected请求/重试/取消语义。成功request:435仅返回 {data:json.data,meta:json.meta}，丢弃api_version/request_id；不要误称wrapper返回原envelope。server operations.ts:9健康未ready是503 SERVICE_NOT_READY/retryabletrue/details{ready:false}，使用既有错误处理，不转换为假成功Boolean。

3. **CLI空token和tokenfile失败路径已有匿名能力。** `cli/src/index.ts:84–98` getClient：URL取显式url→DETUNED_BASE_URL→localhost；token取显式token ?? DETUNED_TOKEN，falsey时才读DETUNED_TOKEN_FILE trim，read失败catch忽略；无token也直接newclient。空显式token仍可能fallback到env tokenfile，而不是强制匿名。健康无token正常调用不需要factory大改；若父要严格“health不读取tokenfile”则只该命令匿名composition，不能本包静默改全局凭据fallback规则。当前没有health/diagnostics CLI命令；--token-file全局option与统一Commander错误框架均在本轮范围外。

4. **现列表/view与已有CLI命令。**

| Client真实签名/路径 | 成功data与分页 | CLI现有语法/冲突点 |
|---|---|---|
| :566 listSpaces(limit?,cursor?,opts?{signal}) → GET /spaces | any[]，HTTP真实Space[]；meta{truncated:false,next_cursor:string或null}，默认20、1..100；route只接受limit/cursor（spaces.ts:22） | 已有root `space`，其子命令 `space read <space-id> --revision --max-bytes --cursor`（CLI:420），不能再注册重复root space；可在既有group下补list，父冻结名称。 |
| :599 listThreads(spaceId,state?,limit?,cursor?,opts?) → GET /spaces/:space/threads | any[]，HTTP真实Thread[]+同meta，默认20/1..100；state仅open或archived（threads.ts:30） | 已有root thread及 `thread posts <space-id> <thread-id> --limit --max-bytes --cursor`（:446）；posts是有界元数据目录，不能把新list吞成其语法。 |
| :668 listPostRevisions(spaceId,postId,limit?,cursor?,opts?) → GET /spaces/:space/posts/:post/revisions | any[]，完整PostRevision[]+同meta，修订号DESC；cursor旧目录实现revision文本（sqlite-storage.ts:702），不是固定内容的签名cursor。redacted投影title/summary/body=[REDACTED]、tags[]/structured{}，hash redacted（:724）。 | 已有 `post read <space-id> <post-id> --revision --max-bytes --cursor`（:432）固定内容JSON chunk。新revision目录应独立子命令，不能替换read含义。 |
| :772 getView<N extends ViewName>(spaceId,name,opts?) → GET /spaces/:space/views/:name | ViewResponseData<N>数组；findings/failures/open-questions三种（protocol search.ts:166–177），现route search.ts:54返回data、没有分页meta；不假造next_cursor | 当前无view CLI。不得把普通findings/review帖子包装正式批准。 |

旧root `read --space --kind thread|post --id [--revision]`（CLI:506）仍独立：输出res.data，thread只首批旧语义；新命令不能覆写其兼容输出。root context/search/publish/relate/subscribe/poll/ack及export/backup/restore/import/migrate也已有注册。

5. **searchPage实际已有client page能力，缺CLI保meta与cursor。** 真实方法叫 `search(spaceId,query:SearchQuery,opts?):Promise<SearchPage>`（client:753），没有searchPage名字；query{q,kind?,tags?,thread_id?,limit?,cursor?}，q先trim，tags转tags_json完整JSON，其他字段原样转。protocol search.ts:31 limit1..100，默认规范化20，cursor非空≤4096；q1..256码点、tagsJSON≤8192bytes/去重≤100。SearchPageSchema:76是 {data:SearchResultItem[],meta:{truncated:false,next_cursor:string|null}}；item包括post_id/revision/thread_id/kind/title/summary/tags/snippet/created_at，不含整body。cursor签名/当前权限/过滤绑定由服务端既有规则判定。

CLI root search:483只有--space/--query/--kind/逗号--tags/--limit(default20)，limit现在parseInt，**无--cursor/--thread**，:500只printOutput(res.data)，丢meta。父可冻结新search-page命令或显式page输出分支；保原search data-only兼容，不在client重复游标业务。非法limit/未知query应走既有HTTP合同，不自行扩全局Commander处理。

## 最小所有权建议（待父精确冻结）

client/src/client.ts：两个health薄wrapper（diagnostics已有），必要page静态type收窄，不改底层request。CLI/src/index.ts：新增读取/诊断命令、在现groups补子命令、显式page/cursor输入及整page输出；现旧命令输出保留。若需要data type别名仅protocol/operations.ts/index.ts窄补，否则复用schema/typed literals，不新增server/core/storage或auth业务。配套新M4 read contract/真实CLI tests与guide/compatibility由父按文件分配；不改旧宿主fixture或B.2正式测试。测试只HTTP/真实CLI，宿主Agent/模型、全局tokenfile/身份管理、附件流与server业务均不在M4.1-A。
