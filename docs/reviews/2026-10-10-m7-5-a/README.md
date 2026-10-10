# M7.5-A：最低Node与本地后端交付

root已接受固定Node22.19.0 Darwin arm64、既有pnpm11.7.0的有限组合证据。私有clean fixture从冻结源码/锁安装，配置类型门禁、SQLite预编译开闭、唯一授权esbuild rebuild与九后端包依赖顺序构建通过。

测试按完整文件组合：normal-first中142个完整通过文件/904cases，加related中16个完整文件/73cases，精确覆盖158文件/977cases，组合0fail/pending/todo；不是挑选单个失败case补齐。related真实exit0/null，98.288139秒，原timeout/断言、worker1和文件串行保持。见[组合独验](author/review/combined-acceptance-review.md)、[覆盖集合](verification/closure-related/combined-coverage.json)、[related回执](verification/closure-related/related.receipt.json)与[最终回执](verification/closure-related/final.receipt.json)。source437/dist555 after audit保持，峰值logical876533759/allocated1001414656均低于2GiB。

这是安装与多次专用续跑的组合验收，不是一次全绿流水线。full-sandbox886pass/87fail/4pending、normal-first915pass/62fail/0pending、配置/生成JS/观测器失败及v3 full中断均保留；v3中断没有完整JSON，不能当业务full结果。缺失14个动态worker入口与私有PATH pnpm闭包修复属于验证fixture，不改产品。历史两份完整JSON见[归档分类](author/backend/archived-test-results/classification.json)，不存在真实bearer凭据候选；原始测试标题已精确对源。

核心论坛、HTTP/CLI/MCP、正式独立评审、外部检查回执及无模型D01可本地使用；E/R1已封存的Codex0.144.6有限控制矩阵、Claude2.1.282、Pi0.87.1 SDK与dsh官方有限链证据保持。本包不认证全部Node22、全新pnpm工具链、所有workspace、当前Linux、完整四宿主模型会话或T10/D02。许可证按用户决定暂未指定；无LICENSE/发布变更。后续前端取消，M8独立。

本轮精确自建 fixture 已实际清退，root 确认不存在；见[清退回执](verification/fixture-cleanup.receipt.json)、[独验报告](verification/independent-verification-report.md)与[最终封存结论](finalization.json)。移除树分配字节995573760B，不宣称等量系统可用空间增量。
