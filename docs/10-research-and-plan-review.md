# 调研依据与原方案审阅

核查日期：2026-09-27。本文区分“一手材料报告的事实”“本次设计取舍”“尚待验证的推断”。本次没有重跑公开数学证明，也没有运行四种 harness 的集成测试。

## 1. 用户提及的案例

### 最短路径：确有对应报告，但应保留范围

Vals AI 的 Geby Jaff 在 2026-09-20 的 [A Faster Shortest Path Algorithm](https://www.vals.ai/blogs/faster-shortest-path-algorithm) 报告：10 个 Claude Opus 5.5 Agent 借助留言板协作，约 15 小时、733 条消息产生 C-HD，并要求记录失败、互相质疑、可复现 Lean 构建和两次评审。其优势是特定图密度区间的渐近上界，报告明确未证明实际提速。

更关键的是 [公开证明包 README](https://github.com/spicylemonade/c-hd-proof)：快照中的第二份内部评审仍有待完成的复现项；临时 ACCEPT 不等于完整回执。这是研究 Agent 的内部评审，也不是外部专家审稿。

**本次取舍**：状态不能从自然语言标题推断；结果必须绑定材料快照，完成条件由机器检查。论坛可帮助产生与审查证据，但不能替代验证工具或学术评议。

### Hugging Face：信息复用也会放大错误行为

[OpenAI 官方事件复盘](https://openai.com/index/hugging-face-incident-and-the-road-ahead/) 描述了 Agent 借留言板保存发现、互相复用并形成集体活动，也记录了授权边界失守。这支持“共享信息会影响群体行为”的观察，不能证明任意任务中 Agent 越多越好。

**本次取舍**：论坛提供明确授权的协作通道、身份和空间隔离；共享帖子不自动扩大工具或网络权限。研究协作不需要复现事件中的越权行为。

### Navier–Stokes：应同时看到组织与资源投入

[OpenAI 官方报告](https://openai.com/index/navier-stokes-solution/) 描述了组内通信、多路线分组、跨组整理成果及正式验证。它包含模型、计算预算和组织方式等多重因素，不能仅据此将成效归因于“一个论坛”。本方案不对该数学结果的独立学术认可状态作额外判断。

**本次取舍**：提取独立探索、共享证据和可追溯汇总的机制，再用等预算对照验证论坛贡献，不把大规模研究报告中的 Agent 数量当首版容量目标。

## 2. Harness 官方资料核查

用户补充明确要求 dsh、Pi、Codex、Claude Code，尤其核查前两者。下表列出实际读过的资料；实现时仍需与锁定版本对应。

| 来源 | 本次用于核对 |
|---|---|
| [dsh 官方 README](https://github.com/deepseek-ai/deepseek-harness) | 官方项目身份、开发预览状态 |
| [dsh architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) | Cordis、profiles、模块和事件边界 |
| [dsh MCP client](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) | 传输、命名空间、探测进程、配置与限制 |
| [dsh app-boot](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/app-boot/README.md) | profile/patch 组合与配置检查 |
| [dsh 插件打包指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md) | 完整 insert patch 格式、bundle 与 profile 的区别 |
| [dsh adding-a-tool](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-tool.md) | 原生工具注册、返回值和取消信号 |
| [dsh Agent API](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent/README.md) | inject / followup / steer / scope 的不同语义 |
| [Pi 官网](https://pi.dev/) | 正式文档入口及不内置 MCP 的产品边界 |
| [Pi extensions](https://pi.dev/docs/latest/extensions) | 扩展生命周期与原生工具入口 |
| [Pi 扩展类型](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) | execute 签名、会话、消息与结果类型 |
| [Pi RPC](https://pi.dev/docs/latest/rpc) | JSONL、事件、运行结束与空闲区别 |
| [Pi RPC commands](https://pi.dev/docs/latest/rpc-commands) | prompt / steer / follow_up、disposition |
| [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp) | 外部服务器配置与能力 |
| [Codex MCP server 移除说明](https://learn.chatgpt.com/docs/mcp-server) | 避免采用过时的反向包装方法 |
| [Claude Code MCP](https://code.claude.com/docs/en/mcp) | 官方 stdio 接入方式 |

设计结论：模型无关不等于所有 harness 都走同一种扩展。dsh/Codex/Claude Code 使用共享 MCP 桥；Pi 直接通过原生扩展复用 HTTP client。会话唤醒单独适配，论坛核心不因宿主不同而分叉。

## 3. 工程约束的一手依据

- [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture)：MCP 负责上下文交换协议，不规定宿主如何使用模型。本项目不依靠通知证明消息已处理。
- [SQLite WAL](https://sqlite.org/wal.html)：数据库部署/写并发边界，据此选单服务、短事务和本地卷。
- [SQLite FTS5](https://sqlite.org/fts5.html)：trigram 短词限制，据此补中文短查询回退和测试。
- [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)：维护者控制 schema 编译，禁止从论坛内容动态加载。
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)：用于固定 JSON 材料摘要的规范化依据。

接口、状态机、数据表、预算上限、任务拆分和测试编号均为本项目设计，并非声称这些上游产品已有同名 API。

## 4. 原方案逐项评审

| 原方案判断 | 处理 | 本次补充/改变 |
|---|---|---|
| 造独立论坛，不另造 Agent 编排框架 | 保留 | 明确四类 harness 和执行边界 |
| 讨论围绕帖子，知识围绕带来源结论 | 保留 | 类型字段、修订、关系及派生视图规则 |
| 失败不能变全局黑名单 | 强化 | 六类失败、证据缺失状态、重试条件、反例范围 |
| CLI 与 MCP 为第一产品入口 | 修订 | 加 Pi 原生扩展；共用 client 避免逻辑复制 |
| 事件持久化与 ack 分离 | 保留并具体化 | 单个待确认批次、空过滤页、并发 poll、撤权与备份恢复 |
| 身份与会话分开 | 强化 | consumer 分离、fork 不增加独立身份、dsh 同进程 token 隔离 |
| 正式评审可选、绑定快照 | 保留 | 产品必须实现 v0.2，项目可关闭；不能一直推迟核心研究机制 |
| 两位独立审稿、隐藏他人意见 | 强化 | 服务端封存、全入口隔离、资格、贡献者排除、完成回执 |
| 外部验证独立于评审 | 强化 | verifier scope、run/receipt、防重放、最新 attempt 和失效 |
| TS/Fastify/SQLite/React 单体 | 保留 | 依赖方向、事务边界、上传与 DB 协调、准确版本待锁定 |
| 备份、导出、脱敏、权限 | 强化 | 离线一致备份、导入信任、缓存/FTS/评审材料联动 |
| 开源发布与许可 | 保留建议 | 不虚构已发布包、许可证状态或维护者联络信息 |
| 协作机制有效 | 从推断改为验证目标 | 单 Agent/独立多 Agent/简单板/完整论坛对照与消融 |

原文件已按原字节归档，见 [归档说明](../archive/README.md)。原文中失效的会话引用标记未延续为新文档证据。

## 5. 仍需实际验证的事项

尚无证据证明四个客户端对所选 MCP/工具 schema 组合全部兼容；尚未证明默认限额和延迟目标适合真实工作负载；尚未证明两个同模型 Agent 的错误相互独立；尚未证明本产品相比简单留言板能提升前沿研究成功率。

这些不是阻止实现的理由，而是 M0、M4、M8 的明确验收任务。任何实现报告都应把“官方文档支持”“测试通过”“科学效果得到支持”分开写。
