# M6.1-B B：schema3、维护与公共逻辑交换

源码与正式夹具已冻结，等待 D 独立构建和验收。`freeze-manifest.json`列 24 个实际变更文件；`implementation.diff`逐项对照 fresh exact-before，未使用 Git HEAD 代替本轮基线。源版本2 SQL先于任何当前DDL编辑按原字节保存，其SHA-256与fresh schema.sql一致：`7e3f01ada4d5285f62b61c5c9d427a288b1fc3dde7ee4146560ad7a0d22b85be`。

## 实现

- 当前schema3只增加 snapshots/items/requests/immutable versions/assignments 五表。生成器保留独立历史1、历史2、当前3结构profile，生成单源迁移DDL；schema-sync同时检查三profile及DDL。
- 聚合存储方法复用同一外部事务；直接调用亦原子写入。更新只改head的phase/version/changed/reason并要求相邻version，先更新head后insert immutable version的故障会一起回滚；不更新名单、target、snapshot或round。轮次MAX+1由服务外写事务使用，唯一约束兜底。权限、资格、幂等和快照验证仍由A服务负责。
- 普通init/serve拒绝已初始化legacy1/2，并给出显式`migrate --offline`指引；blank只由init初始化。低层bootstrap用于明确新实例或受控阶段迁移。旧合成迁移测试切到显式bootstrap，保留原时间、结果和原子性业务断言；普通启动旧库拒绝另有正反断言。
- copy1/2→3仅迁移阶段副本；返回真实source版本与目标3。新physical backup仍format version1、schemaVersion3；restore按manifest的真实2/3 profile与附件inventory先验证副本，只有stage2升级3，再隔离凭据/secret并验证目标3。全部5表与版本材料由物理DB复制保留。
- 新NDJSON header为version2/source3/两formal状态excluded；旧version1/source2/not_enabled仍严格兼容，相关组合不能混用。原10公共族、旧固定hash向量和sha256-chain不变，正式表不被枚举。逻辑导入目标3，来源身份仍禁用、ready附件转missing；元数据记录真实source/formal/header version。正式5表为空。
- 既有wildcard导出、decoder、client stream及snapshot port无需额外改动；它们共用严格header schema，没有独立版本判断。CLI仍复用返回值映射，仅离线迁移帮助文字同步1/2→3。

## 实际检查及保留失败

`author-results.json`与对应完整stdout/stderr记录每次执行。新维护首4/4通过，增加聚合回滚/不可变历史物理恢复后5/5通过。该历史保真用例明确为私有低层存储fixture，验证复制与原子性，不冒充服务端资格批准或合法快照构造证据。新test与CLI/clientstream源别名noEmit首、扩展后均exit0；noEmit未单独测量elapsed，不虚报。

旧space-export11/11、backup11/11通过；logical-import首11/12，唯一FIFO control socket在沙箱listen EPERM，尚未进入业务。获准短寿命本机权限定向复验该原case 1/1通过，预算与断言未改。旧m0选择首19通过/3失败：J04尚用普通init迁移，改为显式阶段bootstrap后该case通过；Y02/Z04真实调用旧schema2 dist，面对新3结构失败，保原日志，等待D统一新build。一次过窄J04选择实际全82skip明确不计验证；修正选择后1通过，随后受影响迁移/启动选择5通过。没有改原测试时间预算。

未运行workspace build、fullsuite、current29、任何新3 builtCLI检查或D独立维护矩阵；D统一窗口执行。未安装依赖、操作VM/容器/全局配置或改旧审查材料。正式评审HTTP/宿主操作未启用，当前只为内部持久服务提供基础。
