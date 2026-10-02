# R14 覆盖与交付声明核对

范围是 B.4-2R4 的实现变化与前轮要求；未把整个 B01–B12 重新宣布为已验收。

| 项目 | 代码或证据 | 本次结论 |
|---|---|---|
| 共用旧字段解析 | core 新增 parseAndValidateLegacyRevision、resolveLegacyRevision、validateLegacyRelations、resolveArrayAlias、processLegacyRelations | Post 与 initial_post 确实复用，原 null/别名问题有效修复；X03 显示降级前已知版本语义仍缺一层 |
| 正式 W01/W02 | `tests/integration/m0-m1-r4-b-regression.test.ts:2497`、`:2542` | 各 4 个坏输入有 HTTP 拒绝/只读、迁移拒绝、关闭重开后全库逻辑快照；不再只是 helper 断言 |
| 正式 W03 | 同文件 `:2584` | 比较真实首次响应与重放、旧完整结果及合法 marker；独立 W03 及新增 X02 的三个正例通过 |
| 正式 V01/V02 | 同文件 `:2333`、`:2368` | 仍直接调用预检/normalizer 并断言 toThrow；没有该组所要求的真实在线/迁移/重开链。独立 V 5/5 不能替代正式覆盖来源说明 |
| 完整类型关联 | OperationFamily 及共用 helper 已存在；新增字段解析入口使用 unknown，normalizeLegacyResultRef/extractResultRef 仍有 any，处理结果 payload 仍可选 | 有实质进展；不能声称 operation→业务结果→ref 已全部静态绑定，不单独以类型风格阻塞本次交付 |
| 正式测试数 | observed-tests.txt | 125 项、11 文件、B 61 项，准确 |
| 本轮产品/测试改动 | baseline-before/after 对照 | 83 个文件中 2 个变化；before 产品与 R13 相同、after 产品与 R14 相同 |
| 交付命令和日志 | implementation-r4-b4-2r4/commands.json、run-all.mjs、34 个 stdout/stderr 日志 | 17 条所列命令的日志齐全、退出码有据；漏 G/H/J/K 四条，与“全部必跑已执行”不符 |
| 命令别名 | 根 package.json | pnpm build 与 pnpm -r run build 等价，test 与 test:all 均为 vitest run；不是遗漏 |
| 旧勘误 | 交付 README | 11 族含 admin.redaction、46 项为独立脚本、lint 为 tsc --noEmit 且无 Turbo：已更正 |
| 字节/快照 | unchanged_after_reopen | 验证的是 schema 与所有表行的逻辑等价，不是物理 SQLite/WAL 文件字节相同 |

完整机器可读核对见 [delivery-evidence-audit.json](delivery-evidence-audit.json)。起始总 tracked diff 与 R13 的捕获值不同，并不否定产品指纹一致；总 diff 同时包含后续审查入口文档。不要把二者混称“所有起始状态 100% 一样”。

R14 已补跑 G/H/J/K，分别 9/9、10/10、7/7、1/1；证据在本目录，原实现归档保持不变。下一交付须如实引用本次结果，并在最终源码上完整复跑要求的命令，不能复制或倒填本次 stdout 为自己的执行输出。

下一包继续使用 [R8 的 B.4-3 范围](../2026-09-29-m0-m1-r8/remaining-work.md) 与 [原 B01–B12 要求](../2026-09-28-m0-m1-r4/next-agent-prompt.md)。已有有效断言可直接引用；本轮没有重新逐一认定历史覆盖审计中的每一项缺口至今仍然存在。实现者须按子条件核对现有证据，只补真实空缺，并提供准确测试名、断言、原始输出和文件位置。
