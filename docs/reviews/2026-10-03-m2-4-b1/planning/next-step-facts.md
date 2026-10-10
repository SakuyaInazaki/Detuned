# B.2 冻结前只读事实输入

2026-10-06。只读当前源码，不决定 B.2 架构，不实施、不运行 tests/build；B.1 仍待独立验收。本文件仅提供父代理决策输入，不扩大 review/artifact/M3/100k 范围。

## 现有读取事实

- HTTP `GET /spaces/:space_id/posts/:id` 只接受 revision query；省略时读 current_revision。PostService.getPost:423–450 核空间 observer、目标所属空间，redacted 返回 CONTENT_REDACTED/410，固定版不存在404；withdrawn 仍可读取。成功 data={post,revision}，含完整 PostRevision body 等字段，不具成功正文预算或内容 cursor。
- HTTP `GET /spaces/:space_id/posts/:id/revisions` 接受 limit/cursor，limit 默认20、范围1..100。storage listPostRevisions:680 使用裸十进制 revision cursor（parseInt 后 revision<cursor，revision DESC），每项含完整 title/summary/body/tags/structured/content_hash/editor/time。redacted 当前生命周期时各历史项材料换为 REDACTED/空值；meta.truncated=false，next_cursor 是下次裸 revision。此 cursor 不是 B.1 签名 byte cursor。
- HTTP `GET /spaces/:space_id/threads/:id` 接受 limit/cursor，默认50、范围1..100。storage listPostsInThread:718 使用裸 post id cursor（id>cursor，id ASC）；data={thread,posts}，posts 是 Post 元数据，**不含正文/修订内容**。meta.truncated=false 与非空 next_cursor 可同时存在，表示列表还有页。不可将现 thread read 称为主题全部正文读取。
- client.getPost 支持可选 revision；client.getThread/listPostRevisions 支持列表 limit/cursor，沿 HTTP 透传；它们没有 B.1 式 max_bytes 文本页。
- forum_read：space 固定 revision+max_bytes/cursor 返回 page；post 必需 id、可选 revision，返回旧 data；thread 必需 id，返回默认首批元数据 data，丢弃旧列表 meta；post/thread 明确拒 cursor/max_bytes，thread 拒 revision。artifact/review 发现 schema 不支持，绕 direct callTool 校验仍400。
- CLI `space read` 固定规则页、context 整 page；旧 `read --kind post` 可选 revision 以 parseInt 解析、输出 data；`read --kind thread` 调默认 getThread、输出 data，现会忽略 --revision。旧 read 没有 limit/cursor/max_bytes 选项。这里仅记事实，不修改既有兼容面。

## 可复用与不可直接套用

B.1 的 protocol 同源 compact envelope encoder/bytes 思路、UTF8 安全 byte interval、严格签名用途及 actor/object/revision/offset 绑定、首次 TTL 后续继承、换预算、当前 ACL 先验、至少字符推进或422、一次完整文档 O(doc)诚实边界与只读快照可作为机制输入。不能直接复用 space 的 purpose/ref/规则 JSON 字段集合来称为帖子正文；也不能将旧裸目录 cursor 当作已安全正文 cursor。

帖子需要额外核目标所属空间、当前生命周期 redacted 与 fixed revision 可见性；不能凭持有旧 ref/cursor 绕过脱敏。现 getPost 对redacted是410、revisions目录为墓碑投影，父需冻新内容续读采用哪一既有可见性合同。每页当前 identity/capability/member 与生命周期应在同快照判断；旧 getPost 本身未 refreshContext/readSnapshot，不能宣称直接调用已满足新页合同。

thread 目前只读对象+帖子目录，正文的身份粒度是每个帖子修订。若父希望扩展 thread 正文读取，必须明确一次请求是否固定主题所含帖子及其修订集合，如何面对新增帖/新版/脱敏；这不同于 B.1 单固定不可变文档。现 metadata 列表翻页能力与正文分片能力应在冻结时明确语义。

## 父代理需要冻结的最小事项

1. B.2 首包只做固定 post revision/body，还是包含 thread 的正文聚合；若聚合，固定集合与新帖/新版语义是什么。不能由实现 Agent 猜测。
2. 唯一文本内容是 body 原字符串，还是包含 title/summary/structured 的固定 JSON 投影；相应 ref、encoding、byte interval/page union/cursor purpose，以及空正文的合法完成页处理。
3. 新固定路径还是原 GET 增可选 bounded 模式；revision 是否在新续读必需，默认 latest 首页是否准许，旧 read/目录返回与裸 cursor 是否保持。明确新参数 max_bytes/cursor 与旧 limit 的组合政策。
4. 当前 redacted 的错误/墓碑策略与 withdrawn 可读策略；权限/内容状态先验和坏游标错误顺序；帖子固定读是否延续 B.1 预算/期限/最小 metadata422政策。
5. forum_read post/thread 哪些分支新增什么参数、何时迁移为完整 data/meta；CLI 保持旧 read 或增加专用入口；旧 thread 默认仅首批元数据、parseInt/忽略revision问题的批准修正范围与迁移说明。

待父冻结后再做最小实质 before、划定所有权与实施；本文件未授权或开展 B.2。
