# B M3.4-B.1 安全日志与运行接口

protocol operations 单源严格 schema、ErrorCode 与 OpenAPI/auth allowlist；server 匿名 health 与 core 管理诊断、可选同步白名单 sink、终态去重；CLI 默认有界 stderr NDJSON/可关闭、向 SqliteStorage 传 dataDir；shared client getDiagnostics 真实方法。四项作者契约覆盖 health/管理员schema/严格query/伪ID、sinkthrow隔离、真实慢Writable界限/drop/listener、真实HTTP client。

作者 source-first 3pass/1fail：loopback sandbox EPERM；source-second 同授权 outside 后 3pass/1fail：我最初替换按不存在 async getMe，实际 getMe 为非async，导致未落 getDiagnostics。这是新产品接线遗漏，已窄补真实方法；source-third 4/4通过。所有原log/exitcode保留。source alias noEmit first/second 均0；second是新增真实method后必要复核。未build/fullsuite；C将统一built/独验。

A读合并写态首次noEmit发现B protocol helper抹generic与缺INTERNAL_ERROR；已修真实generic/literal types、enum/schema，不unsafe cast。其第二写态发现 B logstate optionalerrorCode推断遗漏已修。原A日志归A保留，不虚报全程无失败。

stdio/凭据stdout保持；stderr启动原文本诊断与请求JSON行并存，可能部分行/丢日志不是可靠审计。未承诺B.2有界shutdown或全目录WALquota；日志省space与非canonical历史actor以保护可信字段边界。
