# M2.4-B.1 独立恢复验收

2026-10-06，沿用10-03同一任务包与原计划；父代理已接受M2.4-B.1有限本机功能工程验收。新增固定规则引用/续读、context预算省略、真实工具/CLI与本轮当前29均通过。三组真实旧HTTP原键重放因原临时DB/凭据缺失，本轮未完成；不能将10-03通过日志填成本轮成功。

| 本轮真实检查 | 结果 |
|---|---|
| 一次统一 `pnpm build` | exit 0，计入当前29，无重复build |
| 全正式套件 | 28唯一文件、276/276通过 |
| 新正式专项 | 2文件13项，core8+contracts5；计入276，不重复累计 |
| 当前版本化29 | 29/29真实exit0，原清单原脚本；包括typecheck/lint/fullformal/build |
| 固定ref与预算降级 | 4096 context两null/status omitted/ref1/truncated；可放小pin保留，原大规则422意图按批准map迁移到引用并真实重组 |
| 固定旧版续读 | 更新当前revision到2后，仍完整重组revision1；先两个4K非末页分别推进Clock60秒，cursor沿初始exp，再换64K预算 |
| Unicode实际raw HTTP | 58,577文档bytes，4K/64K/default12K分别23/2/7页，UTF8边界、二次JSON转义、连续offset/非空进展、complete/meta配对；严格等于固定存储版 |
| 真实req.id临界 | 空间页1790引号→4095实际body bytes，1791→422；context1704→4096，1705→422；无读取写副作用 |
| cursor/当前授权 | 篡改、额外键、用途/actor/space/revision/version、非法UTF8/负/零/末尾位置、超4096chars拒400；exp等号成功、+1秒400；撤成员404/撤凭据401先于坏cursor |
| WAL双连接 | reader读旧规则后writer提交新规则/event；旧ref1/seq1、新ref2/seq2；checkpoint实际订阅poll到barrier-event。checkpoint exp等号201/+1秒422 |
| 真实本地Pi/MCP/CLI | 安装Pi0.87.1 validator→注册execute；MCPstdio ListTools object+anyOf与call；CLI context整page保留meta、space5页精确重组 |
| 原目录检查 | ADv2动态实际36operation/20requestBody，19JSON+1multipart；ADv2 5/5、AE5/5、AC6/6，未改历史脚本 |
| 原SQ/native与KV | 原脚本exit0；大URL真实loopback、旧知识/来源状态保持 |
| 三真实旧HTTP原键 | 原脚本执行ENOENT，历史temporary_credentials已消失，未进入产品重放；本轮未通过 |

`commands-2026-10-06.json`逐项保存UTC、真实exit与新stdout/stderr；`coverage-2026-10-06.json`为SR映射与真实计数。`current29-manifest-2026-10-06.json`仅复制原清单/原元数据作恢复参照，不是本轮运行记录。

首失败完整保留：`observed-sr-tools-first-2026-10-06.txt`为sandbox localhost listen EPERM；`observed-targeted-first-2026-10-06.txt`为12过1失败，R03同一EPERM。允许本地loopback后同脚本和同正式13项通过，无产品改动。`observed-prior-historical-2026-10-06.stderr.txt`保留旧临时凭据ENOENT；查明原DB/凭据无持久副本，不重新制造历史HTTP成功或rawhash。本轮三组历史重放不计绿，A原通过证据仍受2207文件完整性保护。条件是重启后临时材料丢失；未排除有用户另存备份，只有恢复原DB/对应凭据才可重试该真实fixture。

恢复完整性：HEAD仍b8dacd56779a007a2e7045b682bca0c036fdfc44。`recovery-2026-10-06.json`与`recovery-integrity-2026-10-06.json`分列10-03原基线至恢复的合法B.1变化；已有未提交实现均保留。冻结后`stable-before-2026-10-06.json`→`stable-after-2026-10-06.json`证明125product/config/tests、36docs/material全零变化；2207旧review/probe/log/evidence、4SQL/archive、2schema/profile原字节全零变化。build修改19个tracked dist，208总数不变；新增新service四产物，untracked36→40。恢复前15个protocol tracked dist变化为已有中断产物，冻结后build没有再改它们。详情见`integrity-2026-10-06.json`。

独立probe使用显式合成历史存储shape，不宣称真实旧HTTP生成这些大规则。SQLite TEXT写入孤立surrogate已把objective尾字符转为U+FFFD，rules JSON保留原surrogate；读取重组精确恢复stored值，不能声称恢复写入前已丢字符。Unicode没有删弱。新2026-10-06 WAL版本仅增新ref/status断言，旧10-03原脚本保留。

限制：本机Node26.3.0/pnpm11.7.0；Node22、干净安装、远程CI、真实四宿主模型、10万负载未测。Pi/MCP仅真实本地SDK/协议路径，不等于真实宿主模型认证。ADv2有18行date-time ignored警告，不声称日期格式已验证。成功compact HTTP正文cap不含headers/status/error/SDK包装，读取一次完整文档不是SQL VM/CPU/常数内存预算。focus仍400不支持；帖子/主题正文续读待B.2。CLI context已整page，A旧data-only限制在此包已解除；search及旧post/thread合法输出没有扩展。M2.4-B.1不等于完整T06/M2.4/M2，更不等于M5/M6/M7。

父最终取舍：三真实旧HTTP原夹具重放列为本轮环境证据缺口，不称该项回归保持或全部验证通过，也不推翻旧历史验收。无需新造不同版本夹具掩盖缺口。只读恢复依据与后续条件见[历史夹具恢复事实](historical-recovery-facts-2026-10-06.md)。找到原DB与对应凭据，或可核验同版232产物构建后，才能另立真实恢复证据；未来真实Git旧版本测试也须独立记录，不能等同原replay。父接受后本代理仅补此新说明，未执行额外产品测试；根状态文档由父指定协议代理维护。
