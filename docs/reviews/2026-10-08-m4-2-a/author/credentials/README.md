# M4.2-A B Node凭据交付（源码冻结，built待C）

9个授权文件见freeze-manifest.json。E已验收算法移至client/src/local-token.ts，改动仅function signature和四source字段名；buffer/open/read/stat/decode/finally/固定错误规则原样。现node.ts新增export，browser index未改；CLI token-source仅@detuned/client/node导入与两参字段映射，不增依赖/lock、不读ambient、不引CLI/sqlite到共享client。MCP A使用environment两字段。

新formal3组：NC01 sourceNode出口/既有FileRequestKeyStore/browser不暴露；NC02 CLI wrapper字段映射/同错误及所选file；NC03实际built package入口待C。不是镜像E七组算法测试。

source-first exit0，2pass/1built skip；e-token-source-six exit0，前6pass，第7 testNamePattern未选。父明确第7native striptypes CLI源child会经package入口读取尚未更新Node dist，因此仅source执行阶段依赖；保原E7 fixture未改、未加skip标记，C统一build后完整7回归不得继承source筛选环境。

source-noemit-first exit0，含新test及CLI/client/protocol/core/storage/server源码，无编译产物；mcp作者源码检查由A负责。未build/fullsuite/current29或启动host。无首失败，不能把未运行built链写为通过。

文档追加M4.2-A共享Node/八工具与兼容structuredContent/text16KiB/关闭10秒契约，factory精确API据A初版；清楚完整广告schema/身份session留B、四宿主未认证。原E指南仅追加共享入口一句，成功输出/CLI退出未改。当前方案同步不替代父验收，C统一独验。

产品/tests/docs已停写。若A实际接口或独验揭示文档不符，仅按父授权窄修并保delta；当前无运行时新入口、依赖或模型/global配置变化。
