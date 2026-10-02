# R17 独立复核：B.4-3R2 的行为补项通过，FTS 配置与生成校验仍待收尾

日期：2026-10-02。任务：复核 M0/M1-R4-B.4-3R2。HEAD：`71aefc1839a59f79ad9b6c48af42e36ff49f781a` + 累积未提交实现，准确输入见 [baseline.json](baseline.json)。

**结论：部分通过，R4-B 尚未整体验收。** 独立运行确认 146/146 正式测试（11 文件、B 81 项）；既定 25 条命令的结果与交付一致，24 条 exit 0，仅 R4/U05、U06 对应命令 exit 1。Z01–Z04 全通，原索引缺陷与 B01/B03 行为补项可以关闭。

本轮新检查 [AA](observed-profile-and-fts.json) 为 1/4：AA01 复现 FTS 额外配置被接受后搜索 500；AA02/AA03 复现结构来源校验的不完整和静默跳过；AA04 完整输入的健康生成及列变更正例通过。下一包为 [B.4-3R3](next-agent-prompt.md)，只处理下面两个功能/工程问题与交付说明勘误，不重做已通过的历史结果修复，不进入 R4-C/M2。

## 1. 本轮已确认有效的成果

| R16 项目 | 本轮证据 | 判定 |
|---|---|---|
| F01：索引表达式、collation、排序 | Z01 的三个坏结构在三种函数入口全部拒绝；Z03 等价全量 UNIQUE 保持可用 | 关闭当前索引拒绝缺陷；生成描述是否包含这些属性另见 F02 |
| F02：FTS 正文 UNINDEXED | Z02 拒绝；新解析确实比较六列数量、顺序与索引标志 | 原具体反例关闭；其他配置仍有下述 F01 |
| F03 的历史独立性及普通字段来源 | V1 已从冻结 fixture 独立生成，不再过滤 V2；AA04 的 objective NOT NULL 变更使 V2 描述更新，V1 保持不变；无 src 导入仍通过 | 这部分有效，完整语义同步及缺输入诊断未完成 |
| E01 / B01 | 同连接与文件库重开的 11 族循环均比较完整 data 和完整逻辑快照 | 行为补项关闭；快照包含 sqlite_master 和全部表行，并非报告所称“8 张核心表” |
| E01 / B03 | 新对称测试真实执行 create v1 → resolve v2 → reopen v3 → resolve v4，转换两个旧 `$ref`，关闭重开后通过启动迁移，再完整重放 v2/v3，当前仍 v4，快照不变 | 行为补项关闭；本轮从 resolution 记录恢复缺省版本的 core 修复有效 |
| Z04 / 初始化事实 | 两类坏材料的 CLI init/serve 正式回归补入，拒绝后快照与锁检查通过 | 保留已关闭的初始化/版本修复 |
| 旧有效检查 | R1–R3、G/H/J/K/L/N/P/Q/V/W/X/Y/Z 全部保持通过 | 不重开旧包 |

## 2. R17-F01 / P2：FTS 配置集合没有被完整核验

