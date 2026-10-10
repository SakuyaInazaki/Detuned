# M2.4-B.2.2 内部任务：有界主题帖子元数据目录

2026-10-06，父代理已决定以下唯一方案；此文件仅编排未来包，未实现、测试或验收B.2.2，不重新二选一。主代理负责精确接口/所有权确认、分派与最终验收，gpt-6.1-sol子Agent执行已确定边界，用户无需手工转交。

## 起点与边界

父已接受B.2.1有限本机范围：[独立验证](verification/verification.md)实际293/293、30正式文件，新core10+contracts7已含总数；当前版本化29/29与39条独立记录命令全exit0。固定stored帖子修订五字段内容续读可用；三丢失原M2.1临时DB/凭据的真实历史HTTP夹具仍not_run，不称本轮保持。B.1/既有功能范围按当前验收入口，不将历史声明外推。

下一包只新增有界**主题帖子元数据目录**，不聚合全文，不新增title/summary/body投影或全文join。旧GET thread、getThread、forum_read thread、旧CLI read及其裸cursor合法输出不改。Post.id/current_revision够交B.2.1固定内容读取，示例必须真实完成目录固定ref→post_revision内容续读。

## 唯一HTTP与页合同

新增GET `/spaces/:space_id/threads/:id/posts`，与已有POST同路径并存。query仅limit/cursor/max_bytes：limit整数1..100默认50；max_bytes整数4096..65536默认12288；cursor最多4096chars。新增 `ThreadPostsPage={data:{thread:Thread,posts:Post[]},meta:{truncated,next_cursor}}`，使用现Thread只读元数据与现Post元数据字段，不偷偷加入正文。

thread/posts包含本页当前state/version/head/lifecycle，均来自一次同步readSnapshot，跨页可变化，无跨页固定全集承诺。不创建快照对象或持跨请求事务。包含active/withdrawn/redacted帖子元数据、open/archived主题均可读，不加filter，不输出redacted正文。

新窄服务复用现readSnapshot、refresh当前身份、space observer/read、findThread所属空间，之后才校cursor、listPostsInThread。权限/归属/游标只在服务端业务层，不把旧route当已同snapshot。沿现id ASC排序，随机UUID非创建时间；跨页新增较小id可能不在本轮后续页，说明须明确动态目录及以事件增量补充的思路，不改变M3/poll/ack。

## 严格cursor与精确预算

payload唯一形状：

```text
{v:1,purpose:'thread_posts_read',actor_id,space_id,thread_id,
 sort:'id_asc',after_id,exp}
```

after_id非空字符串，仅为parameterized keyset下界，不要求仍存在DB；不引入queryhash/过滤框架。复用TokenSigner/Clock，首24h、后页继承首次exp，等号有效/+1过期，exp>now+24h拒；limit/max_bytes不绑定。extra/tamper/错purpose/actor/space/thread/sort/expiry均400非重试，固定去cursor重取第一页提示；精确文案/导出名开工交父统一。当前ACL/目标归属先验，不泄漏无权对象。

成功compact完整HTTPenvelope按真实req.id/转义/签名cursor精确计UTF8 bytes，core计量与route直接send共享serializer；不含header/error/SDK/CLIpretty包装。现storage取用户limit项且limit+1探更多，不新增scan/Port/DDL。

只从尾部逐整项裁posts直到真实envelope能fit（候选≤100）。cursor必须从**最后实际发送post.id**重新签名，不能照搬原storage.next_cursor跳过被裁项。more=(storage有更多 || 本次budget删了候选)。即使全部当前候选fit，more时cursor仍签最后发送id。

meta.truncated只表示字节预算删了当前候选；仅limit有后续可false+非空cursor。true必须非空cursor且至少1post。空线程允许posts[]/false/null；原本有候选但最小thread元信息+至少1post及必要cursor不fit则422 QUERY_TOO_BROAD，禁止empty+unchangedcursor循环。必须证明静止集合完整遍历不重/不漏；覆盖storage.next_cursor=null但预算裁剪仍需续读，以及原limit+1返回last不得误跳。无filter，不造last_scanned状态。

## 接入加法兼容

