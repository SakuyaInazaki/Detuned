# M6.4-B 根批准实施边界（fresh时记录）

任务书来源为上一封存包planning/m6-4-b-task.md（d9accc3f39f50a32f7ec3036b905efa888fa1998515a0ff87fc0fa897b417f3f），所有权来源planning/m6-4-b/file-ownership.json（e4b8129c1f291852826611667dd1d23905cb828659bf8ac4fc442abf5b93e20a）。两份旧原件只读，不改写任务书。新包只有fresh/before READY，此刻没有实现、链接、构建、测试、宿主运行或安装。

## 根本次具体裁定

protocol/tools.ts导出纯函数validateToolParams(toolName:string,params:unknown):boolean，基于同canonical registry的TypeBox schema，同时保留复用SubscriptionStartConstraintSchema等既有显式组合约束；不能声称裸Value.Check实现全部JSON Schema。不增加依赖，不改全局FormatRegistry，不让Pi依赖MCP。

MCP旧SDK flat/wrapped外层严格校验保留，再复用canonical校验；Pi在prepare之前、sharedclient callTool在任何HTTP之前均做统一canonical校验。非法输入零业务与零诊断HTTP，安全错误不回显原参数或凭据。MCP/Pi的有效输入prepare保持原算法，对review/create_session没有例外；显式新session与cached诊断session不同，不隐式替换submitted reviewer_session_id。A拥有纯validator、client/MCP；B拥有Pi复用及任务书所列CLI接线。

八个旧工具完整回归及第九工具正/负、flat/wrapped outer-inner均须真实验证；已有八分支响应shape、取消/finally/noACK、绑定和安全16KiB文字/完整结果不降低。D只可按十一catalog测试原断言的完整8→9覆盖/active分支必要适配。旧m4-mcp-schema的八代表样本保留。官方可写只有native-lifecycle.mjs、m4-pi-native-lifecycle.test.ts与dsh runtime.spec.ts；launch/config只读。真正fixed official无模型路径须先查保留入口，不因缺入口安装或新建环境。

## fresh保护与执行约束

M6.4-A整封288文件（manifest含自身）与旧9715合计10003份旧review保护。schema5/SQL/archive/旧profiles、JCS/Hasher、HEAD、当前内部workspace锁图与packages/modules dist均作为当前基线；零新DDL/HTTP操作/依赖计划。exact-before保存所有真实既有ownership路径及metadata/config候选；missing只记录，不造空文件。实际root TypeScript为tsconfig.json，CryptoHasher在core/ports/hasher.ts，并无单独node-hasher.ts。

单一D执行窗，workspace并发1、核心worker1/文件串行，受控有界竞态保持原timeout/assertions。当前fresh不复跑任何M6.4-A已验门禁。禁止VM/Colima/容器守护/daemon/browser/model/install/global/commit/push；只既有本地工具与owned短寿命测试，正式测试待根放行。不存在新安装或workspace链接操作授权需求，不执行pnpm install/link。
