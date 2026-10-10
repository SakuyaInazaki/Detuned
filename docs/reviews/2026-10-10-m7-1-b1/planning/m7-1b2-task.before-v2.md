# M7.1-B2：check CLI与现九工具的普通检查分支

status: root_scoped_candidates_pending_B1_acceptance_metadata_seal_B2_fresh_dispatch
日期2026-10-10。本文是root明确范围的计划，不是已实现能力或产品写入授权。B1实际失败/修复优先；须B1接受、metadata末核/seal，再新B2 fresh与root dispatch。以[owner候选](m7-1b2-owner-candidates.json)为准，不创建占位接口。

依据[只读接点事实](m7-1b2-entry-facts.md)、当前B1 typedclient/strict DTO/受限传输及root裁定。主代理编排验收，sol6.1 A写CLI、B写canonical工具与shared dispatch，D独验和唯一串行运行窗。无前端/Web/浏览器工作，原源码与证据保留。

## 固定产品范围

CLI新增唯一namespace `check`，当前Commander无同名冲突。十二子命令薄调用B1十二typedmethods，不复制服务端权限、生命周期、门禁、hash或业务状态公式：

| CLI子命令与选择器 | typedclient |
|---|---|
| check create <space-id> | createCheckRun；JSON CreateCheckRun input含request/snapshot/check/verifier/expected_request_version |
| check read <space-id> <run-id> | getCheckRun |
| check snapshot <space-id> <run-id> | getCheckSnapshot，保实际JCS SHA验证 |
| check post <space-id> <run-id> <post-id> <revision> | getCheckPostRevision，正safe整数revision |
| check credential <space-id> <run-id> | issueCheckRunCredential，JSON canonical ttl_seconds?；管理员/维护者一次明文 |
| check receipt-submit <space-id> <run-id> | submitCheckReceipt，JSON canonical SubmitCheckReceipt |
| check receipt <space-id> <run-id> | getCheckReceipt |
| check invalidate <space-id> <run-id> | invalidateCheckRun，JSON InvalidateCheckRun |
| check artifact-upload <space-id> <run-id> <file> | uploadCheckArtifact，空metadata及--mime习惯 |
| check artifact <space-id> <run-id> <artifact-id> | getCheckArtifact metadata only |
| check artifact-download <space-id> <run-id> <artifact-id> --output <new-file> | downloadCheckArtifact + publishArtifactFile |
| check required <space-id> <request-id> | getRequiredChecks，普通只读，≤冻结32最新项目/缺run=null |

JSON输入沿现--input <file>/省略stdin；输出沿printOutput/global --json及现安全错误风格。credential stdin是canonical {}或ttl_seconds可选对象，不借普通Agent工具签发。明文仅成功CLI输出一次，不记录到日志、清单、key文件或全局配置；client不自动重试、不允许key。二进制download只新私有文件，无clobber，stdout只metadata摘要；artifact上传使用现同FD/bounded安全readArtifactBlob，不新宽松IO入口。

create/invalidate使用现getWriteContext：--request-key显式键或JSON request_key，和--request-key-dir/--logical-operation-id成对持久键互斥，strip transport key后送canonical body。B1已注册两operation scope，create target=request_id/invalidate target=run_id，持久格式/namespace/锁不变。

verify receipt-submit/artifact-upload不能走getWriteContext：persistent flags必须在读input/file、token解析和任何HTTP之前本地拒绝，包括不完整pair，不能隐式getMe/普通session。允许显式request_key或client per-callauto-key，网络重试同键。credential无request_key/持久key/自动retry，非法key选项本地零HTTP拒绝；JSON未知key仍canonical拒绝，不能声称无需读JSON即可识别其内容。所有命令沿withArtifactSignal/finally去监听与客户端取消；token仍用现明确来源resolver，不改global配置。

## 现九普通工具，仅扩两个名字的分支

不新增工具名。forum_review的严格Union新增：

- op=check_create：CreateCheckRunSchema canonical属性 + space_id/request_key，explicit request_key按现工具习惯必填；不接logicalOperationId。
- op=check_invalidate：InvalidateCheckRunSchema canonical属性 + space_id/request_key/run_id。服务端维护者权限仍实际裁决，不在客户端伪判授权。

forum_read的严格Union新增六kind，沿既有id含义，固定选择器避免不合法组合：

| kind | canonical selectors | client |
|---|---|---|
| check_run | space_id,id=run_id | getCheckRun |
| check_snapshot | space_id,id=run_id | getCheckSnapshot |
| check_post_revision | space_id,run_id,id=post_id,revision positive safeint | getCheckPostRevision |
| check_receipt | space_id,id=run_id | getCheckReceipt |
| required_checks | space_id,id=request_id | getRequiredChecks |
| check_artifact | space_id,run_id,id=artifact_id | getCheckArtifact metadata only |

