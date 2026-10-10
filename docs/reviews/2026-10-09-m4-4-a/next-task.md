# M4.4-B：Pi 实际运行时与安全生命周期接入

状态：任务书待本包验收后启用；C fresh baseline 必须先于下一包实现。本文件不表示 Pi 接入已完成。依据前包 [设计方向](../2026-10-09-m4-3-b/planning/pi-next-design.md)、[共享API事实](../2026-10-09-m4-3-b/planning/pi-shared-api-facts.md) 与 [官方 loader 事实](../2026-10-08-m4-2-b/planning/pi-loader-facts.md)；具体文件名和 hook 由父在各阶段收窄。

## 阶段1：官方 SDK 无模型原型

使用已安装、锁定的官方 Pi0.87.1 public SDK，不修改官方包，不安装或访问网络。先最多五分钟必要定位，随后运行最小有界 probe；失败保留真实日志并交父，不以穷举静态图证明代替可运行事实。

- 显式完整 ResourceLoader 与 private cwd/agentDir/authPath；modelsPath:null、allowModelNetwork:false、refreshOnCreate:false，内存 SettingsManager/SessionManager。外层 env-i allowlist，禁止真实 profile/凭据及 prompt/stream/model推理。
- 实际加载当前扩展，通过真实 registry 直接 execute；不造 fake host/registry，也不手发虚假生命周期事件。
- 通过官方真实 new/switch/fork/reload/shutdown 路径确认事件、hook 和可 await 的清退出口。私有 fixture 可生成真实 fork entry 与 switch session path，不改官方安装包。
- 同步 dispose 返回不能充当异步 shutdown 清退完成。记录实际监听器、在途工具与资源观察边界；有限 timeout 覆盖 probe，清理所有自有资源。

原型事实先交父，**父冻结具体 hook/资源映射后才开始阶段2**。未核公开路径或事件准确标未知，不偷偷换模拟接口或扩大探针。

## 阶段2：既定产品方向

Pi 复用 client/node 安全 resolver；单代固定 credential 快照，显式重建才更换，不逐调用 setToken。来源冲突/所选文件读取失败明确拒绝，不匿名 fallback。

复用 createRuntimeSessionBinding 的惰性能力/身份与 per-space 诊断 session 协调；不复制服务 ACL，不逐帖加入新业务字段。工具/命令使用 typed 安全错误、有界 text 与完整 details；八 schema 单源、官方 validator 保真。

按阶段1实际事件分代取消旧 work，等待真实 finally/清退，不自动 ACK。import/register 不发 HTTP，懒初始化不启动模型。已开始 session 失败/重连与最后 waiter 取消等既有共享协调语义保持。

## 分工与验收

| 所有者 | 范围 |
|---|---|
| A | Pi 实现、原型和新增作者测试；具体文件父按阶段冻结。 |
| B | 文档及必要旧 C03 fixture 的显式兼容更新；保旧失败/证据，不虚构 C03 曾测试激活后 env 变更。 |
| 独立验收者 | 真实官方无模型加载/lifecycle独验与唯一统一门禁，避免作者重复全套。 |
| C metadata | fresh baseline、保护材料及最终文档/hash核验。 |

验收须证明有效工具/命令与身份空间归属、安全错误/凭据失败、真实生命周期取消及 finally 等待、noACK与无残留资源；权限只由服务器判断。单代凭据行为与旧安全输出期望若变化，明确记录并同步受影响旧 fixture，不为了通过静默放松断言。

新反例先保留、定位、最小修，再受影响复验；具体门禁规模与 timeout 开工冻结。保护旧 reviews/archive/HEAD、锁、依赖、protocol/schema/SQL，不改全局配置，不发布/推送，不用真实模型或账号。

本包不提前宣称四真实宿主、全部 T20 或 M4–M7完成；运行范围、未执行检查与下一阶段均据实际证据报告。
