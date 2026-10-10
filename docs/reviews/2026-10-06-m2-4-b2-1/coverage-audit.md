# M2.4-B.2.1 覆盖与证据核对

2026-10-06有限本机验收。以本轮coverage/commands真实记录为依据：30唯一formal文件、293/293，新core10+contract7=17已含总数，276+17=293。当前29/29与全部39记录命令exit0，独验没有失败或重跑；正式与独立探针不重复累计，原JSON-only历史28/29继续独立保留。

| 正式文件 | 项数 |
|---|---:|
| `packages/protocol/tests/schema.test.ts` | 5 |
| `packages/storage-sqlite/tests/schema-generation.test.ts` | 6 |
| `packages/storage-sqlite/tests/storage.test.ts` | 7 |
| `tests/contracts/cross-interface-contract.test.ts` | 2 |
| `tests/contracts/m0-m1-adapters-regression.test.ts` | 6 |
| `tests/contracts/m0-m1-r2-adapters.test.ts` | 3 |
| `tests/contracts/m2-context-contracts.test.ts` | 4 |
| `tests/contracts/m2-knowledge-view-contracts.test.ts` | 4 |
| `tests/contracts/m2-post-revision-read-contracts.test.ts` | 7 |
| `tests/contracts/m2-search-contracts.test.ts` | 5 |
| `tests/contracts/m2-space-read-contracts.test.ts` | 5 |
| `tests/contracts/m2-typed-write-contracts.test.ts` | 5 |
| `tests/contracts/r4-c-contracts.test.ts` | 26 |
| `tests/contracts/r4-c-route-contracts.test.ts` | 4 |
| `tests/integration/m0-m1-r2-regression.test.ts` | 12 |
| `tests/integration/m0-m1-r3-regression.test.ts` | 11 |
| `tests/integration/m0-m1-r4-b-regression.test.ts` | 82 |
| `tests/integration/m0-m1-regression.test.ts` | 11 |
| `tests/integration/m1-discussion.test.ts` | 5 |
| `tests/integration/m2-artifacts-cli.test.ts` | 4 |
| `tests/integration/m2-artifacts-core.test.ts` | 9 |
| `tests/integration/m2-artifacts-filesystem.test.ts` | 6 |
| `tests/integration/m2-artifacts-http.test.ts` | 8 |
| `tests/integration/m2-context.test.ts` | 7 |
| `tests/integration/m2-knowledge-views.test.ts` | 7 |
| `tests/integration/m2-post-revision-read.test.ts` | 10 |
| `tests/integration/m2-search.test.ts` | 9 |
| `tests/integration/m2-space-revision-read.test.ts` | 8 |
| `tests/integration/m2-typed-writes.test.ts` | 12 |
| `tests/probes/m0-probes.test.ts` | 3 |
| **合计** | **293** |

独立PR映射以[coverage.json](verification/coverage.json)原字段为准：actual stored105,164bytes/rawHTTP4K64Kdefault42/3/13页、每页完整serializer逐字节/UTF8连续offset/双转义/精确重组；empty与历史structured额外shape保真；新head/withdrawn后固定旧revision不漂移而当前metadata更新；真实req.id1695→4096bytes、1696→422；首TTL在两非末页中间推进Clock仍沿原exp/换预算、等号/+1；strict签名purpose/actor/space/post/revision/version/offset/extra；当前ACL与redacted410先验；双WAL同snapshot。正式coreP10真实RedactionService并发与独立synthetic lifecycle分别如实说明，不冒充原真实历史fixture。

安装Pi0.87.1 validator→真实注册execute、MCPstdio ListTools rootobject+anyOf/call、CLI新post read22页重组/坏数字exit2及合法旧post整data通过。ADv2/AE实际37routes/20body=19JSON+1multipart、0placeholder；18行date-time ignored不能称值格式验证。原B.1四SR、SQ/native与KV原脚本通过。旧三真实HTTP原key夹具持续not_run，材料缺口不填绿，不说所有历史回放本轮保持。

[verification](verification/verification.md)、[readonly-audit](verification/readonly-audit.md)、[commands](verification/commands.json)、[integrity](verification/integrity.json)确认执行期间126source/config/tests、35docs/material、5mutable稳定；2344旧证据含完整B.1、4SQL/archive、2schema原hash保持；27tracked dist正常变化、四新service产物，未删除。接受后8文档同步在验证结束之后，不能归入上述零变化声明。

真实四宿主模型/Node22/干净安装/远程CI/100k未测；cap不含headers/status/error/toolwrapper，每页O(document)。完整T06/M2.4/M2与M5/M6/M7未完成，B.2.2下一包尚未实施；M8是独立研究效果验证。

## 2026-10-06 最终状态文档核查报告

父接受后仅同步获准8文档，next-task.md由core另写并停写后再一次终核：194/194本地Markdown链接目标存在，其中6处本包下一任务书目标均存在，无缺项；8文件尾随空白零项，`git diff --check -- <8 files>` exit0无诊断。直接核真实coverage/commands/integrity：293/30、逐文件合计293、新10+7含总数、current29与39记录exit0、37routes/20body/19JSON+1multipart/18警告、126source/35docs/5mutable运行稳定、2344旧材料/4SQL/2schema保持，以及27tracked dist+4新产物一致。未重新运行产品测试/build。

新入口更新为B.2.1，历史B.1/A等段落与旧reviews/原日志未改；功能状态表明确“已有基础”和未实现/未验收，B.2.2只为下一任务书尚未实施，三真实旧HTTP原夹具持续not_run。此8文档变化属于独验结束后的授权收尾，不倒填独验零变化或结果。

末次文字核查：父批准只窄修progress与本包README，明确旧工具/CLI首批限制而HTTP/client已有limit/cursor分页、新有界签名目录待B.2.2，并以“真实宿主会话实测”替代认证措辞；链接未变。三文件尾随空白零项，限定`git diff --check` exit0，未运行产品检查。
