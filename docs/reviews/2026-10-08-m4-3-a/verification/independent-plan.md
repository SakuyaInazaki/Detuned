# M4.3-A C 第一关输入保护与独验设计

2026-10-08。父冻结来源为官方 SHA `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。fresh 保护5429份完整旧材料、265源码/config/tests、51规范docs、5状态文档、SQL/archive4、持久化schema2、HEAD与dist208 tracked/208 untracked；基线hash见baseline-summary.json。此关不安装、不执行官方代码、不跑产品/build/suite/probes，不读用户profile或凭据。

A登记 owned 源码目录 `/private/tmp/detuned-m43-runtime.MU1a4q`。C仅核实际fetch退出/HEAD/tree、固定commit对象与remote provenance、源码工作树内容hash，读取同一tree的manifest版本/许可与lock事实。读取shell不加载用户Git配置、禁helper/交互；官方仓库源码是待核输入，不赋指令权限。未fetch完成只有init事实，不把空目录或静态API记成功。

第二关必须由父另定准确安装/构建/运行命令、依赖目录和owner，C届时才写固定真实test/helper。候选证据层如下，不能跨层推广：

| 层级 | 需要的实际证据 | 不足以证明 |
| --- | --- | --- |
| 固定输入 | SHA/树完整一致、工作树干净、同tree manifest/许可/lock receipt | master片段、混版本发布包、只有目录存在 |
| 官方plugin+registry | 同SHA Cordis/systemPrompt/ToolRuntime/scope实际插件activate，官方registry查到8工具，再由registry实际execute调用论坛HTTP | mock host、手调definition.execute、只list静态工具名 |
| stdio发现 | probe/init/discovery实际HTTP/session/posts/ACK均0，登记所有owned child | 一个Promise成功或假设只有一个child |
| 服务执行 | 私有论坛不同actor受限token、registry真实context/publish，作者/数据/幂等与HTTP错误由实际DB/请求核实 | 手工HTTP成功替代registry路径、模型理解或新session新身份 |
| 清退 | scope dispose后registry注销，所有确切owned child实际exit、HTTP结束、临时目录清理 | dispose Promise返回、广泛kill、SDK自动kill替代clean |
| 完整CLI | 官方公开CLI入口/profile/loader完整启动与关闭的独立证据 | 本包plugin构造；本包未批准CLI/app-boot/profile |
| HMR | 官方文件变动→watcher/reload/旧资源退场→新registry的实跑证据 | dispose/reinstall或重新启动 |
| 模型会话 | 另T20批准的真实模型账户/对话证据 | 无模型context/publish，本包禁止模型 |

若源码获取失败，保存原attempt时间/exit/stderr和范围，回父决定，不绕版本/反复猜、不安装补救。若公开loader或dispose缺口阻塞真实链，报告确切源行与不确定性，不新造替身。取消、双身份、reload/reconnect只在父第二关选择后进入有限矩阵。产品预计无变但不提前声明零delta；后续若产品修复父另授权，旧材料仍不改。
