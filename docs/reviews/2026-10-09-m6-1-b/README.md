# M6.1-B：schema3内部评审请求与固定名单

根已审读[独验报告](verification/independent-report.md)（SHA eae7000fe0ede4d587db69ca85035afca692780b49e0cf554321d2bc3db47945），接受本包限定功能；文档末核待D封存。内部request create/get/snapshot/cancel、五表持久化、不可变版本重放、固定资格名单与schema3维护/公共交换已验。没有review HTTP/CLI/MCP/Pi/Web入口，封存提交/揭示/批准/check与完整M6/M7未完成。

最终core **737/111**完整单worker运行249.35s（新三文件19case、旧generation新增V3参数1）；最终build9.847s/type7.983s/lint8.378s均0。五受影响文件33/33。current25是6原probe+4已准旧adapter+15本包新adapter组合全0，非25新增场景或29原脚本全绿，M01后复用。以D报告与逐项receipt为准；额外三旧测试standalone noEmit的9 diagnostics不属于项目typecheck通过范围。

首full 735中537pass/198fail、DI07三个合法脱敏重开首失败、ENOSPC收集失败以及#12首次日志路径覆盖/工具输出保留缺陷均保留。F01修冻结名单与贡献者排除/固定group内在一致性；M01将启动内在结构校验与在线privacy分开。DI07最终target/dependency/artifact重开均true，在线410/撤权404/正常对象/compact原bytes保持，真正rawSHA/items/ref损坏仍拒。见[首反例](verification/DI07-first-observations.json)、[最终组合](verification/DI07-core-final-observations.json)、[维护源审](verification/maintenance-source-review.md)。不声称首次通过或所有历史检查全绿。

schema3普通serve/init拒legacy1|2，明确offline copy到新stage；原源及备份manifest保留。新物理format1备份schema3含五表，旧backup2只新stage升级3。公共logical wire2/source3/excluded与旧wire1/source2/not_enabled严格相关，fixed10族不含正式对象，新import正式表为空。不改变旧Hasher/JCS，不恢复被清正文，不把DB ready当当次物理bytes验真。

[作者A v4](author/request/freeze-manifest-v4.json)、[B实现](author/protocol/README.md)、[当前接受记录](verification/acceptance.md)保源码/测试首失败与差分。无网络模型或用户凭据读取；用户禁止VM/Colima/新增常驻环境，原环境保留不操作。根决定本机workspace并发1、核心worker1/文件串行与证据归档后及时清合成tmp，资源根因不宣称全消除；[资源记录](verification/resource-hold.md)、[两合成perf清退](verification/two-perf-cleanup-receipt.json)不等同VM管理。

下一[M6.2-A](planning/m6-2-a-task.md)为根冻结的内部封存初评与全员揭示，须本包metadata封存及新fresh后实施；[剩余目标](planning/remaining-work.md)继续保M6.3决定/有效性、M6.4公开入口、M7检查等工程范围。本包不增加假公开示例。
