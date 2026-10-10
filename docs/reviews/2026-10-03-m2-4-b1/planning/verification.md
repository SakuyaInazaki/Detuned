# M2.4-B.1 独立验收准备

只封存基线和有限矩阵，不执行产品/build/套件。DTO/route/chunk单位和错误政策待父冻结，不预造 schema。当前已接受 M2.4-A 未提交内容是合法基线，不 reset。

| 编号 | 冻结后有限独立验证 |
|---|---|
| SR01 | context readSnapshot 返回实际内容 revision 固定定位，区别 policy_revision；大 objective/rules 降级明确预算省略，不冒充 null/missing 历史事实，保留 checkpoint/来源语义。 |
| SR02 | 实际新 HTTP 读取入口从 context 固定 ref 逐页完整重组旧 objective/rules；中途更新当前内容，不漂移；严格等于存储固定版。 |
| SR03 | 实际 raw HTTP compact body 4096/65536/default，中文/emoji/quotes/backslash/control、真实 req.id、二次 JSON 转义；每页推进且末页完成，无漏字/重字/空片死循环。 |
| SR04 | 最小 metadata 超预算仍 422；真实 request_id 接近4096边界控制，不把大规则旧422当新拒收。整体省略是 ref，不截字符串假称完整。 |
| SR05 | 签名 cursor 的 version/purpose/actor/space/revision/position/TTL/白名单、篡改与用途混用；固定 Clock 有效/过期边界按冻合同，现标准 signer 原行为保持。 |
| SR06 | 每页重新检查当前凭据/成员/空间 ACL；跨空间、错误修订和撤权错误不泄漏，授权先于坏 cursor。成功与拒绝读取均无实体/event/幂等/ack写。 |
| SR07 | A 的双 WAL 连接规则读取后 writer 事件屏障→旧版 ref/旧 seq、一致 checkpoint、真实后续订阅收到事件；focus 明确400，其他来源/脱敏事实保留。 |
| SR08 | shared client/forum_read 的 space 分支和 context meta；实际 Pi validator→execute、MCP stdio、批准 CLI context/space续读传播固定ref与cursor，SDK 外壳预算不虚报。 |
| SR09 | 新 route 实际目录/OpenAPI/共享 DTO/完整参数和错误一致；原 catalog 检查按真实适用性处理，无删除新增operation或伪造JSON槽。 |
| SR10 | 当前 versioned29/fullformal/SQ/KV/真实历史原键与保护完整性，准确新计数以日志为准；B.2/post-thread/M6/10万不扩。 |

本轮 baseline.json：HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44；122 product/config/test，35 currentdocs/material，2207 全旧 review/probe/log/evidence（含完整 M2.4-A）、4 SQL/archive、2 schema/profile，208 tracked/36 untracked dist。真实 dirty 状态保存。M2.4-A 263/26 和当前29/29只是本轮起点，不预填本轮结果。

兼容事实与需父裁定：

- M2.4-A 独立 check-context-http.mjs CX03 要求2000中文objective4096→422以及30000中文65536→422；B.1批准ref降级后合法变更，原脚本/日志绝不改。本轮需版本化 v2，保留真正最小metadata422并增加固定读取完整重组证明，coverage 映射交父审。
- A独立 request-id临界和两连接快照保持真实意图，但新固定metadata开销和规则字段判别会改变计数/访问形状；可以用本轮新probe补偿，保留旧counterexample原字节。SR04必须用真实 body 而非仅helper结果。
- 已核对现 M2.1 check-c-completion-v2.mjs AD02:116–150，实际operation集合/JSON body/path/media/schema是**动态全量比较**，报告实际operation_count，没有写死35。R22AE目录也是动态比较。因此新增route未必让旧ADv2失败；不得先人为改旧脚本或无理由替换。如果新DTO/语义真使其失败，保存真实结果再向父申请本轮版本化替代，不能遗漏新route。
- 旧正式 A core C02 与 contract C01 的大必需内容422需父批准精确适配成省略ref+真实续读对照，保留 metadata422；新schema可能触及 knowledge/cross-interface/context工具消费者，先列实际文件/断言，不由验证代理改。
- current29仍沿M2.3/M2.4-Amanifest，M2.1 media-awareADv2 与原R21JSON-only历史28/29诊断分开，全部原历史证据保留。观察到确实不兼容后才版本化当前清单，不靠删检查凑绿。

计划的独立存储fixture明确标识合成历史shape，不宣称真实旧HTTP成功；原HTTP幂等对照复用现已有真实夹具，不重造rawhash。基线至后续stablebefore的有意实现变化与验证期间source/docs稳定分列，build产物分列。

未运行产品探针/build/套件。Node22/干净安装/真实宿主模型/远程CI/10万负载仍未测。B.1不等于完整M2.4/T06/M2。等待A/B接口计划与父冻结，再写可执行独立脚本。

Prepared after freeze, not executed: check-space-http.mjs asserts optional small pin survives content downgrade. First two4096 nonterminal pages advance injectedClock60seconds, secondcursor exp equals original, then budget65536 continuation. New check-context-snapshot.mjs inherits self-authored WAL barrier and actualcheckpointpoll/Clockexpiry proof; no developerassertions. check-space-tools-cli.mjs prepares installedPi validate→execute, space noid+requiredrevision, incorrectmeta schema negatives, old unsupportedkind/params400, MCPListTools rootobject+anyOf/call, realCLIcontext page and space read multipage reassembly. Allsyntaxchecks0 only. If finalexport/fixture binding wrong, preservefirstfailure and attribute fixture before productjudgment. No runtimeimport/build/suite. Preparation complete; waitfinalfreeze.
