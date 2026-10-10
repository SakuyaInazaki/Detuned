# B：七项既有管理写 CLI

六owned文件源码冻结：CLI index.ts、新admin-input.ts、新tests/contracts/m4-admin-cli.test.ts、新examples/admin-cli.md、docs04追加与docs12 ADR046。A typedclient/DTO/OpenAPI与C独验不属于B；未改server业务/SQL/schema/依赖、六当前入口或旧证据。

作者唯一source定向 exit0：正式4项中1通过、3 built待统一构建明确skip（DETUNED_SOURCE_ONLY=1），source-first.log。A确认产品稳定后唯一sourcealias noEmit含本新test及CLI/client/server/protocol源码 exit0，source-noemit-first.log。没有build/fullsuite或把旧dist当新命令验证；C统一built门禁。

七动作只print data，不打印envelope；credential一次成功token仅stdout，CLI不自动写文件/日志/store。新input仅局部readAdminInput包existing reader，省略用stdin、-显式stdin；解析/读取/非object固定safe VALIDATION_ERROR exit2，未知业务字段仍由server校验。旧readInputJson/parser/错误映射没改。六非幂等动作没有keyflags/CLI重试；单attempt责任归A private request executor，不根据retryable自行重放。

redact使用getWriteContext(options,input)，沿options.requestKey??input.request_key；input字段extract不进wire，persistentflags+任何own inputkey含null仍本地拒。admin.redaction space必填targetnull由A/store验证，不复制bodyhash/ACL，CLI不将target/type/reason塞入store。不同意图改logicalId，同ID改body服务409。读真实凭据或用户global配置没有发生，命令测试仅privatefixture。

正式B02真实builtCLI actor/credential/member create/patch/deactivate/revoke流程与实际me/权限/401；B03坏JSON/路径与unsupportedkey无HTTP，敏感文本/path不回显；B04 JSONkey提取/explicit优先/replay/persistent409/null冲突。token仅内存处理，断言bool/出现次数，不归档完整成功stdout。每child10秒，case60/90秒有限；C负责更完整ordinary/admin-owner及六singleattempt错误矩阵，B不堆镜像wrapper测试。

指南记录结果未知可能已提交、token不能盲重试恢复、普通actor仅read/write指定space、无自动admin分发、无全局token-file/parser重写或四宿主/M5–M7完成宣称。ADR046补本包兼容取舍。