forum_read新增kind:'thread_posts'，space_id/id必需，limit/max_bytes/cursor可选，revision禁止。旧thread仍默认首批data；仍8个原工具名，共享rootobject+anyOf/newbranch纯结构validator，direct callTool不可绕过。新client `getThreadPosts(...query?,opts?:{signal?})` 返回整page并走共享HTTP/Signal，旧getThread不改。

新增CLI：

```text
detuned thread posts <space-id> <thread-id> [--limit N] [--max-bytes N] [--cursor TOKEN]
```

严格正safeint与业务范围，输出完整page。已只读核对当前CLI未注册thread命令；开工再次核查名称冲突，发现只报父，不自行换接口。help须区分新目录分页与旧thread首批metadata，无全文承诺。

## 三单元所有权与推进门禁

开工先只读精确路径、提交DTO/helper精确导出及旧断言兼容图给父；行为已冻结，不另选架构。现Port足够为主假设，真实静态冲突报父。候选所有权：

1. core：新窄读取service、core/index、新integration专项、docs03与下一ADR；不改旧StoragePort/SQLite/旧写服务/SQL/DDL/旧formal，必要例外逐项先批准。
2. 协议接入：新DTO/encoder/helpers、tools/OpenAPI、server app+threads、client/CLI、新contracts、docs04与目录→固定正文示例；不改旧formal/adapter/global。Pi/dsh官方及安装版本开工重新只读核对，不升级，不把SDK校验/execute称真实host模型认证。
3. 独验：新包verification/覆盖/完整性/当前命令；冻结后独立运行，不代改产品或正式tests。

阶段：fresh动态基线→只读精确合同/父确认→至少两实质before→父统一实施→有限定向→冻结产品/tests/规范→独立一次fullsuite/current29及相关原PR/SR/SQ/KV→父验收。before真实新route404、新kind/CLI缺失、旧thread首批data无meta可对比，不helperimport失败伪反例；保留首失败/before与真实stdout/stderr/exit，不覆盖旧证据，不重复全跑掩盖失败。

## 必须验证的有限矩阵

- raw真实HTTP完整正文预算、真实req.id/转义/签名临界；静止多页完整无重漏、limit1/100、budget/limit变化；storage末cursor=null但预算后仍有后续，原storage last不得跳过裁项。
- 无候选空页false/null；有候选最小thread+一项/必要cursor大元数据422；redacted只metadata不泄正文，withdrawn/archived保留明确state。
- 两非末页中途推进Clock、后cursor沿初exp、等号/+1、未来过长/unknown/tamper/用途及actor/space/thread/sort绑定、revoke/当前ACL与归属优先。after_id无需仍在DB存在，不仅接受当前DB恰有该行的控制例。
- 双WAL受控屏障证明一页thread state/version与post head/lifecycle在同snapshot，次页看到新状态；不声称跨页冻结全集，不用sleep拼竞态。
- 真SDK/Pi安装validator→execute、MCPstdio与CLI目录→post_revision实际内容拼接，旧thread合法正例保持；目录id/current_revision合成ref，在head更新后旧内容仍固定，随后redaction410。工具仍8个，旧输出/裸cursor不默迁。
- 全库指纹证明成功/错误/422无entity/event/idem/ack写；动态操作目录预期新增一GET但按实际数报告；正式文件/项数唯一计数，不把定向/独验相加。

## 保护与限制

新开工动态捕获所有不可变历史review/probe/log/evidence，含完整B.2.1新增证据，SQL/archive及schema/profile原字节保持；不能硬抄2344作新总数。授权可变状态索引与build产物正常变化单列，不误判为改写旧不可变日志。三原历史fixturenot_run恢复条件不变：仅恢复原DB/对应私有凭据后原脚本重试，不用HEAD/当前schema重造原M2.1/hash/成功。未来持久私有夹具方案另行处理，仓库不放token，此包不扩历史恢复。

每页limit有界不是SQL VM/CPU硬限；10万帖/100万事件/20客户端性能、focus支持仍是后续完整M2.4/T06裁定范围。此包不是M2完成，也不虚报Node22/干净安装/远程CI/四宿主/模型验证。禁止deepseek-brainstorm、commit/push/reset/clean、删除依赖/dist/证据、部署/发布、真实模型调用或全局配置改动。

本轮仅完成未来任务编排；未执行B.2.2产品、before、tests或build。文档局部语法/链接/空白检查可做，完成后停写交父。
