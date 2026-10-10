# M6.4-C.2B — 有界公开评审意见文本检索

状态：根已选择以下路线；本文件与owner候选仅planning。C2A尚未封存，本包未fresh、未放行、未实施、未验证。只有根确认精确owner、C2A整包封存、新fresh与正式dispatch后可改产品。事实依据为同目录`c2b-facts.md`，不重复运行历史证据。

## 根已决定的行为与边界

公开意见采用同一读快照内的有界读时投影，schema5不变，不新建持久FTS/表/索引，不向posts伪造意见身份。最后一位合格评审提交事务的all-row reveal决定公开源可见；sealed即便本人也绝不能进入候选、文本匹配或结果。当前材料/引用证据红删及privacy立即排除。无派生文本副本，故无额外待红删索引。该源明确是字面文本检索，不宣称post FTS匹配/排名语义或100k意见性能认证；现posts行为保持。

### HTTP、查询与游标

沿用GET `/spaces/{space_id}/search`。省略source或明确`source=posts`走现posts；旧默认queryhash/cursor/rowshape不变。显式`source=review_submissions`进入公开意见源。canonical严格query分支、HTTP allowlist、工具分支须一致：

- q仍trim后1–256 Unicode code points；limit1–100/default20；cursor沿<=4096。
- review源仅允许q/source/limit/cursor及可选request_id/target_post_id精确filter；两filter可交集。unknown对象不额外查存在。
- review源拒绝kind/tags/tags_json/thread_id；posts拒绝request_id/target_post_id。未知字段或未知source明确拒绝，不静默丢弃。
- 新cursor独立purpose=`review_submission_search`，hash显式绑定source、归一q、filters；actor/space/sort=`submission_id_desc`/before_submission_id及原24h expiry。不得复用/改变旧posts hash。每页重新核当前ACL，同页readSnapshot；不承诺跨页全集冻结。

### 有界候选与隐私

新增中立StoragePort/SQLite只读接点，获取同space、revealed_at非空且filters匹配的submission metadata IDs。整个过滤域最多预检5001；>5000明确422 QUERY_TOO_BROAD，要求缩小request/target范围。sealed不占该候选预算、不做匹配。候选ID DESC；续页before条件不能规避整个过滤域预算。逐条加载并验证payload/manifest，禁止一次加载全部内容；5000是候选限制而非CPU/SQLite VM硬上限。

复用/提取core intrinsic记录、snapshot在线privacy、post/artifact evidence privacy链，不core→module反依赖，不复制资格/隐私公式。search公开门禁revealed-only；module原own-or-public getter授权和历史读取语义保留。合法红删/当前不可见候选排除；持久损坏/不一致安全RESYNC_REQUIRED，不能吞成空列表。withdraw/revision/policy/cancel/stale本身不擦掉原可见历史。ACL先于详细对象/错误信息。

多取一个真正可见且匹配的结果决定has-more；cursor锚最后实际返回submission ID。不得以跳过的私密候选越过尚未返回结果，不输出sealed计数。items编码预算沿262144 bytes；client既有1MiB取消/错误边界保持。

### 搜索白名单与snippet

仅搜索这些实际canonical意见字段（供根最终确认）：

| 公开字段路径 | 现canonical类型/限长 |
|---|---|
| verdict | accept / changes_requested / reject |
| coverage | 非空字符串，16000字符上限 |
| checks_performed | 非空字符串，16000字符上限 |
| pending_requirements[] | 至多32个非空字符串，每个2000字符 |
| limitations[] | 至多32个非空字符串，每个2000字符 |
| independence_statement.statement | 非空字符串，8000字符上限 |

不搜索completion_status、独立性两布尔、内部session/assignment/hash、证据IDs；不JSON.stringify全payload；不加载附件正文或外链。每个白名单值做字面contains；ASCII A–Z折小写，其它字符原样，不Unicode normalization，不解释FTS/SQL通配符。snippet在第一个match周围，纯文本<=320 code points且必要省略符计入；不得在内部metadata或跨字段拼接上产生隐藏匹配。实现须记录稳定白名单遍历顺序，字段分隔不能制造跨字段命中；根尚未指定多命中时snippet窗口分配，按可审阅有界实现落实。

### DTO与共享入口

