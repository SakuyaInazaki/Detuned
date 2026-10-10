# M6.4-C.2B — 有界公开评审意见文本检索

状态：根已选择以下路线；依用户最新“我就没让你弄前端”范围，仅服务端/HTTP/CLI/共享工具与既有dsh/Pi/Codex/Claude接入；不规划Web/浏览器实现。本文件与owner候选状态为`root_approved_pending_c2a_seal_new_fresh_dispatch`，仍仅planning。C2A尚未封存，本包未fresh、未放行、未实施、未验证。只有根确认精确owner、C2A整包封存、新fresh与正式dispatch后可改产品。事实依据为同目录`c2b-facts.md`，不重复运行历史证据。

## 根已决定的行为与边界

公开意见采用同一读快照内的有界读时投影，schema5不变，不新建持久FTS/表/索引，不向posts伪造意见身份。最后一位合格评审提交事务的all-row reveal决定公开源可见；sealed即便本人也绝不能进入候选、文本匹配或结果。当前材料/引用证据红删及privacy立即排除。无派生文本副本，故无额外待红删索引。该源明确是字面文本检索，不宣称post FTS匹配/排名语义或100k意见性能认证；现posts行为保持。

### HTTP、查询与游标

沿用GET `/spaces/{space_id}/search`。省略source或明确`source=posts`走现posts；旧默认queryhash/cursor/rowshape不变。显式`source=review_submissions`进入公开意见源。canonical严格query分支、HTTP allowlist、工具分支须一致：

- q仍trim后1–256 Unicode code points；limit1–100/default20；cursor沿<=4096。
- review源仅允许q/source/limit/cursor及可选request_id/target_post_id精确filter；两filter可交集。unknown对象不额外查存在。
- review源拒绝kind/tags/tags_json/thread_id；posts拒绝request_id/target_post_id。未知字段或未知source明确拒绝，不静默丢弃。
- review源归一q为trim后ASCII A–Z折小写，匹配与hash共用该值，snippet展示原文字；不Unicode normalization。新cursor独立purpose=`review_submission_search`，hash显式绑定source、归一q、filters；actor/space/sort=`submission_id_desc`/before_submission_id及原24h expiry。continuation保留首次cursor原exp，不能随翻页刷新24h。不得复用/改变旧posts hash。每页重新核当前ACL，同页readSnapshot；不承诺跨页全集冻结。

### 有界候选与隐私

新增中立StoragePort/SQLite只读接点，获取同space、revealed_at非空且filters匹配的submission metadata IDs。整个过滤域最多预检5001；>5000明确422 QUERY_TOO_BROAD，要求缩小request/target范围。sealed不占该候选预算、不做匹配。候选ID DESC；续页before条件不能规避整个过滤域预算。逐条加载并验证payload/manifest，禁止一次加载全部内容；5000是候选限制而非CPU/SQLite VM硬上限。

复用/提取core intrinsic记录、snapshot在线privacy、post/artifact evidence privacy链，不core→module反依赖，不复制资格/隐私公式。search公开门禁revealed-only；module原own-or-public getter授权和历史读取语义保留。先完成intrinsic request/snapshot/assignment/session/submission/all-reveal一致性验证；缺/坏这些结构必须安全RESYNC_REQUIRED，不能吞成空列表。成功后才调用现online snapshot/post/artifact evidence privacy；现CONTENT_REDACTED（410/GONE）和NOT_FOUND不可见候选跳过，不返回原因/计数，其它错误propagate。捕获仅围绕online阶段，绝不能catch整个调用的所有NOT_FOUND。现online NOT_FOUND对缺失/跨space证据的不可见语义保持；这不声明数据库完整，不新增全局完整性分类。withdraw/revision/policy/cancel/stale本身不擦掉原可见历史。ACL先于详细对象/错误信息。

多取一个真正可见且匹配的结果决定has-more；cursor锚最后实际返回submission ID。不得以跳过的私密候选越过尚未返回结果，不输出sealed计数。review page meta沿`{truncated:false,next_cursor}`；items编码预算沿262144 bytes，超过即QUERY_TOO_BROAD，不静默截断。client既有1MiB取消/错误边界保持。

### 搜索白名单与snippet

仅搜索根已最终确认的以下实际canonical意见字段：

| 公开字段路径 | 现canonical类型/限长 |
|---|---|
| verdict | accept / changes_requested / reject |
| coverage | 非空字符串，16000字符上限 |
| checks_performed | 非空字符串，16000字符上限 |
| pending_requirements[] | 至多32个非空字符串，每个2000字符 |
| limitations[] | 至多32个非空字符串，每个2000字符 |
| independence_statement.statement | 非空字符串，8000字符上限 |

不搜索completion_status、独立性两布尔、内部session/assignment/hash、证据IDs；不JSON.stringify全payload；不加载附件正文或外链。遍历顺序严格按表中六条路径，数组保原顺序，每个字段/数组元素独立字面contains；ASCII A–Z折小写，其它字符原样，不Unicode normalization，不解释FTS/SQL通配符。snippet取第一命中字段中的首match，显示原文字；纯文本最多320 Unicode code points（必要省略符计入），优先给首match前32 code points，保证最大256 code points查询的整个match可见，窗口受字段首尾边界约束。不得搜索内部metadata、跨字段/数组元素拼接或制造分隔符命中。

