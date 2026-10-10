# M3.2 B 交付（待统一 built 验证）

范围：publish/relate七分支显式可选持久request_key，成对flags及与任何显式key冲突拒绝；现HTTP错误码、旧key优先与data输出保持。client负责当前actor、scope、持久化及业务发包，CLI不复制业务规则。

交付：CLI源码、新五项正式built CLI契约测试、新request-keys示例。精确冻结摘要见 freeze-manifest.json，继承dirty不归为本包新增。

证据：before.* 记录旧built合法新flags首失败exit1 unknown option；source-noemit.* 记录client/node源码alias TypeScript noEmit exit0。未build、未跑五项新built测试、未跑全套/current29，不登记其成功。由C统一build与验收。

限制：不扩MCP/Pi schema、自动ack或备份恢复，不修改全局配置；本包不代表完整M3完成。旧证据保持，无commit/push/安装/模型调用。
