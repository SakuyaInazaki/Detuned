# M2.4-B.2.2 独立验证阶段1

2026-10-06，按AGENTS/README/docs00/08/11/03/04/09及父[B2.1 next-task](../../2026-10-06-m2-4-b2-1/next-task.md)唯一行为方案规划。阶段1只捕新baseline/脚本与本planning，不执行产品tests/build/before，不改旧材料/产品/正式tests；293/30只是起点，不预填本包通过。

fresh baseline真实枚举：HEADb8dacd56779a007a2e7045b682bca0c036fdfc44；126source/config/tests、35currentdocs/material、5mutable状态文档；2492全部既有不可变reviews/probes/logs/evidence含完整B2.1，SQL/archive4、schema2、208tracked/44untracked dist。完整dirty保存，继承未提交不reset/clean。原5mutable索引单列，不硬抄旧2344保护数。只读ps过滤观察无旧本包/产品vitest/pnpm/PR/SR/Detuned/tsx，仅本次ps/rg自身，无进程终止；不声称拥有工具外全部shell会话历史。三失踪原真实历史fixture持续not_run，不重复ENOENT、不重造原成功/hash。

| 编号 | 冻结后独立有限证明 |
|---|---|
| TP01 | 新GET同已有POST路径有界目录，实际page只有Thread/Post元数据；active/withdrawn/redacted/archived状态保留，无正文/summary/title额外投影/全文join。空线程posts[]/truncatedfalse/null。 |
| TP02 | 静止候选idASC完整无重复/漏项；特别原storage.next_cursor=null但budget裁尾后仍签非空cursor，从最后实际发送post.id继续；limit+1原last不得误跳被裁项。独立DB行集合与真实HTTP拼接逐id比较。 |
| TP03 | 实际raw compact HTTP4K/64K/default12K，真实req.id/escaped metadata/signedtoken整体预算，共享serializer逐字节；tail整post删除，无拆项；仅limit有后续false+cursor，budget删候选true+cursor且至少一post。limit1/100与中途limit/budget变化均完整遍历。 |
| TP04 | 空线程最小thread metadata真实req.id临界；有候选但thread+至少一post/必要cursor不fit422，无empty+unchangedcursor循环。全库指纹读取成功/错误/422无entity/event/idem/ack写。 |
| TP05 | strictv1 purpose thread_posts_read/actor/space/thread/sortid_asc/after_id/exp，extra/tamper/wrongbind/purpose/sort/过长/未来期限400非重试；after_id不存在仍是合法参数化keyset下界，不要求对应DB行。 |
| TP06 | 至少两非末页中推进注入Clock，再校后cursor沿首次24h exp；exp等号过/+1秒400，后页可换limit/budget。当前身份/read能力/成员/目标所属空间先于badcursor，撤权401/403/404策略，未知/跨空间不泄漏。 |
| TP07 | 双真实WAL连接受控barrier在thread读取后writer改threadstate/version及posthead/lifecycle，证明同页metadata同snapshot，下一页看到新状态；不声称跨请求全集冻结，不sleep猜竞态。 |
| TP08 | 安装Pi0.87.1官方validator→实际execute、MCPstdio ListToolsrootobject+anyOf/call，仍8工具；newthread_posts完整page，revision非法、oldthread合法裸cursor/首批data不迁。新client共享HTTP+signal，不复制业务权限。 |
| TP09 | 实际CLI thread posts strict数值/完整page、目录输出id/current_revision合成固定ref→B2.1post_revision内容真实拼接；随后head改新仍读旧文档，redaction旧cursor410。旧read thread正例同合法首批data，旧裸cursor真实控制不变。 |
| TP10 | 最终freeze一次统一build计current29，新定向actual数→新独立TP→原PR3/SR4/SQKV→current29余项含一次全正式/typecheck/lint，dynamicADv2/AE原脚本实际新增GET目录计数；稳定source/docs/hash与完整新2492旧证据保持。 |

新增probe可分HTTP/boundaries、WAL、toolsCLI及自有fixture，独立行集合/屏障/断言，不借开发者assertion当独验。尾裁更正cursor是本包中心，在原storage游标null和limit+1两种状态都验证，不只测带storagecursor常见分支。动态随机UUID idASC不是创建时间，不承诺跨页新增较小id被本轮后续页捕获；事件增量思路只是既有poll/ack，不改M3。

原PR三脚本为B2.1 HTTP/WAL/toolsCLI；SR四脚本为B1 HTTP/boundaries/WAL/toolsCLI，SQ/native/KV同原脚本。需要loopback沿获准局部权限，不默认外网；首失败完整保留。current29原manifest的media-awareADv2动态完整目录，不因新增GET预先改旧脚本；真实不兼容后报父，不删检查凑绿。formal唯一文件/项数按新stdout，不累加专项/独验执行次数。

父确认精确DTO/helper导出与所有权后再准备依赖准确的新probe；产品最终freeze前仅语法检查，不执行import/before/build。产品故障停相关dependentchecks报父，只有自有newprobe fixture错误可保留首fail后修新版本并说明适用条件/未排除变体/重试条件。独验不改产品/正式tests/旧证据。

Node22/干净安装/远程CI/四真实宿主模型/10万帖子或100万events/20客户端性能未测；每页limit有界不是CPU/SQLVM保证。成功HTTPcap不含headers/errors/SDKCLIpretty，focus仍待整体M2.4/T06裁定。新目录不是主题全文聚合，不代表完整M2或M5–M8。阶段1停止，等待父精确接口/实施后freeze执行门禁。
