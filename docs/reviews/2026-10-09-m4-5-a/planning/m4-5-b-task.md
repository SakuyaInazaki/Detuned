# M4.5-B：显式 wrapped MCP 输入与 Claude 八工具兼容

状态：父已冻结任务，等待 M4.5-A 最终审查与 D fresh baseline 后实施。本包完成后继续 [M5.1-A](m5-1-a-task.md)。本任务书不构成产品已实现或宿主已验声明。

## 原因与明确契约

M4.5-A 固定 Claude 2.1.282 真实 connected 只列四工具，另四 canonical schema 根含 anyOf/allOf；所有根均已有 type:object。官方说明根组合存在宿主支持限制，properties 内嵌组合可保持原样。宿主内部归一化门禁是现证据支持的最强解释，不冒称已捕获运行 drop 日志。

新增显式可选 `DETUNED_MCP_INPUT_MODE=flat|wrapped`，缺省 flat。仅 main 组合根读 env，factory 用显式 option 注入；其它值启动时有界安全拒绝，不回显 env/token。flat 保持原八工具广告与参数。wrapped 对全部八工具一致派生：

```json
{"type":"object","properties":{"input":"原 canonical 完整 schema 对象"},"required":["input"],"additionalProperties":false}
```

上述 input 是原 schema 对象的占位说明，实际广告必须嵌入完整 schema，不能发送字符串。从唯一 canonical 派生，保全部 anyOf/allOf、字段、required 与额外属性规则。wrapped 先验证完整外层与原 inner，再 unwrap，之后复用原 dispatcher、惰性身份/session、服务端权限/幂等、取消及结果输出。不能接受 flat 参数或混合双重解释，不以断言绕 SDK/运行校验；若 TypeBox/SDK 对嵌套 additionalProperties 出现真实问题，留证并报父。

这是显式选择的 wire envelope，不是暗中压平/放宽 schema。HTTP、Pi、dsh 缺省行为、协议业务字段、SQL/schema/锁、依赖与版本不变；不新增业务工具或模型能力。

## 文件所有权与顺序

父编排并验收，实施前 A/B 明确共享指南单文件写入所有权。

- A：MCP bridge/main/validation 的必要窄变更与有限作者回归；落实 mode、唯一派生广告、完整验证再 unwrap，默认 flat 完全兼容。精确产品文件名单在 fresh 后冻结。
- B：`examples/claude.mcp.json` 显式 wrapped env；共享 `integrations/codex-claude.md` 仅 Claude 部分、compatibility 仅对应条目/准确分层（与 A 协调单文件 owner）；新包 author 下真实 Claude 有界实验与报告。旧 v6 原字节不改。
- D：独立 schema 等价/正反校验、原默认行为与核心 gates；D 负责 fresh，最终 metadata 由父派可用 gpt-6.1-sol 处理。单一 gate owner 避免重复构建。

先完成 SDK wrapper 作者与独立测试，再执行 native。可以只读复制上包有限脚本到新包 author，实际新 guard/私有路径/receipt 均新建；不得重写旧失败或用 direct SDK 代替 Claude 宿主。

## 必要验收

1. flat 原八广告/参数及旧单源验证保持；wrapped 八广告外层一致，input 深层 schema 与 canonical 语义等价，缺 input/额外外层/错误类型/inner union 与 subscribe allOf 反例均拒且零业务 HTTP，合法对象不变异。
2. dispatcher/session 在合法 unwrap 后保持相同身份、space、请求 key、重放冲突、取消/noACK 与结果 data/meta/structuredContent；模式间不能静默 fallback。非法启动 mode 安全文案、非零出口、零 HTTP。
3. 固定 Claude native 新轮沿原完整 user-state/Keychains/mach/network deny，唯一 owned loopback、原 HOME 原值透传、owned TMPDIR/CONFIG_DIR、private settings/strict MCP、无 prompt/provider key。原 flat4 与 wrapped8 可比较，真实 status 名称按 raw 字段核精确集合，不先假定 namespace。
4. wrapped 真实 context、一次 read、一次 publish 成功；全部专用私有普通 actor fixture，写入固定幂等 key，HTTP/SQLite author/space 交叉核对。非法外层和非法 inner 各至少一次，不增加业务 HTTP；无需将八工具所有功能重复跑遍。
5. 每轮整条有界 ≤30秒，pending status 有限等待；timeout/unsupported/错误如实保存，不自动 retry。子进程真实 EOF/自然退出与 reap 分开记录；异常 TERM/KILL 是清理不是成功，finally 关闭 app/DB/temp，敏感结果精确脱敏并记录摘要。绝不放宽权限或更换 fake provider。

正式核心以 638 为当前基线增加有意义新例；作者有限 source 定向/noEmit 后 freeze，D 统一 build/typecheck/lint/test 与必要旧 current 探针兼容检查，保护已批准适配、首失败、旧 review/archive/HEAD。真实疑点先留反例、父裁最小修复，再只复验受影响范围。无全局配置、安装、网络模型、发布/push 或新通用框架。

## 完成出口

父依据独立证据接受后更新对应宿主分层：八工具发现及所列调用通过仍不等于完整 CLI/profile/模型认证。随后自动衔接已保存 M5.1-A，不让此次明确 schema 兼容修复留给用户手工规避。
