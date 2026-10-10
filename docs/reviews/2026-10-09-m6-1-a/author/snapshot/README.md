# M6.1-A 快照作者交付（待独验/根验收）

只改 ReviewModule、protocol review DTO 与未广告 tool request 单源复用，新增5组正式快照测试。完整行为见 [root-contract](../../planning/root-contract.md)。B独立JCS，不改旧content/idem hasher。无DDL/持久化/HTTP/新工具/依赖变化；声明贡献者与metadata附件不代表独立资格/现场文件验证。

实际 source 首1/5，默认空间required检查缺配置导致fixture正确被拒，保原日志后fixture显式无检查，第二5/5。加强detachment/bytebudget后仅RS01+RS04两组通过；补坏profile/损坏JSON回归时首RS04失败是fixture恢复函数读取自己损坏的JSON，产品断言已正确400，直接恢复后RS04通过。精确hex修正JS `$`末尾换行边界后仅RS03通过。最终5unique组合覆盖，无多计重复。

noEmit首2：测试inject payload参数unknown不符合真实InjectPayload，引发4个TS错误；仅fixture参数改Record<string,unknown>后0，后随真实新增边界必要检查0，最终含test检查0。所有log/直接exit见checks.json；测试耗时为runner报告，不冒称额外wall监督。

真实in-memory SQLite与Fastify inject，读snapshot无业务写，205修订分页/10001限额实际；synthetic历史/附件/损坏JSON是私有兼容边界fixture，不是自然admin/import流程。原内容hash与旧canonicalJson未改，并spy证明构造不用旧canonical。没有rootbuild/full/current29/独验/模型/外部网络；D统一执行。

接口：ctor(storage,hasher,clock,idGen,authService)；generateSnapshotManifest(auth,spaceId,req)同步返回{manifest,manifestHash}。Auth刷新/observer先于request判断，单readSnapshot；请求重复/code对应/材料生命周期/policy/metadata/core权限在模块判断。canonical错误安全映射。

产品/测试/contract冻结后停写，源清单见freeze-manifest.json；[fresh差分](exact-fresh.diff)，[JCS相邻源审](peer-review-canonical.md)。
