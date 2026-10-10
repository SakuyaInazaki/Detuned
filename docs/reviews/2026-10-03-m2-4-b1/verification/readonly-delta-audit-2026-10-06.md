# B.1只读变更与合同审计

本审计在2026-10-06稳定实现上只读完成。Git HEAD diff包含以前多个合法未提交包，不能把其总行数视为本包delta；以10-03 baseline hash→恢复/稳定hash逐文件区分。本包14个既有product/config/test变化、3个新增文件，4文档变化、1新示例；恢复报告和freeze文件说明既定所有权。变更没有SQL/DDL/依赖/global配置。

- context在同readSnapshot拿实际内容ref与规则/材料/seq；事务后签同seq checkpoint。先空optional计inline mandatory，不fit就原完整候选整体降null，再原activity→failure→blocker→pin尾删，保留小pin可放控制。预算省略与历史missing/source状态分开，最小metadata真实422仍在。
- 新SpaceRevisionReadService每次snapshot先refreshContext/requireSpaceAccess，严格query/revision/cursor，固定getSpaceRevision；读取后只编码{objective,rules}。首24h/链exp不延长、不绑预算、字节offset合法且非末尾；HMAC signer复用。UTF8安全二分非空片，真实signed cursor/request_id/二次转义计整体compact envelope，末页另测。没有event/idem/ack写；一次完整文档O(bytes)内存/编码开销，没有宣称常数内存或SQL硬预算。
- protocol统一ref/document/page/envelope与complete/meta union，context判别拒矛盾，forum_read rootobject+anyOf严格space/post/thread分支。新HTTP route固定revision和query whitelist，复用共享compact serializer；实际ADv2/AE36目录覆盖，没有人工新增JSON占位槽，20body=19JSON+1multipart。
- shared client space分支调用HTTP并返回完整page；参数组合纯结构validator复用，服务授权规则没有拷贝客户端。Pi/MCP unchanged通用适配真实发现/执行新分支。CLI新space read严格数值/context整page；search/旧合法post-thread输出保留。
- 父批准旧正式适配均保留原意图：context旧大inline422改为ref+实际重组，小inline控制、最低metadata422、escaping/rawcap仍保留；新增ref与status为included规则静态缩窄提供依据，没有删除knowledge/cross-interface断言。WAL/来源语义由原formal+新独立补足。

本轮source125/docs36稳定前后零变，旧reviews2207、SQL/archive4、schema2保持，见integrity。当前29原样29/29、新scope通过；三真历史fixture原脚本因原temp材料ENOENT没有产品结果，不能把合成stored夹具替代该证据。ADv2日期format warning保留。所有claims以真实日志为界，父最后裁定包接受与下一阶段。
