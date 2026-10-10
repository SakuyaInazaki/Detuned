# B.2.2 protocol → core 只读交叉审查

2026-10-06。父授权范围仅新service/index与新业务tests；在协议源码/tests/docs冻结后阅读，不运行任何产品tests/build，不改core或旧材料。结论：本轮no findings；未发现可复现冻结合同冲突。这是静态交叉审查，不替代独验或宣称重跑core10项。

## 具体不变量与代码位置

- core/services/thread-posts-read-service.ts:26–45在一个同步readSnapshot内refreshContext→当前space observer/read→findThread且space归属→query/budget/cursor→listPostsInThread。:44只捕获当前Thread、Post候选和纯值；:47–68仅copy/sign/encode/pop，无DB再读。core/index.ts:23唯一导出新增service。现Port/storage无需变化；只读方法没有调用写service/event/idem/ack。
- :38–41使用注入Clock整数秒传signer，strictpayload typeguard核v/purpose/sort/额外键与after_id，业务核actor/space/thread；now>exp及future>now+24h拒绝，首exp :36、续页直接沿payload.exp :41。共用HmacTokenSigner ports/token-signer.ts:16–45同样>过期并失败返回null，等号不被共用signer提前拒绝。limit/maxbytes未进入签名绑定；after_id直接传storage参数化下界，不require目标row存在。
- :51more=storageHasMore||removed，所以原storage无next时预算尾裁仍有续页。:53–56重取当前posts最后实际发送id签名，不使用storage原cursor位置。静止60项limit100原storage无next，4K裁尾后从最后发送id继续而不跳未发送尾项；limit50原storage还有更多同样不跳裁尾。
- :57–60truncated只removed，limit-only false+cursor，末页false/null。:63–65每候选计真实完整envelope及cursor字符cap；:66原有一post不fit直接422，空metadata不fit同样422，不裁成空loop。:67只pop尾完整项，最多100候选，metadata/thread原值保留，不聚合正文。实际request_id由budget传byteshelper，route也用同serializer（协议自专项另验）。

## 新正式tests的实质覆盖（只读）

integration/m2-thread-posts-read.test.ts:29–47 collect比对完整排序metadata数组与唯一ID集合，逐页检查actual envelope bytes与cursor.after_id等于最后发送id，不是仅计数。D01 :51明确原storage.next null且4K多页；D02 :60明确原storage.next非null且新的签名after_id不是原last，变limit/budget并重组；D03 :69空false/null及巨大request_id/thread metadata→422。

D04 :78真实withdraw/redaction/archived写setup后metadata读取，无内容投影；D05 :89签名变体purpose/version/sort/actor/space/thread/extra/after/expired/future逐项拒，以及不存在after_id参数化下界和高界空末页。D06 :104读capability/成员/撤凭据/foreign/missing前置于坏cursor。D07 :118两个非末页推进Clock并改limit/budget，核首exp沿链，等号可读、+1拒。D08 :128目录ref实际接B.2.1旧stored正文，head更新后固定内容保真、redaction410；D09 :138成功全页与validation/target/cursor/422前后全库fingerprint相等（不是只events计数）。D10 :149双连接WAL barrier在读thread后/listposts前另一writer真实commit thread+post变化，同页仍旧state/version/head/lifecycle，下一页新值，证明同页snapshot而非跨页固定全集。

## 限制与停止

未发现需修复反例，未运行core专项/独验/全suite/build。动态UUID id ASC可能漏本轮并发较小新id，这是任务书明确的动态目录限制，并非固定全集承诺；新服务不尝试扫描或锁跨页。TTL未模拟真实宿主，cap不含HTTPheaders/errors/toolwrapper，≤100裁项不等于CPU硬限。所有核心产品及正式指纹保持冻结，审查文件完成后停写。
