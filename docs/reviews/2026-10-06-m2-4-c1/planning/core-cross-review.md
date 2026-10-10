# C.1 protocol → core / SQLite 只读交叉审查

2026-10-06。父授权仅新核心与两窄查询、正式专项的代码阅读，唯一产物本文件；未改产品/旧证据、未跑tests/build，不涉H-R1。结论：本轮no findings，未发现冻结筛选/快照/预算合同的具体反例。此结论不替代独立运行。

## 查询先筛后限

sqlite-storage.ts:866–875 listOpenChallengesForThread在WHERE核relation.space/type=open challenge、source与target两端space均指定，thread归属用OR；JOIN对象PK单行，不用UNION或source/target两次追加，因此双端同thread不会重复relation。:873明确created_at ASC,id ASC后LIMIT，噪声较早关系不会占focus窗口。随后findRelationById仍在调用者同步readSnapshot内，未在snapshot外读取或写库。

:1040–1057 listPublicEventsForThread先核e.space/public/seq<=atOrBeforeSeq；thread.*直接object_id、post.* EXISTS现Post.thread_id、relation.* EXISTS端点thread任一匹配，同现订阅映射。WHERE所有归属判定在ORDER seq DESC/LIMIT前，reverse后seq ASC输出。EXISTS不造成双端重复，同space Thread由core先验确认；其它space/artifact/review/check类型没有分支。查询不调用poll/ack，没写事件/批次。此处按现对象归属，不声明还原每个历史event发生时的旧归属；这是任务书沿现subscription映射的范围。

## 材料、安全投影与无focus兼容

context-service.ts:67–78 pins仍逐stored数组、不去重，新增条件只核pinned Post自身thread；固定ref/active summary/同space仍在原条件，projectSummarySources原样可跨thread，未按sources反推pin归属。:85–100 focus用窄challenge10候选，原projectRelation/ref unavailable拒绝/withdrawn状态/redacted issue impact null不改，不补扫第11候选。无focus仍listOpenChallenges(space)与原slice10，未悄悄排序空间旧路径。

:104 failure在原kind failure查询加thread_id，sqlite-storage.ts:1297–1301同space active/current JOIN及kind/thread在:1321 id DESC/LIMIT+1前，输出窗口5；不是created_at最新。:127–138 focus走public窄event且传本页latestSeq；无focus仍原空间latestSeq-5、limit5再public投影。:142 conditional spread无focus={}不新增key或null；其它space规则/ref/policy及原字段顺序/内容保持。原数组无cap不被误称全读取工作有界。

## 同页一致、无写及预算

context-service.ts:32–64同readSnapshot刷新身份/space ACL、校focus形状、findThread同space、规则修订与space high-water。open/archived无额外拒绝。:67–156材料/metadata与seq同snapshot；:159–183只sign/encode/pop，不再DB。checkpoint仍purpose checkpoint、space_id/actor_id/本页空间seq与注入Clock首24h，未改thread consumer/poll/ack用途。

:166–171 mandatory对象清空可选数组但保focus_thread，规则预算省略也spread保完整焦点；:174顺序仍activity→failure→objection→pins尾pop，不拆字符串。:180 minimum不fit422，focus不可删除；shared contextEnvelopeBytes计实际budget.request_id，route用同serialize。truncated只预算删除/规则省略，next_cursor仍null，5/10非历史完整保证。

## 新正式覆盖的实质性（只读）

integration/m2-context-focus.test.ts:21 F01 archived完整metadata/no-focus无key/空间checkpoint；:23 F02确定性z-other干扰高id先筛thread、focus f6..f2，以及重复pin/跨thread withdrawn source；:25 F03早年13噪声不占前10、双端匹配去重、created_at/id排序及人为crossspace端点排除；:27 F04晚于匹配的9无关事件、space/nonpublic事件不能占focus前5，seq上界直接查和空间checkpoint含无关高水位。

:29 F05失效固定revision不补满、redacted issue/impact null；:31 F06全库fingerprint比成功/400/404无写，撤credential后未知focus401优先；:33 F07规则省略仍保focus及pin、巨大focus422；:35 F08真实双连接WAL在读Thread后writer提交Thread/材料/event，本页旧metadata+failure+空间seq，下次新状态/seq；:36–41 F09先activity裁尾其他数组保持，隔离最低metadata实际4096/+1→422。不是仅测试总数。

原context正式迁移范围仍限父批准C03，旧其它正文/规则WAL/checkpoint/TTL行为由最终统一独验实际确认。本审查未运行新9/旧7，引用core交付数字只作该单元既有证据，不能视为我独立运行。无可复现需修问题，完成停写；SQLLIMIT不承诺VM/CPU硬cap，四宿主模型/规模及完整M2/T06仍后续。
