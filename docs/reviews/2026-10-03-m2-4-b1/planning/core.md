# M2.4-B.1 Unit A 精确规划（待父冻结）

2026-10-03。仅只读核查及本文件写入，未改产品/测试/规范、未运行测试/build/网络。M2.4-A父已接受263/263、26文件/当前29/29，实际范围见上一包verification/verification.md；B.1尚未实现，不宣称完整T06/M2.4/M2。

## 1. 已读事实与最小业务接口

现protocol/spaces.ts:46–59的SpaceRevision包含objective/rules/review_policy/check_profiles/pinned_refs/editor_id/created_at；storage.ts:73及sqlite-storage.ts:261已支持getSpaceRevision(spaceId,revision)。没有固定修订HTTP GET；当前context读取space.current_revision，policy_revision另有含义。AuthService.refreshContext:78刷新credential/actor，requireSpaceAccess:101核space范围/active membership/observer/read；不应从旧auth快照省略任一页重查。

新增窄服务候选（独占core新service与必要index导出，不改SpaceService写构造/幂等）：

```ts
new SpaceRevisionReadService(storage, signer, authService, secret, clock);
getRevision(auth: AuthenticatedContext, spaceId: string, revision: number,
  query: SpaceRevisionReadQuery, budget: { request_id: string }): SpaceRevisionPage;
// query { max_bytes?: number; cursor?: string }
```

所有DB读取在storage.readSnapshot同连接callback内：refreshContext→observer/read授权→验证revision正safeint/query预算→验游标binding→getSpaceRevision固定版→只取批准文档字段，退出后无DB读取。现getSpaceRevision可直接复用，不新增StoragePort方法/DDL/依赖。每页都当前鉴权；无entity/event/idem/ack写。不存在/不允许空间或不存在修订404；身份失效401、capability/角色仍现策略403，不统一吞成cursor400。

正常app显式传现signer/持久secret/clock，服务本身不用Date.now，不做通用read框架。新方法未configured时策略由组合根保证，不复制权限至route/client。

## 2. 路由、文档字段和至多两个DTO候选

路由共同候选：`GET /spaces/:space_id/revisions/:revision?max_bytes&cursor`，path固定revision必填；不增加省略revision自动latest模式，避免初页/续页含糊。route传req.id、共享compactserializer直接send，与A一样不裁业务内容。query白名单、未知/重复/显式空值400沿既有政策。

本包最小文档建议命名`SpaceRulesDocument`：`{objective:string,rules:string[]}`，固定顺序JSON.stringify、不trim/规范化。ref另为`{space_id:string,revision:positive safeint}`。这是SpaceRevision的**规则内容投影**，不是声称包含全部SpaceRevision DTO。pinned_refs不加入：context已有当前固定pin投影，规则重组无需pins；旧pin可能失效，原始pins读取又会引出当前可读/脱敏边界。review_policy/check_profiles/editor/time亦不为本包目标/规则续读必需，涉及M6和配置，不顺带暴露。若父要求加pinned_refs，必须冻唯一文档字段集合并测试旧/跨空间pin可见性，不自行改。

两个候选供父择一，业务权限和预算相同：

**A：JSON文本片（建议最小接线）**

```ts
SpaceRevisionPage = {
 data: { ref: SpaceRevisionRef; encoding:'json'; chunk:string;
         start:number; end:number; complete:boolean },
 meta: { truncated:boolean; next_cursor:string|null }
};
```

start/end表示批准compact文档UTF8编码的字节半开区间，边界只在完整Unicode码点之间。把页chunk按顺序拼接，再JSON.parse得到精确objective/rules；不是每页可单独JSON.parse。complete iff end===全文UTF8字节长度；next_cursor iff未完成；truncated iff未完成（显式分片尚有材料，不是历史缺项）。固定ref每页存在，last页非空、complete=true/next=null。`encoding:'json'`定义v1唯一规则文档，不称任意SpaceRevision导出。

**B：结构化字段片**

```ts
SpaceRevisionPage = {
 data: {ref:SpaceRevisionRef,
   part:{field:'objective';start:number;end:number;text:string}
     |{field:'rules';rule_index:number;start:number;end:number;text:string},
   complete:boolean},
 meta:{truncated:boolean;next_cursor:string|null}
};
```

需另freeze规则数量/空规则编码，否则空rules/空字符串无法精确恢复；可加rule_count且为每空规则返回明确零长度项（推进字段位置而非text位置）。此备选游标position对应字段+rule_index+码点，payload更复杂，单页只一part。结构直读方便但新增空数组/空字符串状态机，父若选B必须追加这些精确字段，不能临时猜测。A没有这组歧义，建议父采用A；此时尚未裁决。

## 3. context固定ref与预算省略判别

