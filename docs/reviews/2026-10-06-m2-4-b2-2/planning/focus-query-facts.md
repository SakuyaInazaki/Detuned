# focus query 现有能力事实核对

2026-10-06，独验期间父授权仅只读事实；唯一本产物，不实现或运行产品/tests/build，不改验收hash。下面是当前源码事实，不是下一包筛选算法、性能承诺或DDL方案。

## pinned_refs：没有候选硬上限

protocol/spaces.ts:56与:90是Type.Array(PostRefSchema)，没有maxItems或uniqueItems。core/services/space-service.ts:170–177保存req.pinned_refs或旧数组，无排序/数量裁剪。storage-sqlite/sqlite-storage.ts:255 JSON.stringify、:273 JSON.parse保数组顺序。context-service.ts:59–74按stored数组从头逐项遍历所有候选，没有slice/硬上限或去重；仅isPostRef、同space、active、summary、固定revision存在才进入结果。合格项顺序是数组原顺序，重复合法ref可重复结果。projectSummarySources也逐source_refs投影（knowledge-projection.ts:36–39），没有候选cap。

context-service.ts:152–165先判必要规则投影，再按recent_activity→recent_failures→blocking_objections→pinned_summaries顺序pop尾直到字节fit；这是读取完后的响应裁剪，不是pinned候选查询硬上限。不能以输出被预算压小推断读取工作已受硬cap。

## failures搜索现能力与预算先后

StoragePort storage.ts:161–168已支持filters {kind,tags,thread_id}、limit/cursor与可选SearchReadBudget。sqlite-storage.ts:1252–1296在事务中JOIN当前post_revision，强制同space、active（:1265），kind :1268与thread_id :1269同时参数化；q空走普通JOIN，不调用FTS/LIKE正文匹配，snippet使用summary。排序为p.id DESC、cursor p.id < ?、limit+1检测更多（:1273/:1289–1294），不是按created_at最新。storage默认limit20，本身不校1..100；外层HTTP/shared normalize负责limit范围。

可选budget :1274–1281在输出page前选至max_candidates+1候选，超出422；对于LIKE路线在追加LIKE正文匹配:1283之前，对FTS是已MATCH后的集合。没有budget就没有此预检；limit只限制输出，不等于总候选cap或SQL VM时间上限。SearchService :29–39刷新身份/space权限、normalize后向storage传max_candidates，再对result.items JSON字节作422判断；这是数组bytes，不是context完整envelope预算。现context-service.ts:94直接searchPosts(spaceId,'',{kind:'failure'},5)，没有thread_id或budget；合格failures再查当前row/revision :97–100。直接storage q空+kind failure+thread_id查询能力已经存在，不必为此新Port。HTTP search要求非空q（server/routes/search.ts:26），不能把内部空q直接当现HTTP合法用法。

## open challenges 与refs/公开材料

StoragePort :119 listOpenChallenges(spaceId,targetPostId?,targetRevision?)无thread/limit/order参数。sqlite-storage.ts:835–850筛同space、type challenges、state open，可加targetpost/revision；无ORDER BY/LIMIT，也不在SQL连接端点thread或过滤lifecycle。现context :77–81先取全空间数组、slice(0,10)，再projectRelation；被投影拒的前10项不会从后续补足，当前顺序不是有SQL保证的顺序。

knowledge-projection.ts:41–46检查relation.space/type，再projectSource生成固定source_ref/target_ref；projectSource :30–34确认post同space及固定revision存在，unavailable relation不输出。active/withdrawn/redacted状态保留，redacted的has_newer_revision为null；没有relation.visibility字段（schema.sql:115–127）。context :82–89两端redacted时issue/impact=null，不泄此正文材料。不能把“公开状态过滤”描述成只有active端点：现投影明确包含withdrawn/redacted状态，而空间ACL由context前置检查。

relation-service.ts:60–76创建时已校source/target同space及固定revision。Post.thread_id现就在findPostById返回Post中（StoragePort :101；sqlite-storage.ts:650），业务层/同readSnapshot可据该字段确认任一端点所属thread；projectRelation当前投影只输出refs/author/status而不输出thread_id。现listRelationsByTarget :830–832仅target，排序created_at ASC,id ASC，没有直接“任一端点属于thread”的查询。

