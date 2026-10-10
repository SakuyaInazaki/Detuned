# A→B 只读交叉审查

范围 protocol/export-decoder.ts、client/export-stream.ts与CLI import分支、契约。无具体可达阻断finding；未改B产品或运行完整tests。

纯decoder无Node/client依赖，本地与HTTP同一UTF8/LF/schema/seq/count/hash/end+EOF验证，固定linebuffer与限额只缩小；callbacks逐行await且provisional。abort race覆盖iterator、hash与callback，stop/return late rejection被观察；只完成end+EOF返回成功。完整hash不作为来源签名。

client保留JSON错误映射、provisional sink/不retry、timeout与UserAbort/Protocol/Transport分类，独立decoder只处理wire协议；sink自身失败仍transport且retryablefalse。reader cancellation拒绝有catch观察。CLI import只做参数/退出码与local API调用，不用getClient、不抓URL、不复制FK/历史规则；SIGINT/SIGTERM controller及cleanup、结果一次敏感输出符合本地admin契约。

读代码结论不替代C真实builtCLI/HTTP、旧export契约及完整门禁。A审查中的两阻塞问题（FIFO open、FK全数组）属于A维护层，已按父批准窄修且原有限反例保留。
