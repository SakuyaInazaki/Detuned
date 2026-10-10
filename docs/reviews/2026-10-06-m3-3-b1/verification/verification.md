# M3.3-B.1 独立验收

2026-10-07 Asia/Shanghai 收尾（本包 2026-10-06 开工）。最终工程门禁实际通过，父已接受本机有限工程范围；完整 M3、import、模型宿主和长期性能没有完成声明。

最终 `pnpm test:all` exit0，414 tests / 48 files，全通过，无 unhandled。新 21 项（A11/B6/C4）已包含在414中；前包393/45不是本轮总数。当前29项为统一 build/typecheck/lint/fullsuite 与25 retained probes，全部当前执行通过。额外仅必要 storage 增量 build 与针对性纠错/新case验收，34条C command记录实际时间戳在 commands.json，未覆盖历史输出。

## 真实独验与实际计量

C四项均在最终fullsuite通过。server/client/CLI使用真实独立进程与file-backed WAL，token只在私有夹具/IPC/环境及内存，CLI原stdout仅内存解析。

- 固定历史的中文正文与两版本、原actor来源归属、relation+resolve记录，public ready artifact manifest/content_url不含bytes、redacted/missing最小artifact墓碑和redacted post/revision墓碑；cross-space材料、private artifact/binding sentinel不出；已知source/evidence refs投影且省原source_content_hash，未知研究字段保留。CLI完整新文件与既有目标不覆盖。
- privateIPC屏障在专用reader建立T0并生成真实header后暂停后续line。另一真实HTTP进程的revision写入已201完成才release，导出仍含T0、不含T1。分别在快照后进行本space post脱敏与同actor membership撤销，client失败且无end；撤销身份CLI不发表final。
- 固定raw HTTP合法chain正例与wrong-header/truncate/extra/hash/count/sequence/bad-UTF8/CRLF/empty/oversize十反例，全部ClientProtocolError；真实CLI接截断流只清自身temp、不发表final。
- 640条 exact64KiB stored文本夹具（40MiB），逐行seed、不存全部材料数组，discard sink/setImmediate慢读。两个实际完整执行：首新targeted和最终fullsuite，均wire42,399,852 bytes。首receiver heap最大22,902,432 bytes/25样本，最终31,008,968/23样本；server分别36,834,696与36,653,360 bytes、各仅1样本。server采样不足，任何采样最大值都不证明硬RSS上限。它与逐row/line+transportchunk/无巨数组的代码检查和实际完整流量一起支持有限工程结论。hanging sink用户Abort与timeout及时失败，之后active槽归零并由新client进程完成另一个小空间export。

## 首失败与修复，不重写历史

首新三文件targeted为18pass/2fail，并有1个夹具cleanup未观察rejection；A10/B6全部通过。C case1误把既有relation的直接data当data.relation；case2的无body DELETE仍携带application/json导致Fastify400。仅修C response shape、按有无body设置header、观察已启动pending promise，不改变业务断言。

第二针对run为case2pass/case1fail、2skip，无unhandled：case1还尝试resolve `cites`，现服务只允许`challenges`。修fixture type后material1pass/3skip。原两失败run输出和归因文件全保。此阶段没有产品缺陷/重build声明。

B互审随后指出relation_resolution原relation_id/version/id keyset缺compositeindex可能重复排序。父授权A仅改现有r.id PK稳定顺序，不新schema；加1正式反序ID/版本保真case、保存旧EXPLAIN事实和有限10kresolution probe。C必要storage增量build0、A新11targeted全部通过，随后最终typecheck0/lint0/fullsuite0/current25全部0。A初版8formal4失败是开发期真实产品schema缺陷：B错误将check_profiles定义Array，实际模型为Record；B改成Record后后续真实source/built验证通过，首失败原logs保留。另有开发编译报错来自依赖旧dist不识别新types，之后sourcealias noEmit通过；这种旧dist编译环境报错不是功能执行失败，二者分类独立。作者10kposts有限probe与10kresolution合法afterprobe仅补该场景，不计formal/不称长期负载。resolution首次runner虽exit0，但fixture最后动作reopen而relation state误置resolved，元数据不合法；首log保留，仅修fixture为open后再次实际执行，合法after结果2508.758ms/10009lines/maxnext3.666ms。两次均记录，不把first runner成功等同合法fixture验收。

## 完整性与清退

baseline保护3623旧review文件（含整个M3.3-A）、171源码/配置/测试、39当前docs、5mutable、SQL/archive4、schema profiles2、tracked dist208+untracked68。最终源码181、docs40；最终gate source窗口181完全稳定，5mutable稳定。所有3623旧证据、SQL4/schema2、旧fixture assets、HEAD原字节/值保护通过。baseline→final所有source delta均属于A/B/C授权范围且作者freeze hashes匹配。

执行中仅父批准examples/space-export.md措辞/真实CLI tokenfile示例delta，integrity.json单列，不把全任务或文档窗口写成零变化。正常build的tracked dist仍208（35changed，无删除），untracked从68到92（新增24、4changed，无删除）。最终doc-only收尾保护另核，不再运行产品门禁。

有限本包UTF8文本 minted-token-shape扫描131文件零命中；真实fixture admin/ordinary token也仅在内存作布尔泄露断言，不输出expect明文。不是全仓或任意研究文本脱敏证明。实际ps只读清退确认owned export进程0、known private export dirs0，无广泛删除。

## 边界与未运行

新export仅真实file-backed WAL，非WAL/:memory:503不改变旧API或上一包DELETE物理backup支持。Known structured refs四字段加SpaceRevision.pinned_refs过滤；未知正文/structured.pinned_refs保留，不能自动识别任意秘密。SHA链证明完整性不认证来源；sink全程provisional，先前发出的bytes不可追回，end+EOF才完成。

同步SQLite VM不受JS timer硬抢占；长readonlysnapshot可妨碍WAL截断。CPU/介质灾难/600s负载/四真实模型宿主/import均未本轮验证。普通review/decision不等于正式评审，formal review/check仍not_enabled。下一任务仅以父确认的next-task.md规划为准，尚未实施。