### DTO与共享入口

新严格DTO真实identity：`type:'review_submission'`、submission_id、space_id、request_id、snapshot_id、target_ref{post_id,revision}、round、reviewer_actor_id、verdict、submitted_at、revealed_at（非null）、snippet。post row不加字段。严格page guard校验整页/schema/日期/space/filters/sort与metadata，不能修正坏响应。ID DESC的guard比较须与SQLite相同：现reviewId canonical schema仅非空字符串（未限ASCII），正式CryptoIdGenerator创建`rsb_<UUID>`ASCII IDs，但不能把该生成器事实当schema约束。SQLite review_submissions.id默认TEXT/BINARY排序；实现可用Node/client均可用的UTF-8字节序比较或等价共享语义，对非法Unicode/编码歧义安全拒绝，不使用localeCompare或仅依赖区域排序。

保client.search既有posts类型；新增typed `searchPublicReviewSubmissions`与严格page guard；新方法先用canonical新query guard拒未知字段/非法组合再转发。旧client.search不改旧类型/行为。同一forum_search新增source及对应filters分支，callTool派发共享client，工具仍9个。CLI search增加--source/--request/--target，旧选项/默认/--page/--cursor行为保持；CLI/tool非法source/filter组合须经canonical预校验拒绝，禁止直接SQL或额外业务判断。

现有dsh/Pi/MCP/Codex/Claude工具接入沿canonical九工具与shared client传播显式source；不启用新宿主、不运行模型、不改全局配置。当前各宿主已认证/未认证边界保持，静态或受控接入检查不得虚报完整真实宿主认证。用户已明确不做前端：现Web与固定reader文件保留且保护，本包不增改Web搜索/展示/意见reader，不运行浏览器验收。

## 验收要求（未运行）

1. 真实SQLite/HTTP正式claim目标、不同合格reviewer与真实session/complete submissions；reveal前包括本人sealed全入口搜不到；最后提交事务才可见，受控回滚无半公开。不得SQL伪造formal状态。
2. target/dependency/public artifact/已引用private evidence红删后立即排除；unused private upload红删不误排除意见。现ACL/跨space/filter/cursor隔离；cancelled/stale历史仍按privacy可搜。online合法排除与intrinsic损坏RESYNC分别覆盖，缺失/跨space证据按现NOT_FOUND隐藏，不称数据库完好。
3. 字面中文/ASCII/1/2/3codepoints/百分号/下划线/引号/星号等，不借用FTS或LIKE通配语义；只白名单字段，无session/hash/evidence ID/附件正文命中。
4. 候选预算绑定整个过滤域、cursor不能规避；limit/byte/snippet/has-more/跳过不可见行/fixedref边界。可真实SQLite小阈值验证有界port，再受控guard验证默认5000；准确标注测试层，不称真实5000正式创建或大规模认证。
5. HTTP/sharedclient/forum_search/CLI与旧post语义、默认posts返回类型/游标兼容；既有dsh/Pi/MCP/Codex/Claude工具/schema/sharedclient接线仅按已允许的受控/static入口验证，不启用新host或模型。坏transport证据与真实SQLite权限证据分开。不做Web/浏览器验收。
6. 必要旧posts search、review read/submission/privacy、C2A知识视图回归；D统一唯一串行窗口，首次失败保留。新fresh前不得预填命令或成功数量。

## 最小接点事实与根定稿分类

现canonical字段支持全部上述白名单。现privacy/intrinsic helpers、同readSnapshot和metadata IDs SQL可支撑既定路线，但空间级bounded revealed候选port、独立cursor与DTO目前不存在。

根已定稿错误分类：现直接读取等价门禁保持，不扩大getter error语义。intrinsic request/snapshot/assignment/session/submission/all-reveal结构/绑定损坏→安全RESYNC_REQUIRED；online privacy阶段的合法redacted/410与现NOT_FOUND→不带原因/计数排除；其它错误原样propagate。缺失/跨space证据属于现online NOT_FOUND不可见，不新增“DB完好”断言。实现用新core helper的分阶段明确try边界，复用既有函数；不得吞intrinsic错误或跨整个调用catch NOT_FOUND。

全量候选preflight与cursor候选取页需要在同一个outer snapshot中执行；新port具体名称为owner候选内部接点，可在根定稿时调整。旧post cursor哈希不能含新增默认source字段；默认/explicit posts保持旧绑定。各端仅解码/转发，不复制资格。

## 精确所有权与保护

owner候选见`m6-4-c2b-owner-candidates.json`，实际路径已静态核对；new文件不存在且不创建占位。候选不是dispatch许可。主代理选择边界，作者仅确定owner路径实施；D唯一执行；交叉审查和source freeze之后才放运行窗口。

schema.sql/schema.ts、DDL/SQL迁移/profile历史fixtures、bootstrap/offline-upgrade/backup/restore/export/import、依赖/lock、旧封存review包、全部Web/reader/browser路径、M7、新host/模型/VM/全局配置均默认保护。本包无public export family扩展，无部署/发布/推送。C2A先封存，新fresh后再正式dispatch；不得抢D当前窗口。
