# R18 覆盖与证据核对

## 已经独立确认的变化

- 正式测试 146 → 147，11 文件，B 81 → 82；新增正式 AA01，三个函数入口拒绝 detail=none，重开逻辑快照不变，健康正文查询作为对照。
- storage.test.ts 仍为 7 项；一致性测试复用共享提取器，并新增健康工作区 check 命令返回 0。未新增故障源码副本中的 generate/check 命令测试。
- AA01–AA04 全通过；本轮新 AB01/02 失败，AB03/04 通过。探针与正式测试有重叠，不累加成独立用例数量。
- before 的 88 文件与 R17 一致；after 的 89 文件与审查输入一致，5 个既有产品/测试文件修改、1 个 helper 新增、83 个不变。新 helper 为 extract-schema-requirements.mjs。

## 原 B 编号判读

原含义仍按 [R17 固定覆盖表](../2026-10-02-m0-m1-r17/coverage-audit.md)；R18 更新如下。

| 范围 | R18 判读 | 后续动作 |
|---|---|---|
| B01–B08 | 历史结果编码/恢复、升级事务、凭据与初始化已验证的行为保持通过 | 不重新开发、不更换编号 |
| B09 | FTS 额外配置拒绝已通过；PK 来源一致性和生成块失败路径仍需收尾 | 修 AB01/AB02，并正式覆盖相关生成命令 |
| B10 | 原启动失败诊断/资源释放回归保持通过 | 不把函数层 AA01 说成该输入的真实 CLI 锁测试 |
| B11 | 原并发、作用域、幂等/约束检查保持通过；已知坏 PK 实例仍在运行时拒绝 | 新 AB01 是构建对变更源误报成功，不是原运行时拒绝失效 |
| B12 | 既有权限、脱敏、ACK 及 U07/U08 保持通过 | U07=25 修订脱敏，U08=event/idem 回滚，保持原义 |

真实 11 族保持 space.create、space.patch、thread.create、thread.patch、post.create、post.revision、post.withdraw、relation.create、relation.resolve、relation.reopen、admin.redaction。本轮交付恢复了正确列表。

## 上轮要求与实际正式回归

| R17 要求 | 现有正式测试 | 本轮独立证据 |
|---|---|---|
| A1 / FTS 配置拒绝 | 新 AA01 覆盖 detail=none | AA01 通过，关闭功能缺陷 |
| A2 / PK、索引、FTS 来源一致 | 共用提取器 + 正常 profile 等价；无源码变更后的真正生成命令故障断言 | AA02 普通索引/FTS 通过；AB01 PK collation/desc 失败 |
| A2 / 故意改坏描述，真实同步命令非零并恢复 | 未实现；当前故意改 NOT NULL 仅 not.toEqual，check 在健康原工作区跑 | AB03 V1/V2 实测通过，需迁入正式测试 |
| A2 / 完整输入生成编译后无 src 运行 | 无正式命令用例 | AA04、AB03 通过 |
| A3 / 缺驱动、历史源等失败且无部分输出 | 无正式命令用例 | AA03/AB04 非零且哈希不变，指定路径可关闭 |
| A3 / 必要生成块缺失失败且无部分输出 | 无正式命令用例 | AB02 缺 BEGIN 或 END 时 generate 0 + 输出变化 + check 1，待修 |

## 交付归档的准确边界

1. 25 条命令集合、退出码与本次复跑相同。此结论基于独立运行，不把实现报告当验收。
2. 实现目录只保存 observed-25-commands.json 的 stdoutSample/stderrSample，每项上限 500 字符，未交付逐命令完整日志；新归档需补完整输出保存方式，不要求捏造上一轮丢失的完整日志。
3. R17/observed-profile-and-fts.json 在本轮开始前已被覆盖。R17 当时的 review-integrity 与报告保留旧哈希及 1/4 结论，本轮发现的文件为 4/4。两哈希见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。已保留发现时字节；后续归档说明事实即可，不能凭摘要重造旧输出。
4. 原 B 操作/编号主要勘误已落实。小项不另开产品需求：IndexKeyTerm 无 cid；AA01 实测 detail=none；没有 content 变体及该输入的真实 CLI 锁验证；缺输入时保留原文件正是失败原子性要求，不能写成“坏 profile 不保留”。

完整本轮输出及退出码见 [commands.json](commands.json)。未执行真实模型、宿主认证、干净安装和远程 CI。
