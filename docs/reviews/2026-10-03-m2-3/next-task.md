# 下一包内部任务：M2.4-A context硬预算与一致checkpoint

主代理下一轮自主分派给gpt-6.1-sol；用户无需手动转发。M2.4拆A/B，下一轮只A；B后续补固定space规则/帖子等继续读取。A通过不等于完整T06、M2.4或整个M2通过。当前M2.3状态以父独立验收报告为准，不改本轮冻结产品/规范/旧证据。

## 开工先规划，再父冻结

读最新AGENTS、README、docs00/08/11、docs03/04/09及本包next-step-facts.md和最新已通过报告。只读核实context/schema、HTTP envelope与req.id、工具包装、StoragePort/SQLite snapshot、ClockPort/signature。提交精确DTO、构造依赖、预算计算/serializer接线、readSnapshot签名、focus_thread_id处理及正式屏障计划给父；父冻结接口和业务/协议两单元所有权后才实施。

## 父裁定行为

1. **实际HTTP envelope预算。** 承诺实际compact HTTP完整envelope的UTF8字节≤max_bytes，计入真实req.id字节、api_version/data/meta与JSON标点/转义。core负责材料选择、权限、事实；server提供可计算envelope固定开销或等价纯共享serializer信息并发送，不在route裁业务内容。不能只量data、估计固定UUID或漏掉truncated值/字段开销。
2. **工具保留truncation。** forum_context返回 `{data,meta}`，明确原只data的迁移；共享client复用HTTP。SDK text/details/content外包装与pretty JSON不在同一HTTP限额内，文档不能暗示整个工具消息也≤max_bytes。至少保留meta.truncated，不能经adapter再次丢失。
3. **core边界与整项删减。** core也验证4096..65536/default12288。组装现有可读材料后，按优先级反向整项移除：activity→failures→blockers→pins，直到实际envelope fits；null/missing_fields/来源状态保持、不改固定ref，不截字符串冒充完整。目标、规则、checkpoint及必要标识本包必保；仍放不下则422 QUERY_TOO_BROAD并明确建议增大预算。A显式失败边界保持诚实，B再补固定引用/继续读取，不能称已完成整个T06。
4. **DTO有限新增候选。** 少量omitted-for-budget计数或固定space revision ref可在开工规划提父审批，不自行加字段。计数必须指此次已选择/移除材料，不冒充整个空间全部材料数量。不得改变已有摘要自身与来源新版字段意义。
5. **一致readSnapshot。** 新最小StoragePort.readSnapshot与SQLite deferred读事务，将当前授权、space/revision、材料与事件高水位放统一读取快照；事务结束后签同一seq checkpoint。明确注ClockPort，复用当前标准signer与持久secret；不改旧subscription/poll/ack语义、不自动ack、不加入新表/DDL或自造crypto。
6. **checkpoint正式竞态反例。** 跨两个SQLite连接，用可控屏障在读规则/取seq之间提交规则+事件；证明response/checkpoint一致，后续接续不漏。不得靠sleep碰运气，也不能仅断言token存在/actor绑定替代竞态证明。
7. **focus_thread_id明确。** 现参数未生效，规划给具体候选筛选语义，或本包不支持时显式响应/错误建议，父最终裁定；不能静默忽略而宣称实现。维持M2.2-B来源状态、脱敏与历史缺项投影。

## 最小反例及有限验收

先新增能暴露现根因的正式失败，保存before/after，再修实现：

- 实际HTTP compact编码（不是重建近似对象）4096/65536/default及非法边界；Unicode、多转义字符、真实request_id、meta纳入；成功响应始终fits。
- 大规则/目标导致必保部分超过预算时422明确失败，无悄悄截字、假truncated成功；增大预算可读的反例。规则数组/来源数组大，不假定历史新写长度一致。
- 可选材料按批准顺序逐整项删减，meta.truncated真实；来源null/missing、redacted墓碑、withdrawn固定版与摘要vs来源新版保持；没有无声ref漂移。
- tool/client/MCP/Pi保留data/meta，迁移文案明确；SDK外包装预算不虚报。
- 撤凭据/撤成员、跨space仍当前权限；context纯读取无实体/event/幂等/ack副作用。
- 跨连接屏障一致snapshot+checkpoint，授权与规则材料高水位不漏；标准签名actor/space/TTL绑定及Clock注入保持旧消费回归。
- focus_thread_id按父冻结行为真实验证，不靠schema存在判断实现。
- M2.3搜索、M2.2写/历史与知识读取、M2.1附件回归保持；有限定向测试/类型检查后冻结，由父协调统一完整独立验收。

## 所有权候选与旧接口适配

业务候选core ContextService、新budget helper、StoragePort/readSnapshot及SqliteStorage实现、Clock构造接线、新context集成测试；协议候选protocol Context DTO/query/envelope纯计算、server spaces与app构造接线、client forum_context、MCP/Pi传输包装及新HTTP/tool契约测试；docs03/04/ADR及证据由父分配。接口先冻结，避免并发改同文件/构建。

旧正式测试或source若必须调整，先报准确路径/行与原因。例如旧ContextService构造需Clock注入、cross-interface仅data读取、旧V06明确非硬预算断言可能需当前新行为适配；未经父许可不改旧测试，历史证据/probes保留原样。不能为凑绿弱化新HTTP字节或竞态反例。

## 非目标与后续B

B再实现固定space规则/帖子等引用降级和继续读取，届时M2.4整体另验收。A不开发post/thread/artifact/review分页，不重做M3订阅/批次/ack，不做10万/10分钟负载、排名/FTS重构/M6。不称QUERY_TOO_BROAD失败边界已提供完整接续路径。

保留旧reviews/probes/logs、SQL/schema/historical fixtures、archive字节与历史hash管线。不得commit/push/reset/clean/发布/部署或改全局配置；不调用真实研究模型服务、不自动启动论坛参与者；用户授权的主代理→开发子Agent编排继续允许。deepseek-brainstorm持续禁用，不安装不调用。真实宿主/Node22/性能未测须如实报告。文档指示完成即停；下一轮先规划供父冻结，不自行开B。
