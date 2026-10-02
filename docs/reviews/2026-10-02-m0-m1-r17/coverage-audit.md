# R17 交付与 B01–B12 覆盖核对

独立执行 146/146 正式测试（11 文件，B 81 项），原 25 命令结果一致。50 份交付 stdout/stderr 齐全；85 个 before 指纹与 R16 一致，after 与本次实际输入一致，6 个文件改变。R17 清单新增覆盖三个既有 modules/review 文件，总数 88；三个文件与 HEAD 相同。

## 实際测试增量

- 正式 B：76 → 81，增量是 B03 对称旧 resolve/reopen 一项，以及 Z01–Z04 四项。B01 的两个循环内新增快照断言，没有新增单独测试计数。
- storage：新增一项当前/历史 profile 一致性测试，合计正式总数 140 → 146。
- B01 的 fullLogicalSnapshot 是 sqlite_master + 所有表行的排序快照，断言为 `.toEqual`。11 族始终是：space.create、space.patch、thread.create、thread.patch、post.create、post.revision、post.withdraw、relation.create、relation.resolve、relation.reopen、admin.redaction。
- B03 对称用例位于正式 B 文件 430 行附近，完整结果、真实启动迁移、文件库重开、当前 v4 保持、逻辑快照不变均已实际断言。
- Z04 已将两种坏材料的 CLI init/serve 快照与锁释放补入正式测试。

## 原 B 编号的固定含义与当前证据

下表保持 [R4 原任务书](../2026-09-28-m0-m1-r4/next-agent-prompt.md) 的 B01–B12 含义。实现者可以直接引用本表，再添加下一轮发生变化的测试位置；不要重新分配编号。

| 编号 | 原要求 | 实际证据与 R17 判读 |
|---|---|---|
| B01 | 全部已实现操作族的 typed/versioned 编码和重放，无 fallback | 正式 B01 的 11 族完整 data、同连接与重开快照、未知 operation 拒绝，指定补项通过 |
| B02 | 立即/后续修改/重开/响应未交付重试，固定原结果且无重复副作用 | 正式 B01/B02、N01（持久提交后的响应层故障，不是事务回滚或真实 TCP 断线）、P/Q/W 等，既有检查通过 |
| B03 | 旧 `$ref` resolve/reopen 经后续相反动作仍返回原状态和版本 | U02、原 B03、新 B03 Symmetric Reopen：v2/v3 完整 data 经关闭重开/启动迁移后恢复，当前 v4 未回退；通过 |
| B04 | 未知 kind/version、缺历史、坏 JSON 明确非成功，不重新执行 | 正式 B04、G06 及 V/W/X 的输入/语义拒绝，保持通过；不能改名为单纯 marker 白名单 |
| B05 | 合法历史格式转换、业务/凭据保持、旧正文缓存清理、版本推进、重复执行/重开 | 正式 B05、G07 直接实体、K01 冻结历史 DDL、L/N/P/Q/W/X 对应历史形状与重开证据保持通过；不能换成“统一管线”架构宣言 |
| B06 | 引用转换、history/metadata/version 写故障的整个升级回滚及重开不变 | U01、G03、H10 和正式 B06 的真实故障命中及快照证据保持通过 |
| B07 | 凭据全撤销/过期、管理员禁用，不重初始化或增发 secret/token | 正式 B07、U03，保持通过 |
| B08 | 空库初始化失败后安全重试；受支持旧库补 metadata 不增发凭据 | 正式 B08、R2/S11、G08，保持通过；不是 initial_post 响应形状项 |
| B09 | init/真实 serve 遇到未来/未知/损坏结构在监听或变更前拒绝 | 原 B09/B2/Y/Z 已通过；本轮 AA01 是 FTS 配置遗漏，AA02/AA03 是生成校验缺口，仍待修 |
| B10 | secret 缺失/读写异常明确诊断，不使用临时 secret；启动失败资源释放 | 正式 B10、G09、H10、Z04，既有证据保持通过；不能换成全部结构检查的总称 |
| B11 | key/payload 冲突、目标作用域隔离、独立并发请求唯一提交 | 正式 B11、H06/N 等保持通过；R16 坏 PK collation 的 Z01 本轮关闭。不把 Promise.all 称为显式屏障 |
| B12 | 已修权限、脱敏、ACK 保持，U07/U08 通过 | U07 为 25 修订完整脱敏，U08 为 event/idem 写故障回滚；R1–R3 相应检查保持通过。两者不是 CLI 锁测试 |

所有本轮原始输出见 [commands.json](commands.json)。探针与正式测试有重叠，不能累加成独立用例总数。

## 结构来源证据的准确边界

storage.test.ts:232 的测试复制了提取器，比较当前/历史表描述；FTS 只检查 parse.valid 与 tokenize=trigram；唯一故意变更是 `objective TEXT NOT NULL` → `objective TEXT`，断言对象不同。它未执行 generate/check 脚本，也未验证类型、主键、索引键或 FTS 列漂移会让同步命令失败。

本轮 AA02 真正修改隔离 SQL 并执行生成、检查、编译和无 src 导入，证明两个遗漏；AA03 真正去掉驱动/历史源，证明校验静默跳过；AA04 提供完整环境和普通字段跟随的正例。不要用“有一个 not.toEqual”代替命令级失步检查。

## 交付勘误清单

1. 删除不存在的测试操作 post.reply/post.revise/actor.register/token.rotate，恢复上述真实 11 族，不新增产品接口迎合报告。
2. `hasExpression`、中文 FTS 错误、`.toEqual`、完整逻辑快照与当前源码一致描述；不写不存在的 sentinel/错误字符串/断言。
3. 将“100% 任意结构漂移可检测”“物理和逻辑绝对零副作用”改成实际验证范围。
4. 保留原 B 编号语义，N01 是提交后响应未交付，U07/U08 是脱敏及回滚，P01–P06 才是实际 P 探针范围。
5. build/typecheck/lint/test 的成功与 R4/U05、U06 未完成分开表述，不写 25 条全部零失败。
6. 本轮 B01/B03 行为补项已确认通过，下一轮只修正说明，不复制同一批测试。