每分支additionalProperties:false、保TypeBox Union/anyOf/typeobject、Static类型与validateToolParams/validateToolReadParams一致。新write复用input schema属性而非复制业务规则；新read不接受cursor/max_bytes/limit/file/path/URL/任何binary。client.callTool单共用dispatch直接typedmethod，去掉工具space/op/request_key/selectors，不混入canonicalbody。

issuer、verify-only receipt/log写、binary下载均不进入普通工具；不提供token结果或下载字节。MCP/Pi正常binding.prepare保持capabilities/getMe/诊断session的ordinary路径，不放宽verify；新read是普通身份安全读取，仍core当前ACL/sealed/撤权/脱敏门禁。管理员/sameactor不绕sealed隐私，诊断session不增加独立身份。

## 最窄接点与宿主固定依据

产品候选仅CLI index(A)、protocol tools(B)、client callTool(B)；CLI artifact-io/getWriteContext/signal、安全key store、MCP tool-validation/bridge、Pi index/runtime均应复用保持，不自动扩owner。确需修改再报root具体冲突。

MCP `tool-validation.ts`从DETUNED_TOOLS产生flat与wrapped{input}，SDK Ajv + canonical验证在prepare前；Pi public registerTool/adaptToolSchema及runtime同catalog/validator/client dispatcher。验收必须检查完整schema与新分支调用，而非九工具数量或仅第一元素。

官方固定依据是integrations/dsh.md与integrations/pi.md所链接说明和已安装固定材料：Pi publicSDK @earendil-works/pi-coding-agent0.87.1（package及installed package实际一致），现native-lifecycle内部loader是限定test-only，不迁入产品；官方Extensions/types输入execute/content/details合同按此固定版。dsh官方source5badb15009ae1756c3afe0ae0cef1faafc290ccc、@deepseek-ai/dsh-mcp-client@0.2.1-alpha.1、官方mcp-client README与tool authoring文档，原固定plugin九工具证据保留。dsh原证据不能升级为新分支认证，本包不运行/安装官方宿主、模型或改全局profile；完整宿主接入后M7.4另定。MCP/Pi本地public SDK/catalog回归与真实外部host认证分层。

## 验收与原失败保留

A作者新 tests/contracts/m7-check-cli.test.ts；B作者新 tests/contracts/m7-check-tools.test.ts；D新 tests/contracts/m7-check-cli-tools-independent.test.ts。三路径已核missing，不创建空file。作者编写与静审，实际build/type/lint/noEmit/test由D唯一窗口，workspace并发1/coreworker1文件串行，不改timeout/coverage。

1. CLI十二操作真实本地服务/SQLite链：维护者create/issue，受限verify只固定材料/log/receipt，普通required/invalidate/metadata；genericartifact/空间/getMe/私有评审仍拒verify。测试真实结果与controlled transport分列，不SQL伪造formal成功对象。
2. JSON stdin/file/字段strip与打印合同；badrevision/body/未知flags/组合本地安全失败；verify persistent pair或半pair在input/file/token/network零副作用，issuerkey零HTTP/retry0/一次明文。普通两写持久同target稳定、不同target隔离、不同body409/原key恢复；流错误后沿键重试不多写。
3. upload安全文件同FD/25MiB/hash/MIME/取消与清退；download exactscoped URL/hash/EOF/no-clobber和私有发布，stdout无binary，日志不能作为指令执行；沿B1引擎不另造通道。
4. canonical全部新分支extra/selectors/非法write范围拒绝，flat/wrapped/Pi完整schema保持九名字；invalidparams验证先于prepare/HTTP。检查issuer/verify写/binary明确不能广告或dispatch。
5. 普通新create/invalidate/read真实权限/撤权/sealed/日志redaction/current材料门禁；读required全对象/null/order/latest及receipt仅ID，不嵌正文；snapshot继承actualJCS SHA，工具结果沿旧bounded安全内容层，无自动ACK/新独立身份。
6. 相关旧CLI/review/tools/MCP/Pi公共SDK与flat/wrapped schema/lifecycle回归由root/D选择现必要文件，不惯性修改全部既有test。不重新扫描sealed或升级dsh固定历史证据，不增工具名/存储/HTTP/core业务。

完成后精确before/diff/freeze/self-review、独立交叉意见、实际gate/raw失败与相关repair保留，再按root批准metadata收尾/seal。计划自身不宣称B2完成或B1全绿；B1待修问题优先。本包无frontend、VM/Colima/Docker、模型、安装/锁变更、全局Agent配置、推送发布或旧tmp清理。
