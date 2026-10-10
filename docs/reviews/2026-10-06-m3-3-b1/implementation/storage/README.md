# A交付（待统一build与独验）

core SpaceExportService/同步session、专用snapshot port；SqliteStorage窄reader factory/highwater/redaction guard、独立readonly WAL reader；new m3-space-export.test.ts正式10场景完成。最终sourceonly10/10、1文件（tests-v3.log）与临时sourcealias noEmit exit0（typecheck-source-v3.log）。未build/fullsuite；真实route/client/CLI/4独验由C统一。

before.log只盘点旧built无SpaceExportService，不伪称缺import编译失败是产品反例。首次8场景4失败保留tests-first.log：B export space_revision.check_profiles误Array而实际Record，B修protocol后tests-v2 9通过（另新增fileDELETE拒绝case）。父要求64位seq追加1case，tests-v3 10通过。各轮相同测试修订不累加。直接包noEmit因旧dist依赖不认识新types报错，之后未build而sourcealias真实检验通过，不称为产品通过或失败反例。

api/限额/白名单/格式详planning/frozen-contract.md。new reader只file-WAL，不修改源模式、不serialize内存库；live guard完整授权/epoch/redaction范围，seq CASTTEXT无Number舍入。actor表/membership/internal系统材料排除，墓碑/knownrefs/projectedhash语义保持。旧StoragePort.readSnapshot仍同步约束，未改schema/ctor/backup/lock/bootstrap。

已知限制：独立snapshot可能阻WAL截断；同步SQL查询CPU非硬deadline（单次.get不能被JS timer中断），LIMIT1/rowcap不等于固定SQLite扫描成本。已发网络bytes不可回收，footer/EOF让消费者拒半流而非追回已交付内容。字段白名单不是任意研究正文秘密识别器；链非签名。未来import/评审/完整运维不在此交付。

未安装/新依赖/模型/commit/push/global配置，没有修改旧证据/SQL/fixture/archive。

父额外授权的一次作者probe（非formal数量）：keyset-author-probe.ts以专用config运行，不是*.test.ts，不进默认全套。新私有file-WAL正确FK的10000小post+每个1revision、128B正文，逐line discard且每next后setImmediate让出，30s截止；唯一结果exit0/complete=true，20006行、3806.431084ms、最长单next1.112833ms（keyset-author-probe.log）。本fixture未见明显逐row从头扫描症状，不证明100k规模、异空间巨量、所有SQL族容量或硬CPU预算；无索引/产品修改、无扩大/重复probe，正式仍10。命令为pnpm exec vitest run --config /tmp/detuned-m33b1-probe.config.mjs，原config在同目录保存可审。

## Resolution 主键窄修

父接受 B 的复合 keyset 成本 finding，旧 SQL/同等 schema 的 EXPLAIN 与索引事实存 resolution-before.log：SCAN r + TEMP B-TREE ORDER BY。仅新导出 family 改为 r.id 主键升序，无 SQL migration/索引变化；契约与 docs03同步。tests-v4.log 正式11/11，typecheck-source-v4.log源码别名 noEmit 成功。独立非formal resolution-author-probe.ts 有界10000合法历史、逐行丢弃/让出，保真id/version/ref与全count；first probe最终relation state fixture错误为resolved（最后动作reopen），已保首log并仅修fixture为open后重跑，最终log是正确元数据结果。两次不是新增formalcount，不据此宣称100k或硬CPU预算。产品重新freeze；统一build/fullsuite仍由C。
