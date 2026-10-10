# E2 时间与索引决策补充（2026-10-09，非产品实现）

- 真实内存 SQLite 3.53.4 实验见 sqlite-time-probe.cjs/json；最终 exit0。前两次未执行 SQL：初次 require 相对层级错误，第二次 macOS sed 修正语法错误仍沿原路径失败；均属实验入口错误，不是 SQLite 结果。没有修改产品、依赖或历史数据库。
- protocol/src/export.ts:12 的记录时间是大写 T/Z、恰好三位毫秒正则；:39–42 仅 header 另查 canonical Date 语义。logical-import.ts:53 原样保存普通 post 时间。因此 offset、小写、不同 fraction 被导入形状拒绝；秒60、13月、2月30日等形状仍可通过 record 日期这一检查。普通新写使用 Clock.nowIso；旧 SQL 的 created_at TEXT NOT NULL 与结构迁移不能证明历史值全为有效 canonical 日期。
- 实测 offset 与 UTC 同 instant 得相同 julianday/strftime；小写 t/z、秒60、13月得 NULL，NULL 默认 ASC 在最前；2月30日被归一为3月2日。小于毫秒的 fraction 被舍入，.0001/.0004 与 .000 相同，.0005/.0009 与 .001 相同。SQLite 函数不等价于完整 RFC3339 验证，也不是任意精度时间顺序保证。
- 无 DDL 的 julianday(created_at),id 方案必须先由父决定 NULL/非法日期及精度语义，并将同一排序表达式用于 keyset 比较和 cursor；不能只 ORDER BY 归一化但 cursor 比较原字符串。小表 EXPLAIN 明确 SCAN + TEMP B-TREE，不据此声称100k性能通过。按原字符串排序只适用于已证明同 canonical 表示的数据，旧库不具此证明。
- schema.ts:3513–3638 检查必须的 PK/unique/named indexes，但没有拒绝额外普通非唯一 secondary index。因此增加一个不改表语义的辅助索引可被当前 preflight 接受；这不等于已有部署自动拥有索引。正式方案须明确服务启动/维护创建位置、失败与页配额行为，以及 backup/import/new/current/legacy 的兼容策略。表达式索引应对应实际 ORDER/keyset，普通(thread_id,created_at,id)不能支持 julianday 排序的全序。
- tests/fixtures/scale 当前只含 README/recipe，full 配方为100k posts、1000 threads（平均100/thread），不是已存在可直接读的DB证明。benchmark runner 会生成/复制并准备身份、执行业务，不能直接称只读实验。若父提供现 held baseline 精确路径，可只读连接核 inventory/hash后用 EXPLAIN/SELECT测相应单线程分布；不能改旧证据、启动600秒benchmark，也不能从平均100/thread外推100k单thread。未来性能测应同时覆盖高集中thread和正常分布，分别记录首/续页，不先预填成功。