候选共同context字段：`space_revision_ref:{space_id,revision}`总是存在且来自此次snapshot的space.current_revision；`space_content_status:'included'|'omitted_for_budget'`。included下objective:string/rules:string[]；omitted_for_budget下两者均null，shared schema用判别union，不允许半省略/状态与字段矛盾。不把budget省略写missing_fields。

父补充顺序：先以空可选数组、真实checkpoint/ref和inline objective/rules构造仅必需字段探测页，计完整envelope。若必需inline本身超限，则**先**在实际完整候选里objective/rules整体null、status省略、meta.truncated=true；仍保留原可选材料候选，再按A尾部整项activity→failures→blockers→pins每移一项复测直到fit。若必需inline可fit，不省规则，仅按A裁可选材料。这避免先丢光可选材料后降规则却不补回。探测页不发送、不改变实际truncated；只有预算省略或实际删项置true。降级后的最小metadata仍不fit→422。

checkpoint来自同snapshot seq，仍事务后签；固定ref不能在签名/预算时再读currentrev，来源/missing/脱敏状态保持。规则省略后meta.next_cursor仍null（context不是space读取页），通过ref去固定revision入口，不混用checkpoint为续读游标。完整included context也携带ref；policy_revision照旧保留但不能用它定位规则内容版。

## 4. JSON候选A的精确cursor与encoder算法

payload建议严格对象：`{v:1,purpose:'space_revision_read',actor_id,space_id,revision,position,exp}`，revision正safeint、position正safeint（cursor不接受初始0）、exp非负safeint；未知键拒绝。first无cursor position=0。签名标准HMAC端口，独立purpose，不造crypto或新表。position必须<固定文档UTF8字节长度；等于/超过末尾的续读cursor400，不给空完成页。

TTL86400：first exp=floor(clock秒)+86400，后续cursor继承原exp（不逐页延长）。建议沿A checkpoint边界：用floor(clock秒)verify、now>exp失效、exp等号有效；同时拒绝exp>now+86400。这与SearchCursor额外exp<=now拒绝等号不同，必须记录用途合同而非说所有cursor已有统一等号规则。可改预算（cursor不绑定max_bytes），revision/对象/actor/position/purpose/version必须固定。游标过长/空/篡改/错误purpose或版本/绑定/position/expiry均400 VALIDATION_ERROR retryable=false，统一提示“空间修订游标无效，请去掉 cursor 重新读取该固定修订。”无implicit裸cursor兼容；没有既有space cursor要迁移。

协议纯函数候选：`encodeSpaceRulesDocument(document):string`、`buildSpaceRevisionEnvelope(requestId,page)`、`serializeSpaceRevisionEnvelope`、`spaceRevisionEnvelopeBytes`、严格payload guard；core负责游标验签/绑定和页面选择，不把业务/DB塞protocol。不引入TypeBox core依赖。

算法（JSON候选A，已和B对齐UTF8 byte position）：协议纯encoder用JSON.stringify({objective:document.objective,rules:document.rules})固定键顺序；core一次Buffer.from(text,'utf8')。JSON.stringify已将孤立surrogate转为ASCII\u转义，text本身合法UTF8；字面emoji不切代理对/UTF8连续字节，连接后JSON.parse精确恢复原始存储字符串/数组顺序。控制字符/引号/反斜杠在chunk envelope又被转义，必须计实际发送bytes，不能直接把原文byteLength当HTTPcap。

cursor.position是下一页start UTF8字节offset，必须0<position<buffer.length且位于码点边界（当前字节不是0x80..0xbf）。页end同合法边界，chunk=buffer.subarray(start,end).toString('utf8')。首页start=0；ref revision固定，后续不再读取current revision作为文档身份。

先测剩余全文complete=true/next=null候选的真实envelope能否fit，fit即结束。否则二分非末页合法边界最大fit：lo=firstBoundaryAfter(start)、hi=lastBoundaryBefore(total)；mid取(lo+hi)/2向下至最近边界（至多3次字节调整，若低于lo则用lo）；fit则best=mid、lo=nextBoundary(mid)，不fit则hi=previousBoundary(mid-1)。每个候选生成真实signed nextcursor（共同exp）并计actual envelope，包括token/字节位置数字/req.id；mid、lo、hi总在合法边界，不用一整个码点索引数组、不逐rule状态机。普通非末页成本随chunk扩展非减，数字及base64 payload长度非减，HMAC签名长度固定；末页next=null成本突降由先测全文处理，不混入该单调二分。最后发送同一best page，不再次改变token/exp。若无至少一码点推进的候选，422并建议增大预算；无空chunk或不变position next。

