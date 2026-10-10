# M2.4-B.2.1 协议单元对核心的只读交叉审查

2026-10-06。产品/正式指纹冻结后，按父授权只读审查PostRevisionReadService与新业务专项；本轮只写本文件，没有产品/正式tests/规范改动，没有执行tests/build。结论：在父冻结边界内未发现需要修复的具体反例或接口冲突。此为代码与覆盖审查，不替代正在进行的独立运行。

## 授权顺序与同快照材料

service:26–54包裹同一个storage.readSnapshot。27 refreshContext重载当前actor/credential；28 requireSpaceAccess(observer)检查当前space允许列表、active membership、角色和read/admin capability；29–31查目标归属，跨空间/不存在404，redacted410。直到32–49才处理修订结构、query与cursor；因此已撤权、不可见或脱敏目标不先回显cursor有效性。withdrawn不被当redacted拒绝。

50按指定postId/revision取固定row，52仅投影五个stored内容字段，53从已读当前post取kind/lifecycle/head关系，metadata与材料同事务。事务退出后57编码，后续pageAt/fits只读snapshot与bytes，没有再读DB或currenthead；当页旧active+原内容允许与并发redaction后的下一页410并存，符合“读取快照”合同。SQLite readSnapshot:65–75复用同连接事务或同步deferred transaction，拒thenable；它是同步约定而非SQLite强制只读，但service实际无写调用。

formal P07:116–129不是只检查错误模板：先成功读到非末页，再改active membership、read capability与credential revocation，坏cursor分别得到404/403/401；另实际可授权foreign空间带错归属post返回404、missingpost404。P05:94–100先拿真cursor、真实withdrawPost后读取标withdrawn，再真实RedactionService后真/坏cursor均410，验证生命周期优先于cursor。P10:159–179两个文件DB/WAL连接，通过getPostRevision前受控writer提交redaction，reader页保持旧active+original body、writer可观察redacted，下一页坏cursor410。WAL模式由SqliteStorage:41实际设置；测试不使用sleep。其受控屏障确实落在metadata读取后/固定材料读取前，能区分单快照与混读。

## stored五字段与旧版保真

service:52与encoder只用title/summary/body/tags/structured，固定顶层顺序，不套新写validator，不读content_hash来冒充文档hash；无默认/trim/深层重排或extra structured清理。getPostRevision原SQLite读方法不改，JSON tags/structured已parse为脱离row的值。post kind来自不可变post.kind，has_newer_revision用本次current_revision>请求固定revision；页之间重新读当前metadata，但固定ref和内容只依赖指定row。

P02:61–67用真实PostService.createRevision更新head，逐页旧五字段完整重组不漂移，首has_newer=false后页true、kind保持note。P03:70–78显式造不满足新proposal写validator的历史structured（assumptions含42、extra/lone/list等），仍恢复stored原值、孤立surrogate和extra，不漏入content_hash；P04:81–91验证SQLite TEXT已替换的孤立surrogate只能恢复U+FFFD，并覆盖空body仍完成非空JSON文档。历史构造是合成存储shape，不是丢失三真实旧HTTP原fixture的替代证据。

## 游标绑定、首TTL与位置

service:40只用注入clock整数秒；首次exp=now+86400。44用该now验HMAC，45–46 strictguard要求v/purpose/所有字段及额外字段拒绝，全核当前actor、space、post、固定revision，now>exp失效、exp>now+24h拒绝；47–48原offset/exp传后页。payload schema保证offset正safeinteger与exp非负safeinteger。60在文档可用后追加offset<total且完整UTF8码点边界。过长/空游标提前拒绝，HmacTokenSigner.verify实际采用传入整数秒，等号没有Date.now的隐式小数误差。

P06:103–113使用真实签名后改v/purpose/actor/space/post/revision/offset/exp/extra；不仅测篡改签名，还签非法码点位置、末尾、零/负/unsafe offset，并用另一个实际post复用token测试错post400。P08:132–145专用文档保证两4K非末页，时钟推进1h后真实解码第二cursor比首exp不变；改64K完成、拼接精确stored文档，exp等号成功/+1s400。不存在“只assert token存在”冒充TTL消费的覆盖。

## UTF8、二分预算与最低进展

57唯一文档转Buffer；59检测续字节，60拒非边界start；80–85令搜索端点处完整码点。JSON.stringify把structured内孤立surrogate编码成ASCII转义，允许转义字符序列跨chunk，拼接后才解析；没有切实际UTF8码点。82 lo为start后第一合法边界，hi<=start+预算且<total。84–89严格向前/后移动边界，返回best必有end>start且chunk非空；无fit候选90返回422而不造循环cursor。

76–78先测complete尾页，其nullcursor成本下降与非末页二分分开。只有剩余raw字节<=max才构造完整尾页；外层JSON编码不会短于chunk的UTF8原字节，此剪枝不会跳过可fit尾页。每请求metadata/exp固定，HMAC签名长度固定、base64url数字offset载荷长度与end数字位数不减；chunk逐扩展的JSON字节不减，当前HMAC实现下非末fit满足二分的单调条件。67每candidate真实签游标，71–73同时限nextcursor4096chars与真实request_id完整compact envelope；最终返回计量过的同一best，不重新签换token。

P01:48–58不只是小串演示：中文emoji/控制/双转义正文，4K多于2页，外层整体JSON明确>64K，64K仍多页并完整同原重组。joinPages:29–45每页核ref、连续半开位置、end推进、chunk UTF8长度、同serializer完整预算、complete/meta和没有意外U+FFFD。escaped真实requestId用于该计量；HTTP actual raw与精确serializer关系由协议正式P01补充。核心formal没有独立寻找req.id精确临界的测试，正在进行的独验需提供实际raw边界，不把这里计量断言误称额外临界运行。

P09:148–156采集每个非sqlite_数据库表内容指纹，真实成功分页后执行非法query/revision、坏cursor、missingpost及巨大request_id最小metadata422，最终指纹逐文本同；覆盖entity/event/idem/ack之外其它表，未靠写方法mock。这里的missingpost是目标404；当前角色/凭据变更先验由P07分开测试，不能把P09名称扩大为所有权限失败都独立全库采样。

## 结论与准确限度

指定核心不变量由源码真实路径和正式10项中的有意义断言支持，无计数拼凑、未见缩掉Unicode/64K多页或历史structured来凑绿。认证disabled/credential expires等其它分支来自既有AuthService，不把新P07三种变更称穷尽所有授权模式。最低metadata422与无推进均按同完整envelope预算判断；O(document)每页读取/编码是冻结限制，未扩成常数内存/CPU保证。

本轮没有新增运行证明，也未代独验判全套/current29或真实CLI/MCP/模型成功。三真实旧HTTP原fixture丢失限制仍保留。协议说明thread目录歧义已由父授权修正并重新冻结，未借交叉审查扩实现。停写，等待独验与父裁定。
