# M2.4-A 独立最终验证

2026-10-03。本包有限本机工程验证通过，最终接受由父代理裁定。未观察到产品故障，也没有执行期夹具失败。验证代理只写当前自有 verification/planning 文件。用户中断时全部命令和 after 快照已经结束；恢复后读取完整日志和清单，没有重跑。

| 证据 | 实际结果 |
|---|---|
| 全正式测试 | 26 个唯一文件、263 项全部通过 |
| 新 context 定向检查 | 2 文件、11 项（core 7 + contracts 4）首次通过；随后进入全套，不重复累计 |
| 当前版本化 29 命令 | 每项真实 exit 0，包含一次统一 build、typecheck、lint、全正式套件 |
| 独立 CX HTTP | 实际 raw body 的 4096/65536/default 12288、非法输入 400、必保过大 422、整 pin 删除和 50 sources 大预算控制、只读快照、focus 拒绝均通过 |
| 真实 request_id 临界 | 1759 个需要转义的 quote → 实际 4095 bytes 成功；再加 1 quote → 422，相同材料 |
| 独立 WAL 双连接 | writer 在 reader 已读旧规则后提交新规则和 event；response 为旧规则+seq 1，下次 context 为新规则+seq 2，checkpoint 订阅实际 poll 到 barrier-event |
| 独立 Clock 消费者 | 注入 2030 时钟、24h TTL，exp 等号 201、+1 秒 422 |
| 独立本地工具 | installed Pi validateToolArguments → 注册 execute 和实际 MCP stdio，均保留 4096 的 true/65536 的 false meta，完整 50 sources 控制 |
| 旧独立回归 | 原 SQ/native 大 URL、KV 和三组真实旧成功 HTTP fixture 重放均通过 |
| 旧重点探针 | AC 6、ADv2 5、AE 5、U 8 全通过 |

`coverage.json` 保存实际计数和 CX/旧探针结果；`commands.json` 保存每项命令、UTC、真实 exit、stdout/stderr。`probe-commands.json` 保存 HTTP/snapshot/tools/targeted 首次执行，`request-id-command.json` 和 `observed-request-id.txt` 保存临界，`prior-probe-commands.json` 保存旧只读脚本和新输出。正式计数来自 `observed-tests.txt`。

独立 WAL 屏障、存储和断言均自写，没有复用开发者 before/assertion 函数。屏障明确检查 WAL 与 reader 事务；检查订阅实际新事件，非仅 token 存在。HTTP 直接测实际正文；request_id 不是固定 UUID 估计。mandatory 90k 材料明确是合成历史存储夹具；正常合法 2000 中文字符也证明 4096 拒绝而 65536 成功。独立 HTTP 对完整优先级/核心非法范围的覆盖补充来自正式专项和源码审计，不伪称每个矩阵格都是额外独立运行。

`stable-before.json`、`stable-after.json` 和 `integrity.json` 证明：验证期间全部 122 产品/config/test、35 当前 docs/material 无变化；2078 份旧 reviews/probes/log/evidence、4 SQL/archive、2 schema/profile 原字节不变。HEAD 仍是 b8dacd56779a007a2e7045b682bca0c036fdfc44。构建正常改变 21 个 tracked dist；208 tracked、36 untracked 数量不变，无新增/删除输出。此前未提交的验收实现是本轮基线，从未还原。根状态文档未由验证代理更新。

`implementation-delta.json` 单列开工基线至稳定版本的有意变化：10 产品源码、3 份父批准旧正式测试适配、2 新测试；docs03/04/12 修改并新增 examples/context.md。旧测试适配保留核心语义：cross-interface 相同断言迁移 `.data`；knowledge contract 静态返回改 ContextPage；knowledge V06 改整 pin 删除和实际 4096 上限，并保留 65536 全 40 sources 控制。知识原 7 项与全部历史测试仍收集，没有通过删测试凑绿。源码审计见 `readonly-final-audit.md`。

保留回归计数：knowledge core 7 + contracts 4，search core 9 + contracts 5，typed core 12 + contracts 5，artifact core 9/FS 6/HTTP 8/CLI 4，旧 B82/C26/G4。真实旧原键仍 201，新 create 键 400；旧 revision 新键 stale 409，仅更新 expected_revision 后坏材料 400；同键改 payload 409，重启 3 组、脱敏墓碑 201、撤凭据 401。固定 revision/raw hash/result ref 和无副作用严格比较；只有既有批准的 post.current_revision 当前 head 投影动态处理。

警告与限制：ADv2 stderr 有 16 行 date-time ignored，不声称日期值格式验证。Node26.3.0/pnpm11.7.0 本机；Node22、干净安装、远程 CI、真实宿主/模型、10万负载未跑。本地 Pi/MCP 契约不是真实宿主认证。成功 compact HTTP 正文预算不含 status/header/error body 或 SDK pretty text/content/details 外壳。focus 明确不支持、CLI data-only 丢 meta、必保过大 422 且无继续引用是批准的 A 限制，不虚报 M2.4-B、完整 T06、整个 M2 或 M6 完成。

当前版本化 29 使用 M2.1 media-aware ADv2；原 R21 JSON-only 历史 28/29 和失败出处保留，不能称原历史 29 全绿。本包没有修改旧 probe、期望或观测记录。准备期两次工具 JavaScript 解析失败发生在 shell 执行前，已记 planning；不属于产品失败，也未掩盖任何首次失败日志。
