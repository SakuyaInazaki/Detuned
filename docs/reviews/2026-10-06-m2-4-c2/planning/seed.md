# C.2 A单元：确定性规模seed规划（父冻结v3）

2026-10-06，已读AGENTS/README/docs00/08/11、docs09 T06/§4、docs01性能及C.1 next-task；父已批准实施与tiny自验；full生成在v3 tiny独审后条件放行，尚未启动600秒负载，不改产品/正式tests。fresh baseline由verify已捕：138source/36docs/5mutable/2915旧证据，数字不作为下包固定常量。父允许透明当前批量fixture，明确不是100万HTTP成功。

## 所有权与最小交付

仅新增scripts/scale/seed.mjs（必要seed-前缀助手）、tests/fixtures/scale/recipe.json与README.md、本包planning/seed.md及implementation/seed/记录。产品/schema/SQL/DDL/Port/旧tests/历史fixtures/其它规范不动。脚本读取当前已装SQLite/current dist与同源protocol typed parser，使用现bootstrap/schema初始化自建目录；seed文件数据通过现约束参数化批量插入，不改产品写入路径或伪造HTTP幂等记录。

命令候选：`node scripts/scale/seed.mjs --output <新自有目录> --profile smoke|full`。目录已有manifest或DB一律拒覆盖。full严格100000Post/1000000Event/1000Thread/1000Relation；smoke建议1000Post/10000Event/40Thread/40Relation，最终值由父统一冻结。公开repo产物只配方/README/代码，小型smoke可自建临时输出；大库不入repo。

## 合法确定性配方

固定seed标识detuned-c2-v3、UTC基准2026-01-01T00:00:00.000Z、确定ID/日期/槽位派生，无随机PRNG分布。只一个主space，ACL小私有空间由verify性能窗口外真实HTTP另建并单列，不进seed，不提供private_space_id。

20独立agent actor+session，另1 deterministic管理actor；每client有contributor membership、自己的Thread/Post写所有权，角色不提权。Thread owner i%20；全部先openv1+created，帖子/历史完成后最后10%更新archivedv2+updated，前20写targets始终open。空间rev1空pins，最后rev2保存完整固定summary pins+revised事件。Post kind按10槽note50%/proposal20%/failure10%/summary10%/claim10%，source refs跨thread但同space。body中文/英文/emoji/控制字符与字面搜索词，title/summary/tags保当前新写上限，结构用parseNewTypedStructured同源校验；failure含scope/evidence_state=unverified+明确reason/ruled_out/not_ruled_out/retry_when，summary至少一个已存在可读fixed source ref，不用外链或缺artifact证明provided。

所有非summary先创建，summary后创建保证source ref当时已存在rev1；1000open challenge source failure→proposal固定ref，两端同space，跨thread及两端同thread明确分配并不重复关系唯一键。pinned refs小型确定窗口（建议每client1summary，共20），保证context跨threadsource投影，不无意构造无上限pins使全实验仅422。

full事件账：2space.revised+1000thread.created+100thread.updated+100000post.created+1000relation.created+897898post.revised=1000000；每事件对应真实固定实体/版本。不以重复同revision事件凑量。各Post最终head为9或10：八轮全100k修订，再97898个各一次；固定source refs仍指rev1，当前head更新显示outdated来源。事件seq连续、ID唯一、public/type/object_id/revision/actor/日期相符；后续运行写入与seed counts分开。无HTTP idempotency种子记录，不能称已通过服务事务写入验收。

## 初始consumer事实与运行分工（父已确认）

EventService.subscribe现93–111遇已有consumer不应用新checkpoint。baseline只20actor/session+consumer_key，**不插subscription/consumer、不给伪ack_seq**。runner在运行副本注入新runtime instance secret及20新凭据（另admin专用，如有管理探针），每client真实context→subscribe(start=context_checkpoint)新建consumer，保存实际ID/start seq；从此poll只有真实batch才ack。

bootstrap默认随机admin/secret/日期只在初始化出现，seed须在任何业务数据前移除随机credential/admin并替换确定管理actor，归一化migration时间；最终归档清空所有credentials/token_secret，VACUUM新archive并known-secret scan，逻辑指纹排除SQLite物理差异。不直接serve credential-free baseline，runner安装临时secret后用现coordinator。

## 最小manifest接口（提交父统一）

