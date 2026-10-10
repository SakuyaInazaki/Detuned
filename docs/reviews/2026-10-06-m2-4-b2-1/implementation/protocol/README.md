# M2.4-B.2.1 协议/HTTP/client/CLI开发交付

2026-10-06。实现者定向交付，等待独立验收与父裁定；不宣称完整T06/M2.4/M2完成。已按本包interface-freeze实施，无旧正式适配申请或变更。

## 完成行为与所有权

protocol/posts.ts新增stored五字段Pick内容投影、固定ref、page/envelope相关union、strict query/cursor payload及guard、完整compact build/serialize/bytes同源函数、固定错误提示/limits。既有index的posts export*已自动导出，未改index。

protocol/tools.ts在原forum_read添加post_revision分支，rootobject+anyOf/UnionKind保持且仍8工具；space/post/thread旧合法输入与输出不迁移。openapi.ts加固定revision GET、严格参数与完整响应schema，并在通用query政策遍历后回置4096chars cursor约束。

server app.ts显式构造新核心service，共用现storage/signer/auth/secret/Clock；posts route只严格解析path/query并调用service，以同源compact serializer发送，不裁业务。旧GET post/修订目录与PostService不改。

client新增getPostRevisionContent静态完整page/Signal及newkind dispatch，不新增运行时response validator、不复制业务权限；旧getPost/forum_read post仍原data语义。CLI新增post read两位置参数+required严格revision/预算/cursor，完整page输出；旧read/search/space/context命令行为不变。docs04实际旧GET行和工具表同步，新增examples/post-revision-read.md。

## 实际验证与首失败

新tests/contracts/m2-post-revision-read-contracts.test.ts有7项：P01真实inject raw4K/64K/default、实际转义req.id、same serializer逐字节、head更新后固定stored投影完整重组；P02严格path/query与旧GET/目录兼容；P03真实localhost client新page/旧data/Signal；P04rootschema/directcall strict branch与8工具名；P05完成/meta矛盾、redacted成功/额外字段拒绝；P06OpenAPI真实参数及cursor回置；P07安装Pi0.87.1官方validator→真实注册execute新页与旧post正例。历史structured额外字段在原文中保留，没有套新写validator。

- contracts-first.command.json：exit1，5过2失败，原stderr保留两条localhost listen EPERM；不是产品缺陷。
- contracts-loopback.command.json：允许授权的临时localhost监听后同新7项exit0、7/7，stdout/stderr完整保存；仅在新专项P06补静态类型，无runtime断言弱化。
- types-first.command.json：exit2，新P06测试因generateOpenApiSpec的unknown返回类型缺标注；仅补测试内可信生成spec类型。
- types-final.command.json：sourcepaths静态check exit0/零诊断，source-contract-tsconfig.json包括新专项及CLI/依赖源码；无dist导出误判，没有build。

before.md与before-first/final日志保留四条实质旧限制及首夹具取ID错误；before-final实际exit0不表示新功能已实现。测试输出与UTC/exit为真实记录，没有用首失败重跑覆盖原日志。

## 完整性、未运行与限制

freeze-manifest.json保存10个本单元产品/新测试/规范/示例SHA256；只读对fresh baseline核2344旧review/probe/log/evidence（含B.1）、4SQL/archive、2schema及31份baseline测试目录文件，均无变化/缺失。31是目录文件数量，不是正式唯一套件数量；本轮只运行新7项，不报告全套总数成功。git diff --check仅本单元tracked源码/文档exit0；HEAD旧累积未提交差异不当作本轮delta。

没有全仓/单包build、fullsuite/current29或真实CLI/MCP新入口执行；这些需父统一构建后交独验。Pi路径是已装SDK validator/注册execute，不是Pi/dsh真实宿主模型认证。dsh在本轮可见PATH/项目依赖中未发现，官方与安装版核查见planning/contracts.md；未安装/启动宿主或改adapter架构。

成功正文cap不含headers/status/error/SDK/CLI pretty；每页O(document)，不称常数内存/CPU硬限额。核心当前ACL/redaction/lifecycle/TTL/签名/UTF8/分页选择由core单元交付；本单元不重复业务。三组真实旧HTTP原夹具丢失限制仍成立，不冒称重放通过；真实四宿主模型/Node22/干净安装/远程CI/100k未测。B.2.2主题目录/聚合未实现。

当前产品/新正式tests/docs04/example已冻结；没有DDL/依赖/发布/公网/commit/push/清理或全局配置变更。下一步由独验执行统一build/全套/当前29及实际CLI/MCP/旧SR/SQ/KV，父裁定后再授权状态文档同步。

### 父批准的工具说明窄修与重新冻结

2026-10-06交叉核查发现旧说明“post/thread保持完整读取”会把thread目录误称正文读取。按父批准，只修forum_read描述：旧post读取完整单帖；thread返回默认首批帖子元数据、不含正文，工具不提供目录分页。新space/post_revision有界续读和旧参数限制仍明确。没有行为/schema/旧tests改动，没有重跑产品测试；已更新freeze-manifest中的tools.ts SHA256，真实ListTools说明由独验后续核查。产品再次冻结。
