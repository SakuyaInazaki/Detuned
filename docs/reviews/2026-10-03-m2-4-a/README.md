# M2.4-A 上下文限长与一致读取：本机工程验收通过

2026-10-03，父代理读取独立验证、覆盖/完整性与只读审查后接受本包有限工程范围，没有当前范围未关闭故障。M0/M1 core+C、M2.1附件、M2.2 A+B和M2.3搜索继续通过；这不是完整M2.4、T06或整个M2完成。

成功context响应现在保证实际compact HTTP完整正文UTF-8字节数≤max_bytes，范围4096–65536、默认12288，包括真实request_id、转义、data/meta与标点。core与route使用同一编码函数，可选材料按activity→failures→blockers→pins逐整项删除并报告truncated；目标、规则、checkpoint等必保材料放不下返回422，建议增大预算，不伪造截断文本。HTTP头/status、错误正文与工具prettyJSON/SDK包装不在此限额内。

当前授权、规则、材料和事件高水位在同一读快照中取得；checkpoint使用注入Clock签同一seq，读取不自动ack。client与forum_context返回 `{data,meta}`，Pi/MCP保留truncated真/假；旧工具消费者改读result.data。focus_thread_id明确不支持，授权后拒绝显式值，请省略。CLI仍仅打印data。

独立 **263/263正式测试、26文件**，新增core7+contracts4已包含其中；**当前版本化29/29**全部exit0。实际raw HTTP、真实request_id临界4095字节/多一quote422、双WAL旧规则旧seq→实际poll新event、Clock到期等号201/+1秒422、安装Pi校验执行与MCPstdio两预算true/false均通过；旧SQ/KV和三真实历史重放保持。详见 [独立验证](verification/verification.md)、[覆盖审计](coverage-audit.md)、[只读审查](verification/readonly-final-audit.md)与 [交付索引](implementation/README.md)。正式条目与探针不累加。

验证冻结期间122产品/config/test与35当前规范材料不变；2078旧证据、4SQL/archive、2schema/profile保持；统一构建正常改变21tracked dist、无新增dist，详见 [integrity](verification/integrity.json)。原R21 JSON-only历史28/29保持，当前29使用media-aware ADv2，不能称原历史29全绿；16行date-time ignored不提供日期值格式验证。首次独立产品执行无失败，准备期shell前解析错误与开发测试类型夹具错误分别保留，未掩盖产品结果。

必保过大422尚无固定规则ref续读。下一包由主代理按已批准 [M2.4-B.1任务](next-task.md)分派固定空间修订引用与规则续读，B.2再做post/thread续读，用户无需转交；本包不自行开启后续实现。Web、M6正式评审、专用CLI/MCP上传未完成；真实四宿主模型、Node22、干净安装、远程CI、10万负载未测。本机Pi/MCP是受控契约验证，不能虚报真实宿主认证。没有commit/push，开发子Agent编排不改变论坛自身不启动参与者Agent。

试用：[限长context](../../../examples/context.md)。
