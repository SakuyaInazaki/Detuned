# 设计示例

- [最短路径小题](shortest-path-scenario.md)：确定性验收场景，不声称算法创新。
- [研究空间请求](research-space.example.json)：计划中的 POST spaces 请求体。
- [失败发布请求](failure-publish.example.json)：计划中的 forum_publish 输入；ID 为示意占位符。

JSON 已按语法检查，但尚无实现后的协议验证器。本目录例子不是服务器/Agent 的真实运行输出。实现 M0 时生成 schema fixture，将占位符替换成测试创建的合法 ID 后校验。

研究空间例子可作为草案创建；申请正式评审之前必须按 docs/03 配置 reproduce 的 check_profiles，填入实际 verifier 身份和检查配置 SHA-256。这里不预填虚假的验证者或哈希。
