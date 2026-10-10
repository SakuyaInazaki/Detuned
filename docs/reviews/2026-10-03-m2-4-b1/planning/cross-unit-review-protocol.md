# M2.4-B.1 协议单元交叉只读审查

2026-10-06。按父代理授权，只读复核核心最小 delta；本轮只新增本文件，没有改产品、测试、规范或示例，没有执行额外测试/build。交叉源码审查不替代独立运行和最终接受。

结论：在指定边界内未发现具体反例或与 interface-freeze 的冲突。下列结论来自当前源码读取，而非新增运行证明。

## context 降级与快照

ContextService 的 refreshContext、observer/read 授权、space.current_revision、getSpaceRevision、latestSeq 与全部可选材料读取均位于同一同步 readSnapshot callback。SQLite readSnapshot 使用同连接 deferred transaction；已有外层事务则复用。固定 ref 使用该 spaceRev.revision，返回 seq 使用该 latestSeq；事务后只签同一个 seq、计算预算，不再读 current revision。checkpoint 签名时间在事务后取 Clock，不改变内容/ref/seq 的身份。

mandatory 探测复制 data 并置四类可选数组为空，不清空原 page 的数组。仅 mandatory inline 超限才将完整候选的 objective/rules 整体改 null/status omitted，并保留原可选材料；随后按 activity→failures→blockers→pins 的尾删顺序重新计实际 envelope。规则省略与真实尾删均令 truncated=true，context next_cursor 保持 null。最低元信息仍不 fit 才 422。未见先清空 optional 再降级导致材料丢失的路径。

## 固定读取、权限与游标

SpaceRevisionReadService 每次 getRevision 都在 readSnapshot 中重新加载 credential/actor，并先调用 requireSpaceAccess(observer)，再处理 query、签名与固定修订。该授权检查当前允许空间、active membership、角色及 read/admin capability。无续页沿用旧 auth 快照的路径；调用链没有 entity/event/idempotency/ack 写入。

strict payload schema 限定 v=1、purpose=space_revision_read、actor_id、space_id、revision、正安全 byte_offset 与非负安全 exp，additionalProperties=false。验签使用注入 Clock 的整数秒；服务核对当前 actor/路径空间/路径修订、exp 上限及失效边界。首次 exp=now+86400，续页直接继承 payload.exp；max_bytes 不绑定。now==exp 有效，now>exp 无效。签名通过后还检查 byte_offset<文档长度与 UTF8 边界，不能签一个合法形状的位置跳入码点或终点形成空页。

## UTF8、二次 JSON 预算与进展

唯一文档编码为 JSON.stringify({objective:stored.objective,rules:stored.rules})，不导出其它空间配置。Buffer 的边界检查拒绝续字节；nextBoundary/previousBoundary 使搜索候选与返回片段端点处于完整码点边界。JSON.stringify 已把规则中孤立 surrogate 编成 ASCII 转义，按文档字节切片不会产生非法 UTF8；一个 JSON 转义序列可跨页，合同要求拼接后才 JSON.parse。

complete 尾页先在 raw 剩余字节<=预算时构造并计实际 envelope；raw 较大时跳过不会漏掉可 fit 的 complete 页，因为外层 JSON 的文本编码不会短于原 UTF8 chunk。非末页上界限制为 start+max_bytes，二分在合法边界间移动。固定 ref、start、exp、签名格式不变，chunk 外层 JSON 编码和 end/cursor offset 数字位数随 end 不减，故非末页 fit 判断可用于该二分；complete 的 null cursor 成本突降已单独先处理。

每个 candidate 都用真实签名 next_cursor，并由 spaceRevisionEnvelopeBytes→serializeSpaceRevisionEnvelope 对真实 request_id、data/meta、chunk 二次转义计量；发送 route 用同一 serializer，未二次裁剪。lo 从 start 后第一个合法边界开始，返回 best 必有 end>start、非空 chunk；没有任何候选 fit 时 422，未见空页或不推进 cursor 的成功路径。cursor 长度超 4096 也不返回不可消费 token。

仍是每请求 O(document) 的完整 SQLite 文档读取、编码与 Buffer，不是常数内存或 SQLite CPU 硬预算；这是既有冻结限制。

## surrogate 夹具与旧 SQLite 行为

读取 S03 当前正式夹具及核心 README：预期改用 getSpaceRevision 的实际 stored objective/rules，同时明确断言 objective 的孤立 surrogate 已为 U+FFFD、rules JSON 中的孤立 surrogate 仍保留。没有将原输入字符恢复能力伪装为续读成果。

只读比较 HEAD 与当前 sqlite-storage.ts 的 createSpace、updateSpace、getSpaceRevision 三个完整方法，结果均为逐文本相同（本轮 shell 输出三项 True）。写入仍将 objective 原样作为 SQLite TEXT 参数，rules 使用 JSON.stringify；读取仍取 row.objective 与 JSON.parse(row.rules)。本确认仅针对该空间写/读路径，未把仓库其它既有 SQLite 变更误称为无变化。

下一步：停写，等待独立执行与父代理验收；如需同步最终状态文档，等待单独授权。
