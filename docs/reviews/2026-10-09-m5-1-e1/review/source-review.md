# E1 独立窄源码审阅（2026-10-09）

结论：本次四项范围未发现可行动阻断。只读 B4 当前文件及必要既有调用接点；不运行测试，不修改产品。此结论不替代真实浏览器验收。

- **概览引用不借旧主题。** space-overview.tsx:39–65 的 open 只传固定 post/revision，无伪造 thread。app.tsx:282–295 把没有 resultThreadId 的概览读取置为无 resultReading；:543–552 概览没有引用按钮/主题 composer，进入主题动作要求真实 resultReading，旧 thread 仅 discussion 下可见。:229–233 换空间清 thread/content/composer；并非把概览 ref 自动归属旧主题。
- **规则固定与字节边界。** app.tsx:251–263 保存固定 space/revision，刷新概览不会替换 fixedRules；从首段重开仍沿已固定版本。content.ts:87–106 核 ref/encoding/起始偏移/UTF8段长度/完整与meta一致，只有完整且累计≤1MiB才解析 objective/rules；超限清累积转当前原始段，不宣称完整。space-overview.tsx:47–50 明示背景版本变化、固定版本和 raw 限制。
- **本人权限是服务器事实。** app.tsx:244–249 用 getMe + isMeResponse；space-overview.tsx:72–79 只渲染公开 actor/capabilities/allowed-space/visible-space/role，明确最多100非全ACL，不推演业务权限。接入步骤只占位路径，不展示 token/cookie/CSRF，也不自动写配置或造本站文档链接。
- **跨代晚响应。** app.tsx:142–161 的 generation/abort与 clearSpaceViews/clearDiscussion，:229–248/:258–261 给 context/me/rules 结果写入 generation 门禁；退出路径先提升代次并清当前展示。既有 run 的 success/error/finally 同样核代次，晚请求不会回填旧空间/身份。读取未生成 poll/ACK。

B manifest SHA 83f122ac39bf671a00278cac323f7ff21a5ba1588fbe2c8a56b9c9d40988ab01。审阅结束保持源码冻结；具体运行/视觉/资源结论由独立浏览器证据负责。
