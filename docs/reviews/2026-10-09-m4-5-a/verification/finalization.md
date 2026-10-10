# M4.5-A 独立收口

2026-10-09。**可接受有限版本化宿主实测与配置交付；完整M4尚未完成。** 父最终接受在本独验之后，下一包fresh尚未创建；不将本文件写成父已经接受。

## 实际验收结果

- Codex0.144.6：安装四文件hash保持、真实337 schema/3,159,797bytes完整、OS runtime guard正负通过；第三轮用户SQLite state保护拒、第四轮仅owned sqlite/log override后用户config读取EPERM/using defaults/File exists17，native自然exit1/RPC无响应。不是auth-required，无工具通过声明。
- Claude2.1.282：完整保护下connected且raw工具仅四个；最后真实context成功，capabilities/me/session/context共4HTTP，普通actor/space诊断session新增1；非法额外字段固定VALIDATION_ERROR且仍4HTTP。native自然EOF0、stderr0、owned目录与精确process group已清退。八工具/写工具/完整CLI/profile/模型仍未认证。
- 直接SDK1.30.1桥快照广告八工具，不能替代Claude发现；四缺失与顶层anyOf/allOf的安装native normalization/drop分支吻合，但没有本轮runtime drop reason。后续按父冻结M4.5-B flat|wrapped任务，不临时删约束或降级权限。
- 638项/92文件属于M4.4-B已接受基线；本包没有新增核心测试、build/typecheck/lint/fullsuite/current29结果。337 schema、宿主两调用与静态JSON计数不累加到正式测试。

完整判断：[独立宿主审查](independent-host-review.md)。完整安全诊断与实际response位于作者receipt，原失败均保留；审查者没有再启动CLI或模型。

## 静态终核与保护

| 检查 | 实际结果 |
|---|---|
| Codex最终freeze-v4 | 勘误前389项全部匹配；当前388项匹配+下述1个父授权metadata delta；freeze原件SHA b9720da360aa4c987dfcb33b8ff5124e33eabf871524b8cc6cc12780399de584保持 |
| Claude最终freeze-v6 | 30项全部匹配；SHA 3b875e9a5a0953b0065194cf4283449fed765efe27471cd848320e6e13d7dab4 |
| M4.5-B后续任务书 | 单列SHA b0ced7eec3f4502b170a4e011231af4966a4efdd59a455518a6dbf6e33851551，不属于作者freeze |
| 产品source/config/tests | baseline278项hash无变化，当前集合278，无新增/删除；lock包含在内 |
| 旧review证据 | baseline5913项hash保持；没有回填旧失败 |
| SQL/archive与schema profile | 4项/2项hash保持，原archive字节保持 |
| dist | tracked208+untracked220项hash保持，没有本包build |
| HEAD | b8dacd56779a007a2e7045b682bca0c036fdfc44，与baseline一致 |
| 第一静态JSON/link检查 | 375JSON解析无错，23Markdown/308本地目标无缺失 |
| 授权delta后末核 | 378JSON解析无错，24Markdown/313本地目标无缺失；当前对A v4仅compatibility.json一个授权差异，B v6仍全部匹配 |
| git diff --check | exit0，无stdout/stderr |
| 资源独查 | 精确pgrep groups 71110/71957/72180/72928/73600各exit1空输出；owned generator及最新native目录均不存在 |

初次检查Codex历史v3时七个父拥有的当前摘要已经更新，保存[首次receipt](final-protection-first-receipt.json)；最终v4最新摘要已全部匹配。历史v1/v2/v3不要求与当前metadata一致，保持其归档字节；此项不是产品失败或重复核心gate。

父随后明确授权一次单字段勘误：仅 `integrations/compatibility.json.summary` 改为各宿主有限实测/完整CLI与模型仍未完成的准确概述；所有adapter数据和其余字段不变。文件SHA由 **270926083b927475465dae4bcf212474e9aa6ce2fc90a1561f5f064b8e279e8b** 变为 **e549d6cb992b383f10b05b45da26deef334c7f5da2a4ab95c6e8767dd959d3f0**；[授权delta receipt](compatibility-summary-postfreeze-delta.json)含精确unified diff。A v4保持原件，不制造新freeze或称最终389全匹配。下一fresh应以修正后的实际metadata为基线。

证据：[只读宿主receipt](independent-host-readonly-receipt.json)、[保护receipt](final-protection-receipt.json)。root入口、progress、roadmap、validation、兼容记录和共享指南明确本包有限范围/旧638基线/完整M4未完成；README与next-task指向父已裁M4.5-B，M5认证及UI保留为后续计划。配置模板仅静态JSON/TOML验证，无inline token、不自动写用户配置。

无需用户提供模型账号解决本工程schema适配。下一包仅在父读取并接受本结论后创建fresh baseline；本独验没有提前开始后续产品实现、提交、推送或发布。
