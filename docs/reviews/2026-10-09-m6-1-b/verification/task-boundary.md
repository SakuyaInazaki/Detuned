# M6.1-B fresh 边界

根接受M6.1-A whole126封存后授权本次fresh；冻结任务书在[旧M6.1-A](../../2026-10-09-m6-1-a/planning/m6-1-b-task.md)。本包当前仅基线/精确before/缺失登记，不运行门禁、schema生成、迁移/业务、安装、模型、浏览器或任何VM/容器/后台管理。旧Colima保留不操作，dsh目录不触。既有本地Node/pnpm与有界owned短寿命测试将按正式dispatch运行。

正式实现前等主代理放行A/B。候选路径精确copy不扩大ownership：A内部ReviewRequestService位于modules/review（避免core依赖module）；core仅port/typedidem/metadatahelper/eventfilter；B实际五表schema3、classifier/生成/profile/维护/export及9个已列旧测试。受准更新的当前SQL/schema/generated before是原字节库存，不把它误当禁止下一包实际DDL；archive与v1SQL/TS/真实v1runtime、旧Hasher/JCS与已接受材料builder行为继续保护，不改旧8398 review。

权限细化由根明确：create申请者为目标作者或当前maintainer/owner；cancel取消者为该request.requested_by或当前maintainer/owner。目标作者不能据此取消其他人创建的请求；仍有当前凭据/空间写权限门禁，历史读取/重放保持当前材料保密性。

schema3 ordinary serve/init均拒legacy1|2，blank仅init，新current3可重开；这与当前旧行为auto1→2不同，是下包新兼容变化，尚未实现/验证。明确offline migrate仅在新目标stage升级1|2→3，不原地改源；backup2原manifest保持2，restore先验证source2/inventory再只stage升级3；新backup3写3，stage3不伪升级；公共logical wire1/source2兼容与新wire2/source3/excluded相关分支不得放宽。当前仍schema2，只材料快照已接受。

65份现有候选原字节copy与fresh相应hash全匹配，含当前schema.sql与schema.ts/migration recipe供真实historical-v2完整DDL生成，不以单SQL冒全部v2；不预创建v2 fixture或TS副本。docs07候选名经核正为实际07-security-operations.md，不是产品缺口。7新服务/helper/作者两个test/D正式独验/v2SQL+README路径仅missing，不造空文件。D maintenance探针留verification，未指定第二正式test名，不自行扩文件。

基线dist库存同时含packages与modules（已接受canonicalizer输出），不沿旧package-only漏记。所有334源码、8398旧review、当前docs、原SQL/archive/schema、lock/HEAD/dist都绑定baseline.json；不复制全仓/历史包。未发现任务书既有产品候选不存在或已知新的依赖安装缺口；实际功能验证留后续dispatch。