## events列、现公开投影与thread关联

schema.sql:193–204 events只有id/space_id/seq/type/object_id/revision/visibility/actor_id/created_at，**无独立thread_id列、无JSON payload**。protocol/events.ts:33–43与storage.listEventsAfter :1008–1025同字段。现context :117–126取space高水位最后至多5个seq位置区间、seq ASC，之后仅visibility public，投影type/object_id/occurred_at，不输出refs/thread/revision；非public候选会使输出少于5，不会额外补抓。

现event-service.ts:194–219订阅线程关联已有对象映射事实：thread.*直接object_id；post.*通过findPostById(object_id).thread_id；relation.*查relation，再查source/target Post，任一thread匹配；其它事件在配置thread_ids时continue。该现实现只是关联可复用事实，poll还创建delivery batch/更新consumer（:228–240），不能为了只读context直接调用poll。

现可直接通过object_id关联的Thread事件是thread.created/thread.updated（protocol/events.ts:5–6，thread-service.ts:113/:278实际写public）。Post created/revised/withdrawn/redacted分别以post object_id、关系created/resolved/reopened以relation object_id，需上述对象映射，不是events列直接thread过滤。space.revised是space对象、artifact.created/redacted是artifact对象；EventTypeSchema :16–21还列review/check类型，schema声明不等于本阶段实现/公开可用，也没有现thread关联分支。context严格public过滤不等于任意事件都能关联focus thread。具体public写入在space-service.ts:102–105、post-service.ts:182–185/:345–348/:410–413、relation-service.ts:123–127/:235–239/:330–334、artifact-service.ts:72–73、redaction-service.ts:111。

## 现索引与最小Port事实缺口

schema.sql唯一显式CREATE INDEX是:206 idx_events_space_seq(space_id,seq)，加events UNIQUE(space_id,seq) :203，可供现空间seq范围查询。events.id PK可供对象事件id lookup；posts.id PK、post_revisions(post_id,revision) PK、relations.id PK及:127同space端点组合UNIQUE可供对象/ref查询。posts.thread_id没有显式独立索引，events无(type,object_id)/thread索引，relations没有thread列或显式thread索引。schema.ts内镜像同一DDL；storage-sqlite/src全量只读rg CREATE INDEX只发现同一idx_events_space_seq，未写DDL/做EXPLAIN或宣称query planner路径。

已经足够的Port：findThreadById、findPostById、getPostRevision、searchPosts(thread_id+kind)与readSnapshot。**若父要求直接数据库内有界thread候选而不是空间全量后筛**，目前缺的是：

- 开放challenge的thread端点关联查询，同时接收明确候选limit与父选定顺序；现listOpenChallenges无thread/order/limit。
- 公开事件按thread对象/端点关联的有界候选查询，同时接收seq边界与limit；现listEventsAfter仅space/afterSeq/ASC limit，无thread/public条件，不能直接取“该thread最近N公开事件”。

这里只列需要表达的接口能力，不定名称/排序/任一或仅target筛选/算法/DDL。pinned ref可逐findPost确认thread，不缺lookup Port，但现候选无硬上限；是否加候选上限及兼容条件由父决策。

## 既存focus400正式断言位置

core context-service.ts:39–40当前对任何显式focus_thread_id抛400（授权之后）。integration/m2-context.test.ts:55–60 C03对foreign-thread和空字符串必须拒；:67–69撤credential时带focus应401，保持权限前置语义。contracts/m2-context-contracts.test.ts:72–76 实际HTTP focus_thread_id=thread及空值400，tool显式thread同400。protocol/search.ts:80 schema描述当前不支持，CLI index.ts:306/312 help/透传同现状态；此处仅记录，不改这些断言/规范。

阶段结束停写；本材料不代表focus已实现或规划冻结，不影响当前B.2.2独验。只读搜索两次误指不存在knowledge-read-service/migrations路径，随后用rg --files及实际knowledge-projection/schema定位；没有运行产品或改旧证据。
