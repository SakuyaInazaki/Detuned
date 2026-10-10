# Core→协议单元只读交叉审查

2026-10-06。以本包interface-freeze及B.1 next-task为准；此为跨单元源码审查，不是core自身独验，也不替代第三Agent运行证据。只写本文件，未修改产品/正式tests，未运行tests/build；已停写。

## 确认冻结关键点

- protocol/posts.ts:214–218：文档类型Pick现PostRevision五字段，encoder固定title/summary/body/tags/structured顶层顺序，原值引用；不引入新写validator/default/trim/content_hash。空body仍非空完整JSON。
- posts.ts:221–249：ref含space/post/revision正safeint；query仅max_bytes/cursor、CONTEXT_BYTES共享范围，cursor最长4096非空白；strict载荷独立post_revision_read purpose与actor/space/post/revision/offset/exp，额外字段拒绝；游标错误固定英文非重试。
- posts.ts:255–275：data只有父冻字段，lifecycle仅active/withdrawn，complete false/true整page与envelope分别强制true/nonempty cursor与false/null，不是宽boolean/null任意组合。offset数值安全范围由schema、推进与UTF8边界由core保障，不把业务边界错误塞transport。
- posts.ts:277–284：bytes→serialize→build为同源完整compact JSON，包含api_version/request_id/data/meta；使用UTF8 TextEncoder。core与HTTP均可调用同一encoder计量，不按原chunk长度冒充HTTPcap。
- OpenAPI:329–347新增固定GET、必需space/id/revision path，revision正safeint，query只有max_bytes/cursor；200引用完整envelope。cursor schema在:642重新明确保留4096约束，不被通用cursor政策覆盖。原目录接口未迁为正文cursor。
- server/routes/posts.ts:62–72：严格path revision与query白名单、共享预算解析，cursor空值保留给业务统一报错；实际req.id传getRevision并用同源serializer直接send，没有路由裁内容。app.ts:80/117以现storage/signer/auth/secret/clock注入新service。
- client/client.ts:607–612新getPostRevisionContent走统一HTTP/Signal，返回data/meta完整page，无新增运行时响应validator；:427现HTTP成功路径保留meta。:794–802先共享结构校验，post_revision→新方法整page，旧post→旧getPost.data，旧thread→默认metadata data，合法输出不改。
- protocol/tools.ts:29–38新增post_revision branch、id/revision必需，复用query schema；rootobject+anyOf且direct-call纯校验，旧post仍可省revision，post/thread拒预算/cursor、thread拒revision、artifact/review不发现。DETUNED_TOOLS:254–295仍8个原工具名，新kind没有新增工具名。
- CLI:254–256严格数字正safeint，不吞后缀；:270–281新post read必需revision、共享HTTP新getter、整page输出、help明确旧post无budget/cursor。旧read:328–343合法post/thread输出保持，未因新包迁旧data-only行为。

## 一处窄说明问题（已报告父，未自行修改）

审查时protocol/tools.ts:267描述仍写“旧post/thread保持完整读取”。父冻方案明确thread仍为帖子元数据目录：server/routes/threads.ts:80–94默认50个Post元数据与列表cursor，client:802只返回data。最小条件是模型读取ListTools说明后以kind thread请求，说明易被解释为主题完整材料/正文或完整目录；实际业务未变化。

建议由父授权协议单元仅将描述明确为“旧post保持完整读取；thread返回帖子元数据目录”，保留二者cursor/max_bytes未支持与artifact/review未支持。此是用户可发现说明的准确性问题，不建议改旧thread数据/页meta或扩B.2.2。本审查不自行修产品；若父批准修正文案，由父/协议记录最终关闭。

其余上述冻结关键点未见具体源码偏离。静态检查不能保证Pi/MCP/CLI运行或rawHTTP实际字节，最终依据第三Agent独验。

### 父授权窄修后的关闭核查

父接受上述说明歧义并仅授权协议方修tool描述。随后只读核protocol/tools.ts:267，已改为“旧post读取完整单帖；thread返回默认首批帖子元数据（不含正文），工具不提供目录分页”，同时继续明示旧post/thread无cursor/max_bytes及artifact/review未支持。该具体说明问题关闭；未要求或运行额外测试/build，schema/业务输出保持冻结。本交叉审查完成停写。
