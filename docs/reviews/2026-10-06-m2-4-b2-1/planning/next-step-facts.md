# M2.4-B.2.2 只读事实输入

2026-10-06，B.2.1独验运行中。只读当前主题目录及相关接口，不决定下一包架构，不写产品/tests/规范、不运行tests/build。仅本文件写入。聚合主题全文不是必选目标。

## 已有目录与接续材料

- server/routes/threads.ts:68–95的GET /spaces/:space_id/threads/:id已接受limit/cursor：limit1..100、默认50；data={thread,posts}，meta={truncated:false,next_cursor}。它是帖子元数据目录，不是正文；GET spaces/:space_id/threads另有state/limit/cursor、默认20，但不是本轮目录目标。
- storage/sqlite-storage.ts:737–745的Post元数据含id/space_id/thread_id/author_id/kind/current_revision/lifecycle/created_at。id就是post_id，current_revision可固定交B.2.1 getPostRevisionContent，space_id亦存在，不缺定位字段。目录不含title/summary/body；post修订内容需独立读取。随后head更新时取目录固定revision仍能重组旧材料；随后脱敏时B.2.1当前410优先，不承诺永久可读。
- client/client.ts:559的getThread(spaceId,threadId,limit?,cursor?,opts?)已透传现HTTP目录参数并返回data/meta；listThreads另有state分页。HTTP返回next_cursor并不意味着工具/CLI有入口消费它。
- 新GET /spaces/:space_id/threads/:id/posts目前无同method/path：server/routes/posts.ts:22仅POST同路径，OpenAPI:268只有post。新增GET与现POST方法不同，静态未见冲突；是否选该路径由父决定，不在此实施。

## 存储keyset、limit与预算缺口

StoragePort:104现有listPostsInThread(threadId,limit?,cursor?)返回posts/next_cursor；findThreadById:92与readSnapshot:55可复用。没有专门thread scan/page budget/签名cursor端口，现list接口只提供一次limit+1查询的可见结果及是否有更多的间接信息。

sqlite-storage.ts:718–748具体SQL是thread_id=?、可选id>裸cursor，ORDER BY id ASC、LIMIT limit+1；hasMore时截前limit、cursor为最后返回id，否则null。无lifecycle过滤，active/withdrawn/redacted均在目录，仅元数据；不读取任何正文或sealed review内容。当前thread读取也没有按open/archived过滤，两者均可在有空间授权下读取。

现算法在**静止集合、同既定排序、完整返回当前limit项**条件下，以最后返回id作为cursor不会漏后续现有项。它的cursor无签名、actor/thread/space绑定或TTL，任何非空标量字符串均可作为下界；server严格query解析后传回storage仍不是签名分页。ID来自randomUUID（core/ports/id-generator.ts），id ASC不是创建时间顺序；跨页新增较小id可落在已走过下界之前，当前列表不承诺固定完整集合或并发新帖不漏。

若另加字节预算裁掉当前posts后缀，直接使用storage基于原limit末项的cursor会跳过未发送项；甚至storage.next_cursor=null也可能因budget裁剪还剩当前候选。应由父冻结“cursor对应最后发送/最后扫描”的语义，不把旧next_cursor直接当预算裁剪后的完整续读事实。若新增lifecycle过滤/跳过候选，则扫描下界与最后发送下界还会不同；现Port无独立scan进度字段，不可声称其已支持该规则。现接口可以按keyset循环读取，但是否有候选/扫描预算、是否需要窄Port扩展属于父取舍，不由子Agent生成框架。

## 当前授权与snapshot

server/app.ts:205–222每HTTP请求通过authenticateToken取得当下identity/credential；threads.ts:71核空间observer/read，:73–75核thread所属空间，未把auth refresh/space/member/thread/posts读取包进统一readSnapshot。requireSpaceAccess读当前membership及scope/capability，但使用传入auth的actor/credential，不自行refresh；不同读语句未建立同一快照。因此不能将现旧route声明为B.1/B.2.1式“同snapshot当前授权+metadata+材料”。

线程没有另一个thread成员ACL对象，现可见性来自space权限+目标归属；新契约若需要每页同snapshot，应明确当前空间/身份/归属与thread version/state/posts head/lifecycle的读取边界。thread是可变对象，PostRevision是固定内容；把一次page snapshot与全目录跨页固定snapshot混同会产生承诺冲突。现Port readSnapshot只固定一次同步请求，不能持有跨HTTP页数据库事务。

## 旧工具/CLI缺口

tools.ts:32的thread分支只kind/space_id/id，additionalPropertiesfalse，不接受limit/cursor/max_bytes/revision；client:802显式getThread(...undefined,undefined).data，所以只默认首批且丢meta。这是批准保留的兼容行为。tools描述现已正确明示默认首批元数据、不含正文、工具无目录分页。

CLI index.ts:328–343旧read thread没有limit/cursor/max_bytes选项，调用getThread默认首批并printOutput(res.data)，丢meta；共享--revision存在却thread忽略，这是旧事实，B.2.1未改。不能因HTTP有分页便宣称tool/CLI已经目录接续。

## 父需要选择的最少事项

1. 下一包是仅新增工具/CLI利用**已有**HTTP目录分页，还是新增加法有界目录GET。前者不能自动获得字节cap/签名cursor/snapshot合同，后者需明确独立DTO与预算。
2. 旧thread分支/data输出保持，还是新增判别kind/专用命令输出完整page；原HTTP GET与裸cursor是否原字节兼容，不默换签名。新GET路径若采用threads/:id/posts，应同时保留现POST。
3. 固定排序采用现id ASC还是别的稳定keyset；并发新帖在已过下界之前是否允许本轮不见、是否另用checkpoint补增量。不要不经冻结许诺跨页固定全集；是否固定初始高水位/集合另需明确依据。
4. lifecycle目录是否包含withdrawn/redacted元数据、metadata中哪些必须保留，是否有过滤。若过滤需冻last-scanned与last-emitted续读和候选预算，避免budget裁剪跳项或无法推进。
5. 新页一次snapshot应包含哪些当前身份/空间ACL/thread metadata/posts head/lifecycle；跨页thread version/head更新可变化哪些字段。新signedcursor若选，purpose/actor/space/thread/query/sort/position/TTL及预算绑定与错误优先级需父冻结，不认为旧裸cursor已具这些能力。

T06 docs09:14还要求10万帖子、摘要来源更新、小max_bytes真实编码/明确截断/继续路径、规则引用与checkpoint无竞态漏事件；docs09:60另列10万帖/100万事件/20模拟客户端固定负载及性能证据。当前有限功能验收不能代替此负载。focus_thread_id仍显式400未支持（docs04:189），它是剩余聚焦能力，不可因schema有字段当可用。目录接续或正文单修订续读完成也不能自动宣告完整T06/M2.4/M2；主题聚合正文未被定为必须实现。

现2344只是本轮运行前旧保护基线；下一包动态捕获实际不可变保护清单/哈希，包含全部新B.2.1证据，授权状态索引更新另列。不复制2344作下一包总数、不覆盖旧日志或修饰历史not_run。下一步由父决定，不启动B.2.2实现。
