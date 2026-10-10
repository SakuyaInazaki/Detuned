# 原历史夹具恢复事实与父取舍

2026-10-06，仅只读核查和新说明，不修改原capture/provenance/fixture/脚本/日志，不新造历史成功，不执行额外产品测试。父接受B.1有限本机功能工程验收；本轮原三真实HTTP原key重放保留为环境证据缺口。

| 只读依据 | 事实 |
|---|---|
| [原capture](../../2026-10-03-m2-2-a/verification/capture-historical-fixture.mjs) | 先逐一验证baseline dist hashes，再用同版HTTP真实生成初始帖201/原key/rawhash；凭据仅写临时目录，公共记录没有原token |
| [原additional capture](../../2026-10-03-m2-2-a/verification/capture-additional-history.mjs) | 验证同版dist，使用原temporary DB+credential经HTTP生成新帖/修订成功，保留实际payload/result/idempotency记录 |
| [原provenance](../../2026-10-03-m2-2-a/verification/historical-fixture.json)、[附加记录](../../2026-10-03-m2-2-a/verification/historical-additional-fixtures.json) | 绑定232个旧M2.1产物hash、原temporary_database/credentials路径。旧M2.1为未提交实现，不能仅按Git HEAD名称视为同版 |
| 父接收的core只读Git核查 | b8dacd56779a007a2e7045b682bca0c036fdfc44对232产物仅111匹配、97不同、24缺失；无可用同版归档，不能用该commit宣称还原原同版 |
| [本轮原脚本首stderr](observed-prior-historical-2026-10-06.stderr.txt) | 原temporary_credentials ENOENT，未进入HTTP产品重放；原DB/token消失，公共capture记录不足以恢复对应原凭据 |
| [本轮完整性](integrity-2026-10-06.json) | 原2207历史证据均原字节保留；丢失的是临时执行材料，不是历史审查证据 |

父裁定：新scope/current29/276正式证据支持有限本机功能工程接受。三真历史原夹具本轮未完成，不称其回归保持或“全部验证通过”，不推翻旧历史验收。无需新造不同版本夹具掩盖缺口。

重试条件：找到原DB及对应凭据，或找到可核验232产物hash的同版构建/归档后另立恢复执行记录。未来也可针对真实Git旧版本建立新的HTTP历史生成与升级回放证据，但必须写明实际旧版本、生成时间与新provenance，绝不等同原夹具原字节replay。budget/env错误不自动否定产品路线；当前未排除用户在别处保留了原材料。
