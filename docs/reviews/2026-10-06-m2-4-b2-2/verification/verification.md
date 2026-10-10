# M2.4-B.2.2 独立验证

2026-10-06，本包有限本机功能工程验收证据已完成，交父 Agent 判定。最终产品是 core 原 5 路径 + protocol v2 10 路径的冻结版本。没有执行下一包、真实模型或长压测。

## 真实结果

- 正式 full suite 本轮唯一一次：**311 tests / 32 files** 全通过；新两文件在全 suite 中是 core 10 + contracts 8。见 [真实 stdout](observed-current29-03-2026-10-06.txt)。typecheck、lint exit 0。
- current29 **29/29**，build 项引用修复后的 `build-v2`，不是复用旧 manifest 的执行元数据。见 [coverage.json](coverage.json)、[原命令列表](current29-manifest.json)、[本轮实际 commands.json](commands.json)。
- 本轮记录 **48 个执行命令：47 exit 0、1 exit 1**。唯一独验失败是 v1 TP tools probe 在本地 TypeBox 未登记 date-time 时的完整 page 校验失败；首脚本及首 stdout/stderr 原样保留，严格日期局部修正版通过。它不算产品失败或格式认证。
- 产品构建实际 **2 次**：v1 首构建；route 修复后的 v2 必要构建。v1 首 17 专项、TP HTTP、WAL、tools 首失败与修正版成功均保留，不能当最终 v2 全部重跑记录。
- v2 新 contracts **8/8**；TP HTTP、独立 cursor 次序、真实 tools/CLI 通过。原 PR3 / SR4 / SQ / KV 共 9 脚本按原路径运行，全 exit 0。
- 原动态 ADv2/AE 未修改而真实运行。实际 **38 operations / 38 business routes，20 request body operations = 19 JSON + 1 multipart，placeholder 0**。AD stderr 保留 **36 条 date-time ignored** 警告；不把结构门禁称日期格式认证。

## TP 边界覆盖

[HTTP v2 stdout](observed-tp-http-v2-2026-10-06.txt) 以独立合成 stored metadata 91 行验证原 storage next null / 非 null 两种预算尾裁：均 8 页完整重组，无重复、无跳过；limit-only 91 页；改变 limit/budget 与默认预算各 3 页。游标锚点是 last 实际发送。真实 raw HTTP envelope 字节包含 request_id 的 JSON 转义，空与非空 metadata 临界均接受 4095 bytes，下一步 422；验证三 meta 分支、缺失 after_id 合法 lower bound、严格签名字段、原 TTL 不延长、到期等号 200/+1 秒 400、当前 lifecycle 与 archived thread、无正文投影及读取无写。

[新增 v2 cursor 次序 stdout](observed-tp-cursor-order-v2-2026-10-06.txt) 独立验证空串、空白、4097 字符 cursor：非成员 404、无 read capability 403、跨 space 与不存在 thread 404，正确目标统一固定 message 400。重复 cursor 与 unknown query 仍 transport 400。数据库指纹保持。没有复用开发者 D08 assertions。

[WAL v1 stdout](observed-tp-wal-first-2026-10-06.txt) 用真实双连接 WAL barrier 验证本页 thread/posts metadata 同一 snapshot，下页看到 current head/lifecycle。core/helper 源 hash 在 v1→v2 完全相同，故该专项沿首证据，**没有声称 v2 又执行 WAL 或 core10 定向**；唯一最终 full suite 包含 core10。

[tools 产品 v2 stdout](observed-tp-tools-product-v2-2026-10-06.txt) 验证安装 Pi 0.87.1 validator→executor、MCP stdio list/call、8 工具及 client/CLI 新旧入口。目录 8 页接固定正文 7 页，中途 head 更新仍重组指定 revision，真实 redaction 后旧正文 cursor 410；旧 thread 默认首批 50 data 与旧 raw cursor 保持。完整 page schema 校验前实际 emitted 时间戳均通过严格 UTC ISO 毫秒/Date.parse/toISOString 检查，局部 FormatRegistry 在 finally 恢复。其他 union 分支 Expected false/null 是完整 union 诊断分支，未作为产品异常。

## 版本与失败归因

[version-transition.json](version-transition.json) 证明 v1→v2 仅新 route 与新 contracts 两 source 路径改变。父接受的产品 D08 红绿及修复记录在 [协议修复首红](../implementation/protocol/repair-d08-red.stdout.log)、[协议修复绿](../implementation/protocol/repair-contracts-green.stdout.log)；本独验并非重新执行作者断言。协议实施早期 format registry/test typing/TypeBox symbols 失败亦保留在 implementation，不能称整个实施过程零失败。

独验 probe 首失败见 [原 tools 脚本](check-thread-tools-cli.mjs)、[首 stdout](observed-tp-tools-first-2026-10-06.txt)、[首 stderr](observed-tp-tools-first-2026-10-06.stderr.txt)。[修正版 probe](check-thread-tools-cli-v2.mjs) 用本次 Value.Errors 与真实 emitted dates 归因，仅局部登记严格日期 validator，未删完整 schema 断言或登记恒 true。它分别在 v1 产品及 v2 产品执行，记录名字区分 probe 版本与产品版本。

## 完整性与限制

[integrity.json](integrity.json) 比较 v2 stable-before→stable-after：129 source/config/tests、36 currentdocs、5 mutable 状态文档、2492 既有不可变 reviews/probes/logs、SQL/archive 4、schema 2 全零变化、零新增/删除，HEAD 仍 `b8dacd56779a007a2e7045b682bca0c036fdfc44`。首基线全部未提交改变均继承。dist 是构建产物，见 [build-artifact-delta.json](build-artifact-delta.json) 与 [只读源审计](readonly-audit.md)。

三遗失原真实历史 HTTP fixture 重放 **not_run**，未重复 ENOENT、未伪造重建或声称历史全部回归保持；恢复条件仍是找到原 DB+凭据及同版构建。当前新合成历史 shape 与当前原脚本回归不等同原 capture 字节重放，不推翻旧历史验收。

未运行 Node22、干净安装、远程 CI、四真实宿主模型会话/认证、100k/长时间负载。目录按动态 id ASC 与逐页 metadata snapshot 工作，不承诺跨页冻结全集；HTTP body cap 不包含 headers/errors/SDK/pretty CLI 包装。所有事实仅支持本包有限本机工程验收。
