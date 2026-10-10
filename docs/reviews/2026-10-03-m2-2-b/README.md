# M2.2-B 本机工程验收通过

2026-10-03。父代理依据 [独立验证](verification/verification.md) 和 [只读审查](verification/readonly-final-audit.md) 接受 M2.2-B；与已验收的 A 合起来，M2.2 在本机锁定环境通过工程验收。M0/M1 当前 core+C、B 及 M2.1 继续通过。整个 M2 仍待 M2.3 搜索与 M2.4 预算，不代表完整产品可用。

知识视图现在区分可复查材料与研究认证：findings 只列 claim，proposal 仍可通过原搜索/主题读取；claim/failure 明示作者报告，正式 review/check 为 not_enabled。支持、异议和复现关系保留固定双方版本、作者、创建者及状态，不把旧关系漂移到新版或当成独立认证。历史缺失/非法字段以 null 和 missing_fields 表示，不伪造 counterexample、provided 或 attempt。

上下文只纳入有效、当前 active 的 summary pin。摘要自身的 has_newer_revision 保持原义，来源状态另外显示；withdrawn 仍可定位固定历史版本，redacted 只保留授权后的墓碑，missing/跨空间/不可读统一 unavailable，未知新版为 null。任一关系端点脱敏时，blocking 的 issue/impact 均为 null；活动只取 public 事件。所有读取都保留当前权限检查，不修改历史材料、原 hash 或写入规则。

三个知识视图的 HTTP data 仍为数组；共享 DTO、OpenAPI 与 client 泛型已接线，未新增响应序列化器或客户端业务判断。见 [知识视图示例](../../../examples/knowledge-views.md)、[实现索引](implementation/README.md) 和 [准确覆盖](coverage-audit.md)。

独立正式 **238/238，22 个文件**；本包增加 core 7 项、协议/HTTP 4 组。**当前版本化 29/29 命令**全部 exit 0；AC 6/6、ADv2 5/5、AE 5/5、U 8/8 保持。原 R21 JSON-only 清单的历史 28/29 及失败证据保留，不能称原历史 29 已全绿。独立 KV01–08 通过，KV09 回归与完整性通过；三个真实旧成功 HTTP 夹具的原键重放、新键拒绝、重启、墓碑与撤权也保持通过。正式条目与独立探针不累加；完整数字见 [coverage.json](verification/coverage.json) 和 [命令记录](verification/commands.json)。

[稳定前](verification/stable-before.json.json) / [稳定后](verification/stable-after.json.json) 是实际双后缀文件名。[完整性](verification/integrity.json) 确认执行期间 117 个产品/config/test、33 个当前规范文档稳定，1839 份旧证据、4 个 SQL/archive、2 个 schema/profile 字节保持；正常构建的 16 个 tracked dist 和 4 个新增 helper 产物变化单列，无删除或提交。单元与独立方的夹具/检查脚本准备错误均保留记录，未当作产品故障或隐藏。

本机为 Node 26.3.0 / pnpm 11.7.0。Node 22、干净安装、远程 CI、四真实宿主及模型未测；date-time ignored 警告不能证明日期值格式已验证。新增来源/关系已计入原上下文测量与 truncated 路径，但仍不保证最终 data/envelope 硬限长，M2.4 缺口明确。Web、正式评审、专用 CLI/MCP 上传工具未完成。

按用户持续授权，父代理负责方案与验收，GPT-6.1 子 Agent 开发和独立验证；论坛产品自身不启动参与者 Agent。下一包 [M2.3](next-task.md) 由主代理直接分派，用户无需手动转发。本次只整理交付文档，不启动下一包。
