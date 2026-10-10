# M2.4-B.2.1 独立验收

2026-10-06，有限本机工程检查通过；最终接受由父代理裁定。固定帖子修订有界内容读取、新工具/CLI以及既有原SR/SQ/KV与当前版本化29通过。三组真实旧HTTP原key夹具因原临时DB/credentials丢失持续not_run，不以旧通过证据填成本轮结果，不重试ENOENT或制造替代成功。

| 本轮证据 | 真实结果 |
|---|---|
| 一次统一build | exit0，计入当前29；没有重复build |
| 新正式专项 | 2文件17/17，core10+contracts7；已含全套总数 |
| 一次全正式 | 30唯一文件、293/293，实际stdout逐文件合计293 |
| 当前版本化29 | 原清单/脚本29/29 exit0，包括build/typecheck/lint/fullformal |
| 独立PR HTTP | 105,164 stored文档bytes；实际raw HTTP4K/64K/default12K分别42/3/13页；shared compact serializer逐字节一致，UTF8边界/双转义/连续offset/非空进展/meta配对/全文精确重组 |
| 原始stored历史投影 | 五字段按title/summary/body/tags/structured固定顺序；empty stored字段、未知旧structured/assumptions[42]与JSON孤立surrogate保真，不追溯新写validator/default |
| 固定版与当前metadata | 当前head更新/withdrawn后仍读ref revision1精确尾段，post_kind note、has_newer=true、lifecycle withdrawn明确；固定拼接文档不随head漂移 |
| 真实req.id临界 | 1695个转义引号→4096实际HTTP正文bytes；1696→422 QUERY_TOO_BROAD；没有读取写副作用 |
| cursor/TTL | 两个4K非末页中间注入Clock各推进60秒，下一cursor沿首exp，之后改64K；exp等号200/+1秒400。签名/extra/version/purpose/actor/space/post/revision/零负末尾非UTF8 offset/远未来/超长拒400非重试 |
| 当前ACL/脱敏 | 非admin observer首读后撤成员404/撤凭据401优先badcursor；当前redacted持有效旧cursor或badcursor均410。独立synthetic lifecycle+正式实际RedactionService分别证明门禁与真实脱敏 |
| 双WAL同快照 | reader已读固定revision后writer新head/withdrawn；response为旧材料+active/旧head，下一读取为同固定材料+withdrawn/newer。无sleep。正式coreP10另覆盖真实并发redaction |
| 本机Pi/MCP/CLI | 安装Pi0.87.1官方validator→实际注册execute、MCPstdio ListTools rootobject+anyOf/call；新post_revision page与合法旧post完整data同时通过。CLI新post read22页重组/非法数值exit2；旧read post完整data保持 |
| 动态操作目录 | 原ADv2/AE覆盖37实际routes、20requestBody=19JSON+1multipart、0placeholder；ADv2 5/5、AE5/5、AC6/6，原脚本未改 |
| 原B.1/SQ/KV | 四SR原脚本（HTTP/boundaries/WAL/toolsCLI）、SQ原生HTTP大URL、KV原脚本均exit0；旧source/预算/快照语义保持 |

全部39记录命令真实exit0，本轮没有执行期first-failed或fixture失败，没有重跑。需要loopback的脚本/正式测试直接沿已授权本机端口权限执行，其余使用普通路径；没有用sandbox拒绝充产品反例。commands.json保存UTC/真实exit/stdout/stderr；current29-manifest.json只有原命令列表，不继承旧exit/time冒充新运行。coverage.json保存PR证据映射、30文件实际逐项数与动态目录。

baseline.json→stable-before.json的implementation-delta.json：8获准旧源码变化，新增core service+两formal文件，docs03/04/12及新examples/post-revision-read.md；没有旧formal修改。新fresh baseline实际保护2344全部旧review/probe/log/evidence含完整B.1，排除可变reviews根README；123起始源码/config/tests与34currentdocs、5mutable状态文档分别枚举，不复用B.1旧2207计数。

stable-before.json→stable-after.json/integrity.json证明验证期间126source/config/tests、35currentdocs/material、5mutable状态文档全部零变化；2344完整既有历史材料、4SQL/archive、2schema/profile原hash全部保持。HEAD仍b8dacd56779a007a2e7045b682bca0c036fdfc44，已有未提交实现全继承，从未reset。唯一统一build正常修改27tracked dist（208总数保持），新增postservice四产物，untracked40→44；其他build产物没有删除或修改。新包自有验证资料不进入旧保护集合。

独立fixture/屏障/断言自写，没有调用开发者assertion函数。stored大材料与writer lifecycle transition均明确synthetic，不能宣称旧HTTP生成。SQLite TEXT已将title孤立surrogate替换为U+FFFD；structured JSON保留原surrogate，读取只精确重组stored值，不能声称找回写入前已丢字符。每请求整体doc编码O(doc)，正文预算不是CPU/SQL VM/常数内存预算。源码审计见readonly-audit.md。

限制：Node26.3.0/pnpm11.7.0本机；Node22、干净安装、远程CI、真实四宿主模型、100k负载未测。Pi/MCP仅真实本地SDK/协议路径，不是真宿主模型认证。ADv2保留18行date-time ignored警告，不声称日期格式值已验证。cap仅成功compact完整HTTP正文，不含headers/status/error或CLI/Pi/MCP pretty外包装。thread仍默认首批帖子元数据；B.2.2目录翻页/聚合另裁，旧post全文入口保持合法输出，新post_revision是加法入口。B.2.1不等于全T06/M2.4/M2或M5–M8完成。

原三真历史fixture本轮not_run是材料缺口，不推翻旧历史验收；只有恢复原DB/对应凭据或可核验同版构建/归档才可另立真实恢复证据，未来其他Git旧版本新生成证据必须单独provenance，不等同原replay。没有追加历史恢复或范围外测试。