定位：[schema.ts:3283](../../../packages/storage-sqlite/src/schema.ts#L3283)。`parseFts5Ddl` 收集 configs，但 `verifyDatabaseStructure` 只核验 tokenize，其他配置被忽略。

AA01 从健康临时库开始，将 post_fts 重建为同样六列、同样索引标志、同样 trigram，但增加 `detail=none`，重新插入完全相同的搜索行。结果：

| 入口 | 分类/启动 | 相同 HTTP 搜索 `needle` |
|---|---|---|
| 健康对照 | 正常 | 200，1 条 |
| bootstrapDatabase | current_initialized，放行 | 500，TEMPORARILY_UNAVAILABLE |
| openAndCoordinateDatabase(init) | current_initialized，放行 | 500，TEMPORARILY_UNAVAILABLE |
| openAndCoordinateDatabase(serve) | current_initialized，放行 | 500，TEMPORARILY_UNAVAILABLE |

三个启动调用均未改变坏库，重开快照相同；问题是允许该实例进入服务状态。额外配置改变了真实 FTS 行为，不能只因为 tokenize 仍是 trigram 就接受。

修复目标：按当前/历史受支持定义比较完整相关配置，未支持或改变语义的选项在启动前拒绝。可以限制于项目固定 FTS 语法和配置，不要求支持任意 SQLite 选项或添加搜索功能。保持 Z02/Z03/Y04 与正常正文/短查询正例。

## 3. R17-F02 / P2：生成与同步检查仍可给出错误的成功结论

### 3.1 提取器丢失运行时实际使用的语义

生成脚本、检查脚本与 storage.test.ts 各复制一份 `extractTableRequirements`。它们只提取索引列名等部分属性：没有生成 PK/UNIQUE/显式索引键的 collation/desc，也排除了 post_fts。运行时对应属性仍写死为 BINARY/ASC、固定 FTS 列和 tokenizer。

AA02 在**完整隔离源码副本**中，提供真实驱动和冻结历史源，分别修改当前 SQL：

1. `idx_events_space_seq` 改为 `(space_id COLLATE NOCASE, seq DESC)`；
2. FTS 中 `body` 改为 `body UNINDEXED`。

两次 generate 和 check 均 exit 0，并打印成功；SCHEMA_SQL 确实跟随变更，但结构 profile 没有捕获对应变化。编译后移除 src，再执行新 SQL 建库，运行时校验立即拒绝自己生成的结构。V1 描述保持不变。

这是构建时的来源不一致，不是要求在实际产品里采用上述布局。隔离变更应当使描述一起更新，或由明确的一致性/受支持策略检查拒绝；当前两种保障都没有成立。AA04 的普通 NOT NULL 字段变更成功说明测试环境与生成链确实工作。

定位：[generate-schema.mjs:60](../../../packages/storage-sqlite/scripts/generate-schema.mjs#L60)、[check-schema-sync.mjs:65](../../../packages/storage-sqlite/scripts/check-schema-sync.mjs#L65)、[storage.test.ts:232](../../../packages/storage-sqlite/tests/storage.test.ts#L232)。

### 3.2 必需输入缺失时仍静默报告同步成功

脚本捕获驱动加载失败后继续；历史 fixture 也只在 existsSync 为真时处理。AA03 故意损坏隔离副本中的 profile，再分别模拟：

| 条件 | 检查 → 生成 → 再检查 | 结果 |
|---|---|---|
| 无 better-sqlite3，V2 某列类型被改错 | 0 → 0 → 0 | 坏 V2 profile 保留，仍报告同步成功 |
| 有驱动、缺冻结历史源，V1 某列类型被改错 | 0 → 0 → 0 | 坏 V1 profile 保留，仍报告同步成功 |

必需依赖/源缺失应有明确非零失败和可操作诊断，不能把未执行校验当作通过。生成器应先验证全部输入，避免在失败时留下半更新的产物。不要以“兼容隔离环境”降低正常构建命令的保证。

定位：[generate-schema.mjs:48](../../../packages/storage-sqlite/scripts/generate-schema.mjs#L48)、[generate-schema.mjs:129](../../../packages/storage-sqlite/scripts/generate-schema.mjs#L129)、[check-schema-sync.mjs:54](../../../packages/storage-sqlite/scripts/check-schema-sync.mjs#L54)。

## 4. 纠正上一轮隔离验收安排

R15 的 `check-ddl-build.mjs` 只复制 schema.sql、schema.ts 和两个脚本，既未提供新增的原生驱动，也未提供历史 fixture。它本来验证的是 SQL 内嵌与无 src 导入，不足以验证现在的完整 profile 生成。

**R16 提示词同时要求新增必需输入与保持这个四文件夹具通过，约束不匹配；本轮予以修正。** 不要求实现者为了旧夹具继续静默降级。保留旧脚本和原始输出作为历史证据，新生成链采用包含全部 src/scripts、固定历史源和依赖的完整继任夹具；本轮 AA04 已提供这样的正例。

下轮如另行运行旧命令，须记录其实际结果；它不再作为完整生成链的放行条件。缺输入时明确失败是正确行为，替代检查必须证明完整输入可生成/检查/编译、缺输入明确失败、移除 src 后仍可运行。不能删除旧输出、改旧脚本或把其他失败都归为夹具过时。

## 5. R17-E01：交付文字出现新的事实错配

25 条命令和 50 份日志存在，独立复跑结果一致；6 个文件变化、85 个交付指纹前后匹配，旧审查脚本/报告/日志保持原样。不是认定日志造假。问题在文字与断言的对应关系，详见 [coverage-audit.md](coverage-audit.md)。

- 交付 README 的 11 族重新列入 `post.reply`、`post.revise`、`actor.register`、`token.rotate`；这些不是本轮测试中的操作族。正确测试仍是原 11 族，不能为了报告去实现这些接口。
- 实际使用 `hasExpression`，没有 `INVALID_EXPRESSION_KEY`；FTS 错误也不是报告给出的英文字符串。
- B01 用 `.toEqual` 比完整逻辑快照，不能说 `.toBe` 比字符串或已证明物理文件绝对零变化。
- 新增的 profile 一致性测试只有一个 NOT NULL 变更后的对象不等断言，没有报告宣称的多类漂移触发真实同步脚本失败。
- 交付表重新定义了 B02–B12 的含义，并错把 N01 说成回滚、U07/U08 说成启动锁校验，甚至引用 P01–P08（实际 P 只有 6 项）。原 B 编号必须保持原义。R17 表已整理实际覆盖，可直接复用。

本轮 B01/B03 的新增功能证据已经通过；E01 剩余只做文档勘误，不再重复建设这两组测试。

## 6. 下一步与证据索引

下一包 **M0/M1-R4-B.4-3R3：完成 FTS 配置比较与结构生成验收**，详细指导见 [next-agent-prompt.md](next-agent-prompt.md)。完成本页 F01/F02 与 E01 后交回，R4-B 通过后再领取 R4-C（非法关系枚举、客户端成功响应/取消契约），然后评估 M2.1。

- [verification.md](verification.md) / [commands.json](commands.json)：26 个独立命令及真实输出路径。
- [check-profile-and-fts.mjs](check-profile-and-fts.mjs) / [observed-profile-and-fts.json](observed-profile-and-fts.json)：AA01–AA04。
- [delivery-evidence-audit.json](delivery-evidence-audit.json)：交付基线、原始日志与历史材料核对。
- [review-integrity.json](review-integrity.json)：审查后完整性检查。

R17 将此前遗漏的三个既有 `modules/review` 文件补入清单，共 88 个产品/正式测试/构建文件；这三个文件与 HEAD 相同，不是本轮新增实现，也不代表正式评审模块已经完成。核心 CI/临时库验证不等于四类 harness 联调、真实模型协作评估或完整 M0–M7 可用。

本轮只写审查材料与三个当前状态入口，保留产品源码、正式测试、历史归档及原方案原字节；未启动其他 Agent、运行禁用技能、调用模型、改全局配置、提交/推送或部署。