新严格DTO真实identity：`type:'review_submission'`、submission_id、space_id、request_id、snapshot_id、target_ref{post_id,revision}、round、reviewer_actor_id、verdict、submitted_at、revealed_at（非null）、snippet。post row不加字段。严格page guard校验整页/schema/日期/space/filters/sort与metadata，不能修正坏响应。

保client.search既有posts类型；新增typed `searchPublicReviewSubmissions`与严格page guard。同一forum_search新增source及对应filters分支，callTool派发共享client，工具仍9个。CLI search增加--source/--request/--target，旧选项/默认/--page/--cursor行为保持；禁止直接SQL或额外业务判断。

Web search增加显式“帖子/公开评审意见”源选择；意见结果显示真实评审身份、固定对象、轮次和意见snippet。完整意见用现getReviewSubmission共享client读，现服务重新核privacy；固定对象用既有固定post reader。不将意见verdict伪称最终接受或真实验证通过。附件/正文按既有安全入口，红删后重读失败如实提示；source/space/logout切换与迟到response安全必须验。C2A findings/failures保持当前行为。必要新组件候选在owner JSON，不修改受保护review-panel.tsx。

## 验收要求（未运行）

1. 真实SQLite/HTTP正式claim目标、不同合格reviewer与真实session/complete submissions；reveal前包括本人sealed全入口搜不到；最后提交事务才可见，受控回滚无半公开。不得SQL伪造formal状态。
2. target/dependency/public artifact/已引用private evidence红删后立即排除；unused private upload红删不误排除意见。现ACL/跨space/filter/cursor隔离；cancelled/stale历史仍按privacy可搜。合法排除与损坏RESYNC分别覆盖。
3. 字面中文/ASCII/1/2/3codepoints/百分号/下划线/引号/星号等，不借用FTS或LIKE通配语义；只白名单字段，无session/hash/evidence ID/附件正文命中。
4. 候选预算绑定整个过滤域、cursor不能规避；limit/byte/snippet/has-more/跳过不可见行/fixedref边界。可真实SQLite小阈值验证有界port，再受控guard验证默认5000；准确标注测试层，不称真实5000正式创建或大规模认证。
5. HTTP/sharedclient/tool/CLI/Web与旧post语义。Web源切换、完整意见、固定对象、红删重读、space/logout/late-response、390px。纯parser/坏transport证据与真实SQLite权限证据分开。
6. 必要旧posts search、review read/submission/privacy、C2A知识视图回归；D统一唯一串行窗口，首次失败保留。新fresh前不得预填命令或成功数量。

## 最小接点事实与待根定稿问题

现canonical字段支持全部上述白名单。现privacy/intrinsic helpers、同readSnapshot和metadata IDs SQL可支撑既定路线，但空间级bounded revealed候选port、独立cursor与DTO目前不存在。

需根明确一处错误分类：现`assertReviewSubmissionPostEvidencePrivacy`/`assertStoredSubmissionEvidencePrivacy`使用NOT_FOUND同时表达缺失revision/证据实体、跨space、缺assignment等；intrinsic submission binding不验证所有evidence实体存在。不能宽catch所有NOT_FOUND便宣称损坏安全RESYNC。任务实现必须区分合法在线不可见与持久引用损坏；若根把某种缺失/crossspace归为合法不可见，要写明，不能作者自行改合同。CONTENT_REDACTED是已有明确合法排除分类。详细事实见c2b-facts.md §1–2。

全量候选preflight与cursor候选取页需要在同一个outer snapshot中执行；新port具体名称为owner候选内部接点，可在根定稿时调整。旧post cursor哈希不能含新增默认source字段；默认/explicit posts保持旧绑定。各端仅解码/转发，不复制资格。

## 精确所有权与保护

owner候选见`m6-4-c2b-owner-candidates.json`，实际路径已静态核对；new文件不存在且不创建占位。候选不是dispatch许可。主代理选择边界，A/B仅确定owner路径实施；D唯一执行；交叉审查和source freeze之后才放运行窗口。

schema.sql/schema.ts、DDL/SQL迁移/profile历史fixtures、bootstrap/offline-upgrade/backup/restore/export/import、依赖/lock、旧封存review包、review-panel.tsx、M7、新host/模型/VM/全局配置均默认保护。本包无public export family扩展，无部署/发布/推送。C2A先封存，新fresh后再正式dispatch；不得抢D当前窗口。
