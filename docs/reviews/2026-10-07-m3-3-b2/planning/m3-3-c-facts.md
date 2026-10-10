# M3.3-C 迁移演练下一包事实（只读，一页）

依据 docs07 §6/§7、docs08 M3.3 与 docs09 T12：旧schema升级、离线备份、恢复新目录、损坏拒绝、旧cursor失效、能回到原备份。本页不宣布B.2接受、不改状态、不运行实验。

**已存在可复用材料。** `tests/fixtures/historical-v1-schema.sql/.ts` 是持久旧v1 DDL，m0-m1-r3-regression及r4-b-regression用其/旧结构夹具覆盖事务升级、thread_versions回填、冲突历史原子拒绝与不可降级。`tests/fixtures/history-b8dacd5/{legacy.db,expected.json,recipe.json,provenance.json,README.md}`是H-R1已闭的真实旧提交HTTP历史归档，三实际成功含旧宽structured/幂等结果；其名字legacy.db不表示schema1。该archive按说明去credentials/token_secret，formal `historical-http-replay.test.ts`先在私有副本显式新runtime认证/secret再current coordinator启动。它仍在仓库，可重现兼容来源，不是失踪原M2.1临时库，也不是携生产凭据的可直接运行回滚实例。此轮仅有界读source/目录，没有重生成或重新扫描旧报告。

**分包能力/证据边界。** M3.3-A的真实子进程backup/restore覆盖current2合作锁、WAL一致复制、登记附件状态/hash、坏manifest/FK/链接/覆盖拒绝、恢复新目录、新凭据与旧cursor独立失效、原pending/幂等保持（`m3-backup-recovery*.test.ts`）。B.1覆盖当前授权file-WAL空间NDJSON完整交付/链/EOF和liveguard，不是物理恢复。B.2本轮实现/待父最终门禁的本地新实例import保研究历史而禁用sourceidentity，附件ready→missing；丢弃源权限/session/events/pending/幂等，不能拿来当升级回滚或附件bytes恢复。

**真实缺口。** bootstrap.ts:555–650分类后在单事务applyMigrations/backfill，legacy保身份凭据且补secret、不发新token；CLI serve/init经coordinator可触发升级，没有“必须先保存可回滚材料”的自动步骤。offline-backup.ts:196–204与validateDatabase只接受已initialized current schema2，打开源后不迁移；因此当前 `backup --offline`不能为待升级v1生成旧schema可恢复包，`restore`也只current2。不能把“先升后backup”称pre-upgrade回滚。docs07要求恢复备份+匹配版本二进制；现有H-R1生成脚本只隔离运行特定旧提交以生成历史fixture，不是面向用户的通用旧版本恢复/启动工具。没有本轮完整链证据证明旧v1停止→保旧材料→当前升级→真实HTTP读写/引用/附件/消费→回到匹配旧binary新目录。已接受原子升级回归不等于这条用户演练。

**父可选最小下一包。** (A) 若要关闭上述用户行为缺口，冻结受支持legacy离线pre-upgrade保存/恢复材料及匹配binary边界；不能悄扩现backup schema2语义或自动逆迁移。要决定legacy附件清单/权限/credential保管与新目录门禁，并用持久v1来源+真实进程演练。 (B) 若先做证据包，可用已支持current2实例完成停止→backup→新代码启动/研究读写→restore另一新目录→原actor新credential验旧cursor拒、新pending可用，附H-R1兼容与v1事务升级独立来源；产品可不新增，但必须明确尚未闭pre-upgrade旧schema回滚，不能宣布完整T12。两路线均无需重复600秒/模型/四宿主认证；跨平台介质、任意历史版本/降级、M6/M7迁移仍不承诺。