```ts
{
 format_version: 1, recipe_id: 'detuned-c2-v3', profile: 'smoke'|'full',
 recipe_sha256: string, seed: string, schema_version: 2,
 database_file: 'baseline.db', oracle_file: 'oracle.json', discovery_file:'discovery.json',
 source: {generator_sha256:string, current_dist_sha256:Record<string,string>, versions:Record<string,string>},
 counts: {posts:number, post_revisions:number, events:number, threads:number, relations:number, actors:number, sessions:number},
 logical_sha256: Record<string,string>, database_sha256:string,
 space_id:string, admin_actor_id:string,
 baseline_event_seq:number,
 clients:Array<{index:number,actor_id:string,session_id:string,consumer_key:string,
   write_thread_id:string,revision_post_id:string,revision_post_kind:'note',current_revision:number}>,
 threads:{open:string[],archived:string[]},
 post_refs:Array<{space_id:string,post_id:string,revision:number,document_sha256:string,document_bytes:number}>,
 space_ref:{space_id:string,revision:number,document_sha256:string,document_bytes:number},
 queries:{zh1:{hit:string[],miss:string[]},zh2:{hit:string[],miss:string[]},zh3:{hit:string[],miss:string[]},en:{hit:string[],miss:string[]}},
 templates:{failure:Record<string,unknown>},
 credential_free:true, consumer_initialization:'runtime_context_checkpoint'
}
```

manifest无token/token_hash/secret/随机运行凭据；路径相对输出目录。clients只非秘密identity/write targets，runner可使用，独立“新会话”只能拿discovery.json（space_id+query=C2三点反例+任务文本），不得给manifest refs/oracle/DB答案。oracle.json单列事后答案：固定材料/条件/来源ref+canonical内容hash、expected head/lifecycle、关键词ID集合及代表样本，只有独验作比对。基准反例task是通过论坛找到最短路first-discovery错误条件、三点counterexample、未排除变体及retry条件，不用模型也不让客户端读seed答案。

runner只需manifest+baseline的运行副本，所有运行临时credentials/session/consumer记录由runner所有权；seed不提供凭据文件。固定反例位置和少量明确读取refs保存oracle，不把sqlite连接泄漏给forum-only新会话。source更新用client-owned post可修订，不改跨作者帖子。

## 空间/时间估计与oracle

最新正文固定90%约384B（范围256–512B）、9%2KiB、1%16KiB；历史正文约128B，保完整structured/真实hash，不能把1M份长body复制导致数十GB。估历史body约115MiB、最新body约70MiB，typed结构+headers+events+索引/FTS/WAL预计baseline约0.8–2GiB（非实测保证），目标<=2.5GiB。生成阶段只有一个work DB与一次sanitized archive短暂并存，结束移除自有work；运行副本+WAL+archive总目标<=8GiB。父已定free<6GiB中止并保部分阶段日志；16GiB RAM/21GiB当前free事实再开工记录，statfs每批监测。估10^6行级生成/验证数分钟到十余分钟，先smoke测真实速率再由父判断，不预报完成/达标。

直接批量seed只插当前最终FTS一次，历史revision不逐次调用createPostRevision导致DELETE post_fts扫描开销；这是fixture构造，不是改变产品/性能修复。sqlite-storage现createPost/createPostRevision/appendEvent每条prepare和FTS更新，百万直接照业务方法写会把生成成本混成性能。种子所有SQL参数化、事务批次、现FULL同步/外键约束维持，不加新DDL/索引/新table或关闭外键；只在完成manifest后允许runner读取。

生成后oracle包括PRAGMA integrity_check/foreign_key_check，精确kind/head/revision/event counts、seq连续唯一，所有实体事件ref存在且revision正safeint，relations唯一/双方fixedrev存在，summary refs同space/固定rev存在，active/current FTS一Post一row且title/summary/body/tags逐项等head；typed结构逐生成时校验。全表逻辑hash以明确列/稳定order流式计算（不用把million rows全部加载JS），DB文件hash与源/recipehash记录，schema与逻辑count作为重建对比，随机临时auth不入archive。普通重建不需用户DB/git旧tmp/网络。

父已冻结v3条件/数据配比/manifest字段，tiny已实施自验，full待独审条件达成；不跑产品正式tests/build/600秒负载。若schema/CPU/空间真实限制与以上冲突先报父，不自扩产品路线。


## 版本与新写合法性

v1首tiny为透明snapshot预检，保留，不作为最终数据；父批准v2补archived与空间pin完整版本事件，扣修订保持总量；v2首/最终tiny逻辑及物理DB指纹相同。独审发现v2空间单规则>500不是必要历史例外，父批准v3把同样总内容拆<=480UTF16条目，Value.Check当前Create/PatchSpace及每Post create/revision request，stricttyped继续校验。v3独审后才full。baseline schema_version从实际migration读取，不硬填旧值。源/规则修正首记录全部保留，未产品修改。
