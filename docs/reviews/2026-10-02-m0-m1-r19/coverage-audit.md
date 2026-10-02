# R19：正式生成回归的有限补项

这份清单延续 [R18 提示词 B1](../2026-10-02-m0-m1-r18/next-agent-prompt.md)，没有新增 SQL 语法或数据库兼容性要求。当前正式套件的 5 项全部执行成功；“执行成功”与“指定输入被真正测到”分别判断。

| 既定场景 | R19 所见正式覆盖 | 下一轮补项 |
|---|---|---|
| 健康输入 / 允许列变更 | 改 `objective` 的 NOT NULL 后 generate/check、编译、移除 src 再运行均通过；缺少 profile 差异断言 | 保留健康正例；断言输入确实改变、V2 对应属性改变、V1 与冻结历史来源一致且不变 |
| 命名索引来源 | 用例目标 `idx_posts_thread_created` 不存在；替换是 no-op | 使用实际 `idx_events_space_seq`；先断言唯一命中和文本变化，再断言 keyTerms 的 collation/desc 跟随或明确策略拒绝；成功时运行时认可同一 DDL |
| FTS 来源 | 新生成测试没有 FTS 输入变化 | 复用 AA02 的有限来源变体含义，验证 indexed/UNINDEXED 属性不会丢失；不扩大到任意 tokenizer 或 SQL 解析器 |
| PK NOCASE / DESC | 两例生成拒绝及诊断通过；同步检查非零 | 保持；拒绝测试明确区分策略错误和环境/编译失败，必要时补同步入口诊断 |
| 故意改坏 V1 / V2 profile | 只测 V2：check 非零，generate 修复，check/无 src 运行成功 | 参数化补 V1，对两者断言真正改坏与真正修复，历史 SQL 文件仍保持冻结 |
| 缺 BEGIN / END MIGRATION_DDL | 两例 generator 非零、诊断和字节哈希不变；正式用例未组合源变化与恢复 | 使用 AB02 已有组合条件；保留失败哈希，按各入口责任检查 check，再恢复标记验证成功与同步 |
| 缺驱动 / 历史源 | generator 非零、输出哈希不变 | 补 check 的失败与诊断，以及恢复输入后的成功 |
| 缺当前源 / helper / V2 标识 | 正式套件缺失；AB04 独立探针通过 | 按 AB04 参数化补齐 check/generate 拒绝、生成前后哈希及恢复输入路径 |

无需把每行拆成一个大型测试文件，也不规定最终用例数量。可以用共享临时项目 helper 和参数化表；测试成功时须验证实际行为，测试失败时须验证预期原因。

## 夹具与断言要求

1. 操作自己创建的临时完整项目；包含 src/scripts、冻结历史源、已安装依赖。变异、删除和恢复都在该副本中完成。
2. 每个文本替换先断言匹配次数或具体目标存在，再断言变异文本不等于原文；避免下一次源布局变化后测试静默退化。
3. 正常路径调用真实 `generate-schema.mjs`、`check-schema-sync.mjs`；按已有 helper 编译并在移除 `src` 后运行产物。不能用手工构造 profile 代替工具执行。
4. 非零退出测试避免把 `null`、超时或 signal 杀死当作预期失败。断言实际退出状态和对应诊断；不要只写 `not.toBe(0)` 后忽略 child error。
5. 生成失败比较完整目标文件字节哈希，恢复输入后同一命令可成功。源码中缺失 helper 可产生模块加载诊断，不要求把所有错误改造成同一文案。
6. 正式测试不依赖 `docs/reviews/` 的执行实现。可参考 AA/AB 输入和期望，把稳定场景落到测试自身。
7. 主键仍采用 BINARY/ASC 固定策略；不要求新增 PK profile、schema 版本、磁盘断电恢复、通用 SQL AST 或新的存储后端。

R18-F01/F02 已经独立关闭；此补项不重新打开它们。旧 B01–B12、11 操作族、历史重放与初始化的验收含义沿用历史记录，不能重新分配编号或重复实现。

原始核对：[test-coverage-audit.json](test-coverage-audit.json)。独立正例与边界：[AA 输出](observed-profile-and-fts.json)、[AB 输出](observed-generation-completeness.json)。
