# M2.2-B 覆盖核对

以下正式文件计数从 [独立正式stdout](verification/observed-tests.txt) 提取：22文件、238项，新增知识core7+protocol4；不把独立探针与正式条目相加。父代理已接受本机工程验收，最终结论见本包 README。

| 正式文件 | 通过项 |
|---|---:|
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `tests/integration/m2-artifacts-http.test.ts` | 8 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/integration/m1-discussion.test.ts` | 5 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `tests/integration/m2-artifacts-filesystem.test.ts` | 6 |
| `tests/contracts/r4-c-route-contracts.test.ts` | 4 |
| `tests/integration/m2-artifacts-cli.test.ts` | 4 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/contracts/m2-typed-write-contracts.test.ts` | 5 |
| `tests/integration/m2-typed-writes.test.ts` | 12 |
| `tests/integration/m2-artifacts-core.test.ts` | 9 |
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/contracts/m2-knowledge-view-contracts.test.ts` | 4 |
| `tests/probes/m0-probes.test.ts` | 3 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `packages/protocol/tests/schema.test.ts` | 5 |
| `tests/integration/m2-knowledge-views.test.ts` | 7 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `tests/contracts/r4-c-contracts.test.ts` | 26 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| **合计22文件** | **238** |

原B82、typed core12/protocol5、M2.1 core9/FS6/HTTP8/CLI4、C26/G4保持。当前版本化 [29命令](verification/current-commands.json) 全exit0、无超时（AC6/ADv2 5/AE5/U8）；[执行清单](verification/commands.json)。原R21 JSON-only AD与M2.1历史原28/29保持，替代清单不等于原历史29全绿。35操作/19JSON+1multipart未变，复用 [M2.1操作表](../2026-10-03-m2-1/coverage-audit.md)，不重复手编表。

## 有限覆盖映射

[独立KV结果](verification/observed-knowledge-first.json) **KV01–08全通**，其直接storage历史形状/非public事件夹具明确不是旧HTTP成功请求。正式和独立证据均不能视为真实模型研究价值证明。

| 行为 | 正式覆盖 | 独立探针 |
|---|---|---|
| findings仅claim，proposal原thread仍可读，作者报告/正式not_enabled | core7项 / protocol实际HTTP | KV01 |
| 三类真实关系、固定双方身份/state/版本、旧target不漂移、异构open-questions | core关系矩阵 / protocolDTO与HTTP | KV02 |
| 历史null+missing，合法空数组，reason条件，无category/state/attempt假默认 | core历史材料 / protocol基础guard和nullable | KV03（直接storage历史shape） |
| 有效active summary pin、无效pin过滤不改库；摘要自身与source新版分别标示 | core pin / protocolcontext HTTP | KV04 |
| missing/跨space不可泄漏，新旧未知null，withdrawn旧来源与异议保留 | core来源/关系 / protocol来源union | KV05 |
| 任一红删端blocking issue/impact null+missing、无旧内容，当前授权 | core红删 / protocol两端schema及HTTP401 | KV06 |
| recent_activity只public | core事件 | KV07（直接storage非public事件） |
| 新sources/relations进入原result计量，4096/65536触发原truncated路径 | core预算 / 原route边界保持 | KV08；明确非硬限长 |

[三真实历史HTTP](verification/observed-historical-http.json)全通：原key201、两个create新key400、revision stale原expected新key409/仅改当前expected后400、同key变payload409；三项重启重放、脱敏墓碑201、撤credential401、raw hash不变。使用M2.2-A原真实捕获夹具，不把本包storage历史shape伪称为旧HTTP成功。

[完整性](verification/integrity.json)与[稳定前](verification/stable-before.json.json)/[稳定后](verification/stable-after.json.json)记录117产品与33规范docs执行稳定、1839旧证据/4SQLarchive/2schema-profile保持；正常16个tracked dist与4个新增helper产物单列，旧证据不覆盖。KV09回归与完整性通过，汇总见[coverage.json](verification/coverage.json)。date-time ignored/测试局部结构模式不能宣称日期值格式验证。Node22/cleaninstall/remoteCI/四真实宿主/模型未测；整个M2仍待M2.3/4，完整envelope硬预算M2.4缺口明确，Web/正式评审/专用CLI与MCP上传仍未实现。
