# M2.3 Unit A 精确规划（待父冻结，未实施）

已读最新AGENTS/README/docs00/08/11、docs03/04/09、上包next-task/facts与M2.2-B已通过报告。M2.2 A+B本机238/238、当前版本化29/29结论保持。仅本planning文件及临时机制实验；未改产品/正式测试/旧材料、未跑产品suite或10万基准。

## 官方依据与机制证据

- [SQLite FTS5 trigram](https://www.sqlite.org/fts5.html#the_trigram_tokenizer)：子串查询，默认case_sensitive=0、remove_diacritics=0；MATCH少于3 Unicode字符无匹配；带ESCAPE的LIKE不能用trigram索引优化。
- [SQLite LIKE](https://www.sqlite.org/lang_expr.html#like)：默认ASCII大小写不敏感，非ASCII大小写敏感；ESCAPE可把%、_与转义字符本身变成字面。
- [FTS5 strings](https://www.sqlite.org/fts5.html#fts5_strings)：双引号字符串/内部双引号双写可安全表达phrase，不让文本直接成为操作符。

`sqlite-mechanisms.cjs` 仅独立内存表机制实验，`sqlite-mechanisms.json`原始结果：Node26.3.0/SQLite3.53.4。中文1/2/3、emoji、%、_、反斜杠、引号、AND/a*b/NEAR(x)、ASCII及Æ/æ，另JSON精确tag全部匹配。具体“😀图”UTF16=3/码点=2，MATCH[]但LIKE命中；“😀😀”同样。Æbc/æbc在MATCH都命中两种大小写，LIKE分别只命中自身。Case与case tag精确不同，'a,b'作为单标签匹配。

这些不是产品测试。建议字面合同：q仅trim、码点1–256；1/2码点LIKE转义，3+安全phrase MATCH；ASCII两分支大小写不敏感，非ASCII保留SQLite各分支现语义并明确差异，不改tokenizer/DDL、不加NFC/ICU。若父要求所有长度统一Unicode大小写语义，须另行裁决，不能假装已有一致。

## 读取/标签接口

现StoragePort.searchPosts:156及sqlite-storage:1237输入cursor是裸before_id，SQL ID DESC；tags虽传入完全未过滤。建议保留现storage签名及返回next_cursor内部裸ID，由core把它封装为绑定cursor；storage不认HTTP签名/actor，core授权/验证后传只读位置。可将参数名cursor改beforeId但保持顺序/可选性，新增末尾budget对象（见下），不破坏view内部空q候选调用。

```ts
export interface SearchReadBudget { max_candidates: number; }
searchPosts(spaceId:string,q:string,
 filters?:{kind?:string;tags?:string[];thread_id?:string},
 limit?:number,beforeId?:string|null,budget?:SearchReadBudget
):{items:SearchResultItem[];next_cursor:string|null};
```

tags全部匹配：每个归一标签用参数化 `EXISTS(SELECT 1 FROM json_each(r.tags) WHERE type='text' AND value COLLATE BINARY=?)`，kind/thread/space/active/beforeId同WHERE，**先完整过滤再limit+1**。数组[]不加条件，去重；精确大小写，不用FTS文本。无DDL/新依赖。老正常r.tags存JSON数组；损坏JSON不能偷偷当空，目前schema并不证明每历史值JSON合法，本包错误边界若发现实际反例先报父。

HTTP tags_json/CSV及逻辑query归一由B共享定义：JSON数组元素不trim，CSV保持旧trim/丢空元素；core接收到的逻辑tags去重后排序供cursor绑定（JS字符串字典序、大小写原样），省略和[]统一[]。q trim，kind/thread省略统一null；不做NFC。tags_json与tags互斥，client优先JSON传输，不改tool filters.tags数组含义。查询tag数量/元素/JSON长度边界由B规划父批准，不顺手改写入规则。

## 签名/时钟/组合根及cursor建议

app.ts:60–65已有tokenSigner和持久instance secret（可注入），clock:57、hasher:59；SearchService:77当前只注storage/auth。TokenSignerPort sign/verify在ports/token-signer.ts:3–5；HmacTokenSigner用标准HMAC-SHA256与timingSafeEqual，verify内部Date.now检查exp；ClockPort已有now/nowIso。

建议SearchService构造增加**可选显式**dependency object（保持getView嵌入旧调用兼容）：

```ts
interface SearchCursorDependencies {
 signer:TokenSignerPort; secret:string; clock:ClockPort;
}
constructor(storage:StoragePort,authService:AuthService,
 cursor?:SearchCursorDependencies,
 limits?:{max_candidates:number;max_response_bytes:number});
```

正常app显式注已有signer/secret/clock（B负责app接线）；无cursor依赖的getView保持，search应明确TEMPORARILY_UNAVAILABLE500，不造固定密钥/无签名成功。现唯二构造点app.ts:77、tests/integration/m2-knowledge-views.test.ts:13后者仅getView无需改。若父偏好必填构造，则只这个旧测试需批准签名适配，业务断言不变。

建议payload完整白名单：

```ts
{v:1,purpose:'search',actor_id:string,space_id:string,
 q:string,filters:{kind:PostKind|null,thread_id:string|null,tags:string[]},
 sort:'id_desc',before_id:string,exp:number}
```

完整字段是可读签名而非加密，不含秘密；不持久缓存材料。limit不绑定，允许改页大小；位置必须非空字符串、字段严格/exp安全整数。相同q/filters归一后再绑定，绝不拿旧裸ID自动降级。建议TTL24h（与现checkpoint相同候选），exp=floor(clock.now()/1000)+86400。签名失效/错用途/错actor-space-q-filter-sort/旧ID/过期统一RESYNC_REQUIRED422、retryable=false、message明确重新取第一页；现枚举无CURSOR_INVALID，不新增码。当前权限先检查，故无权请求仍原401/403/404，不用cursor错误泄漏空间。

时钟最小建议TokenSignerPort.verify(token,secret,nowSeconds?:number)，Hmac实现缺省Date.now/1000保持所有旧调用；search传clock秒，避免可注入clock被verify实际时钟抢先覆盖。该可逆签名变更由父批准并明确A所有权，现event/context旧调用不重写。B可共享schema guard做payload/length验证；core判断当前绑定/expiry业务。验证前cursor字符长度由B明确，如8192候选；超界不能任意截断token。

顺序：refresh/auth→归一有效query→验证payload/signature/bindings→storage过滤+排序读取→测响应预算→将storage末项ID签名（只hasMore）→HTTP meta.next_cursor。ID DESC非时间/相关性/快照；并发新帖与修订不保证跨页快照。重启持久secret稳定，当前权限重新查，不改历史hash/幂等。

## QUERY_TOO_BROAD缺口与最小预算建议

docs04:177明确扫描/响应预算超限QUERY_TOO_BROAD、:204 status422。当前只错误枚举，无任何search budget/throw。better-sqlite3当前JS接口未暴露SQLite progress handler/interrupt（lib/types仅backup progress），不能假称SQL VM步数/CPU硬限时。

建议本包明确**候选基数+响应字节预算**，默认候选5000、core编码data结果256KiB（参数正safeint，可定向测试注低限）；不声称完整扫描CPU或10万性能：

- 短LIKE：预查同space/active/kind/thread/tags/before位置限定候选ID，`LIMIT max_candidates+1`；超限直接422，缩条件提示，**不在前N候选跑LIKE后以[]冒充全空间无结果**。候选在限额内则对整个该集合完成字面搜索/排序；预检与主读取建议同storage读事务快照，防中间写入使预算证据漂移。
- 长FTS：MATCH+属性筛选候选ID `LIMIT max_candidates+1`，超限422；在界内再读取完整匹配页。匹配候选数量预算不等于FTS内索引工作或tag EXISTS扫描有硬上限。
- core完成过滤页后JSON.stringify(items) UTF8字节>max_response_bytes即422，不静默truncate。HTTP envelope/cursor额外字节另明示，不冒充M2.4完整响应硬预算。views内部空q既有路径不自动施加新search预算，避免M2.2候选行为被此包改变。

父需裁决常数/预算范围及读事务接口：现storage.transaction为immediate写事务，不建议为只读搜索借它锁写；SqliteStorage内部`db.transaction(()=>...)()`默认deferred只读一致性即可，无新port事务框架。严格防所有扫描work失控需要驱动扩展/更大路线，此包不声称解决。

## 有限正式反例与旧调用适配范围

新tests/integration/m2-search.test.ts先最小产品失败：tags原不生效、😀图误分支、同query多页/绑定拒绝、修订/撤回/脱敏两分支无旧词；然后中文/emoji/符号/大小写差异、kind/thread/tag组合先分页、CSV与JSON、权限先cursor、TTL/篡改/裸ID重取第一页；候选低限+远位置真匹配必须422不能[]，响应低限422。保持M2.1/M2.2回归，不跑10万长压测。

旧测试无需修改已知断言：r4-c-route-contracts:G03 cursor不是search续页，tags空仍200；r4-c-contracts:C01-8 enum验证保持；m1-discussion search外人404；AA01 needle正常保留。若新预算使旧setup不合法先报准确反例，不改旧probe/证据。app组合根必须接新依赖；client search(meta)继续已有envelope，但forum_search callTool:755–765现在只返回data丢meta——工具有cursor输入却无法取得next_cursor，**B需提出最小公开返回/兼容策略供父冻结**，不把HTTP可续页说成tool也已可续页。

本规划涉及A候选search-service/new cursor helper、StoragePort/sqlite-storage只读预算/标签、token-signer可选now参数、新测试、docs03/ADR；B协议/query/client/app接线及docs04。禁止DDL/迁移/新依赖/历史hash变化。父冻结精确预算、TTL/error、无backend构造和工具续页合同后实施；当前停留规划。

### 与B事实对齐/需父最后裁决

B核实历史tool/core写tag未完整继承HTTP20/48约束，查询不能悄悄套20/48。B建议保持Array(String)，仅tags_json承载UTF8≤8192、cursor≤16384码元（均待父批准）；core去重不trim元素，CSV旧行为不变。q共享schema需避开TypeBox与AJV长度单位差异：B将做码点规则，core Array.from(trimmed).length，不令tool提前拒绝合法emoji。

共享预算数字应由protocol独占导出，建议 `SEARCH_MAX_CANDIDATES=5000`、`SEARCH_MAX_RESPONSE_BYTES=262144`、tags_json与cursor边界/TTL等同一来源；A/B不可各写数字。预算代价：短LIKE即使最终匹配很少，只要该页位置之后的属性候选>上限，也保守拒绝，使用者必须缩kind/thread/tags；属性候选预查本身以及长FTS匹配计数SQL可能仍读很多索引/行，不是CPU硬上限。不会只查前N条后说没结果。B建议cursor错误VALIDATION_ERROR400（A候选RESYNC_REQUIRED422），父冻结唯一错误后双方统一，绝不新增码或隐式裸ID降级。

## 父预裁定后的最终补核（取代上文cursor候选）

TTL24h；**所有cursor错误400 VALIDATION_ERROR、retryable=false，统一提示“搜索游标无效，请重新获取第一页。”** 当前授权先核；不细分泄漏签名/绑定/过期原因。载荷改为：

```ts
interface SearchCursorPayload {
 v:1; purpose:'search'; actor_id:string; space_id:string;
 query_hash:string; sort:'id_desc'; before_id:string; exp:number;
}
interface SearchCursorDependencies {
 signer:TokenSignerPort; secret:string; clock:ClockPort; hasher:HasherPort;
}
```

精确hash输入为 `hasher.sha256(hasher.canonicalJson({q:trimmedQ,filters:{kind:kind??null,thread_id:threadId??null,tags:[...new Set(tags??[])].sort()},sort:'id_desc'}))`。HasherPort（ports/hasher.ts:3–5）现sha256(string|Buffer):string、canonicalJson(unknown):string；CryptoHasher使用Node标准SHA256输出hex，canonicalJsonStringify对象键排序、数组顺序保持。因此标签先去重排序，filters键顺序输入不影响结果；大小写/空字符串标签保留，q只trim，省略/[]tags同义，limit不绑定。输入只含已验证字符串/null/数组，无数字表示或undefined差异，不声称整个实现是RFC8785/JCS。载荷query_hash必须64位lowercase hex，结构严格白名单，签名后core比较绑定。

`verify(token,secret,nowSeconds?)`已父批准，缺省保留旧Date.now/1000，search传clock.now().getTime()/1000；search同时严格exp整数与TTL约束。既有event/context调用不重写。app已拥有hasher/signer/clock/secret，组合根可同object注入，不复制hash函数/crypto路线。

预算预裁定：候选5000与items编码262144字节；短LIKE完整属性候选、长FTS匹配候选cap+1检查必须在同一个storage deferred读事务与正式页读取中保持一致。内部空q view路径不施新预算，也不依赖signer；候选/响应预算不等于VM/CPU或envelope硬上限。

### 搜索字段差异与最小接线请求

源码确认FTS建索引包含title/summary/body及 `revision.tags.join(' ')`（sqlite-storage:565–578），长q的MATCH检索所有indexed列，包括tags；短LIKE只title/summary/body（:1299），所以纯标签词“图”“失败”会有长度导致的字段假阴性。**建议本包仅增加短LIKE的 `OR EXISTS(SELECT 1 FROM json_each(r.tags) WHERE type='text' AND value LIKE ? ESCAPE '\\')`**，使用同字面pattern参数，让短词也检索存储标签元素，独立于属性tag全匹配。不改tokenizer/DDL、不删长FTS现tags命中、不改snippet标题路线；这是需父批准的一条最小字段接线。FTS长q仍对join(' ')索引，可跨标签分隔空格匹配，短LIKE逐元素不造JSON括号/引号误匹配；此差异要文档明确，不能假称两路径完全同实现。

对外字面/大小写限制建议保持已核实行为：搜索不提供用户FTS运算符，安全phrase/LIKE逃逸保证符号为输入文本；ASCII大小写不敏感；非ASCII短LIKE依SQLite默认精确大小写，3+默认trigram依其casefold，**不承诺所有长度Unicode大小写统一**。无NFC、去音符或新语义转换。若父希望统一非ASCII大小写，需要额外裁决，不能以本包加入未经批准的casefold函数/后过滤而造成新假阴性。

父已批准短LIKE对json_each(r.tags)每个text元素增加字面匹配，不在raw JSON文本LIKE；tags属性AND精确条件独立于q，候选预算定义不变。大小写保留SQLite两分支现特性并明示差异，不新增fold/tokenizer。Hasher/canonicalJson复用已批准；仍等待B最终字段表与父实施授权，本补核没有改产品。
