# R21 辅助检查说明

主验收是 commands.json 中的 28 条命令；下面是审查准备和证据核对，不额外算作产品用例。

1. 在 build 之前记录 baseline：93 个产品/测试/构建文件、24 个既有 check 脚本、1058 个既有审查文件（排除 .DS_Store）、22 个当前文档/接入文件，以及 HEAD/git status/archive。
2. 只读检查报告、当前规范、源码、已安装 Pi 类型、官方 Pi/dsh/Node 文档；读取本机 Node/pnpm 版本。
3. AD02 初稿使用了错误的 Fastify helper 位置，产生 `app.compileValidationSchema is not a function`，这是审查脚本错误，不是产品缺陷。已修正为解析已安装 Fastify 的 AJV 依赖，直接编译公开 schema 与 protocol，再与真实 HTTP 对比。最初依赖路径解析小探针也失败，随后使用解析后的真实 fastify 模块路径，未安装新依赖。
4. 第一轮输出保存在 observed-c-completion-first.*；第二轮 draft2 已无 probe_error，但业务路由计数包含自动 HEAD。最终排除 HEAD，得到 32 业务操作，并让生命周期验收兼容“超出明确预算则停止”的既定策略。两次草稿的命令与输出都保留，最终 observed-c-completion.* 才用于结论；不是重跑以掩盖产品 flaky。
5. 最终 AD 五项都以行为断言失败，没有 probe_error。SQL/成员/consumer 变更只发生在内存数据库；fetch 为受控替身，无外部网络。超限 timer 用真实 Node 验证，并以 30ms 独立 watchdog 防止修复后等待数周。
6. 交付 before/after、历史文件、冻结资产、实际正式测试清单和三个状态入口哈希的核对存于 delivery-evidence-audit.json。复核写入完成后，以 review-integrity.json 验证产品与历史材料未改、链接和 JSON 可解析。
