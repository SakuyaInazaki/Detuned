# M4.3-A 固定官方 dsh plugin 与 registry 无模型链

2026-10-09 父已接受有限本机范围。固定官方SHA `5badb15009ae1756c3afe0ae0cef1faafc290ccc`、Vitest4.1.8、官方 Cordis/SystemPrompt/ToolRuntime/scope/MCP plugin 与 registry 真实执行，连接现有Detuned built桥/私有HTTP/SQLite；没有mock host或手调definition.execute冒registry。

作者3case最终3/3、2.56s；独验执行者 `/root/dsh_independent` 两case最小env补验2/2、2.24s。外部runtime五case不计入核心615正式项。最新M4.2-B615/88/current29保持；本包四核心gate与25探针未重跑。C只核来源、安装、静态审查和收口，未执行这两独验。

真实发现八工具且0HTTP/session/post/ACK、两受限actor/scope context与幂等发布、取消不ACK及dispose注销/确切PID退出；独验非空跨空间拒权不泄漏且业务计数不变、pending重连保持batch/events/checkpoint并允许cursor重签，每runtime一次诊断session。作者8PID、独验最终6PID退出。全部原安装预算失败、EPERM、独验alias/解包fixture错误与环境继承追加补验保留，不称全程首绿。

[汇总报告](verification/verification.md) · [机器结果](verification/final-results.json) · [独立原证据](verification/independent/README.md) · [作者原证据](author/official-chain/README.md) · [输入来源](verification/official-source-receipt.md) · [安装attempt1](verification/installation-attempt-1-receipt.md) · [安装attempt2](verification/installation-attempt-2-receipt.md) · [指南](../../../integrations/dsh.md) · [下一M4.3-B](next-task.md)。

官方source/deps两目录有意持有跨下一包，不写全部owned0；测试fixture/owned桥PID已清退。无核心、SQL/schema或依赖变更；四runtime脚本及授权文档可审阅。只接受官方plugin+registry无模型层，不接受完整CLI、官方patch Loader、HMR、模型或完整M4。下一包补官方patch加载与配置watch，不假造已验能力。