CPU/内存事实：SQLite返回整个固定rules数组、JSON encoder和Buffer是O(该文档字节)一次工作/内存，候选JSON计量约O(page budget×log文档长度)，不是SQLite VM/全库硬预算；不会为全部codepoints再创建索引数组，也不把所有后续页放内存。无法在无DDL/no-stream现存储下声称对历史无限rules有常数内存保证。本包只做有限大规则/4K进展验证，不十万负载；父若要求额外固定文档大小cap，须单独裁决，不能默默拒绝合法旧规则。一般服务ID/req.id下4K能推进，极大request_id最小metadata仍422，保留诚实失败边界。

## 5. 有限before/after与兼容面

新正式候选tests/integration/m2-space-revision-read.test.ts：父冻接口后先用旧context大rules真实返回422/无ref证明缺口，不用新helper不存在充当失败。实现后4K/64K/default原文重组、空rules/空规则/中文emoji/控制字符、巨大单规则；更新到rev2后仍读取ref rev1，游标后半页不可漂移。每页真实进展/结束，有效预算和invalid/tamper/wrongactor/space/revision/purpose/expired/revoked/removed membership；权限每页先核，固定clock实际消费exp边界；成功/错误无DB写。

跨单元HTTP测试必须读取actual raw body，不用重建DTO替代；Pi官方validator/MCPstdio/forum_read space保留meta，同schema/OpenAPI新增真实route全量集合。context降级后actual ref实际续读，不仅assert nullable。A两连接受控屏障C01仍保规则+seq+订阅消费，追加ref revision==1即可；不跑sleep或10万。

旧正式适配（实施前父确认ownership）：

- tests/integration/m2-context.test.ts C02:42–44现大rules4096→422改为明确ref/status预算省略+真实续读控制；C07末段极大req.id→422无写必须保留，不删最小metadata失败。
- tests/contracts/m2-context-contracts.test.ts C01:30–39现1500中文objective4096→422改为200带固定ref/省略，并真实4K重组；64K原完整内容控制保持。C03/C04 actualraw/escaping/meta/一致serializer断言不能弱化。
- tests/integration/m2-context.test.ts C01:24–39加snapshot内容revision ref；C06构建expected page不能漏新ref/status，保留尾删/null/40sources事实。
- tests/integration/m2-knowledge-views.test.ts V06:52–63（当前）整pin删除和64K40来源仍有效，新增ref增budget字节会影响临界但不得把source状态回退。
- tests/contracts/cross-interface-contract.test.ts:74–81 included小规则仍rules数组，原断言无需删除；如TypeScript判别需显式status narrow，仅适配不移除语义。
- tests/contracts/r4-c-route-contracts.test.ts全量method/path比较会自然增route，结构自动比较为主；不得改旧AE/probe或伪造body。新正式精确query/schema断言要覆盖revision/max_bytes/cursor。

forum_read post/thread无效cursor/max_bytes此前schema允许却忽略；B需先列真实调用/安装validator/正式测试准确兼容面，再父冻结是否B.1明确拒绝。core不趁机做B.2。CLI仅context整{data,meta}及space固定revision读取候选，search/data-only兼容问题另包，父决定输出迁移。文档03/04/ADR待实施授权后再同步，现全部冻结。

规划完成停写，等待父冻结route/DTO/字段集合/游标边界与所有权（省略顺序已按父补充）。没有额外模型/宿主调用、测试/build或产品承诺。

### 冻结前补充精确输入/判别约束

context TypeScript判别可写为`CommonContextFields & ({space_content_status:'included';objective:string;rules:string[]} | {space_content_status:'omitted_for_budget';objective:null;rules:null})`，Common含固定space_revision_ref和所有A原其余字段。共享JSON schema必须同样拒绝included/null、omitted/string或半null，不能只给两个字段宽union然后允许状态矛盾。保持root对象schema以适配MCP/Pi，不依赖core运行serializer删字段。

SpaceRevisionReadQuery严格仅max_bytes/cursor，默认预算只在undefined时采用（null不冒充省略），正整数4096..65536。cursor候选长度上限4096字符、非空白；新服务为无损签名载荷通常小于该限额，若异常巨大身份字段导致下一token超过限额，页面明确422而非发下页必被400拒绝的不可消费token。此数值仍需B/父共同冻结。第一/续页都用current auth之后再参数/签名检查；旧space授权不允许时不泄漏“token是否有效/固定修订存在”。请求revision为正safeint，不允许cursor改变path指定revision。root payload严格未知键400，position边界检查在固定文档读取后完成，error不暴露实际全文长度。

原计划中的A“先清全部可选再降规则”和码点cursor已按父补充替换为“先判断必需inline，再从完整候选裁减”及UTF8 byte cursor；不保留为第二预算行为。方案备选只在文档分片DTO两种，父倾向A；当前没有产品/测试改变。
