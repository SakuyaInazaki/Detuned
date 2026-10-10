# M4.2-A A → B 凭据与组合入口只读审查

有限结论：本包 B9 范围未发现可行动问题。只读实际源码/manifest/测试与文档，不运行检查，不读取真实env或token文件。A5/B9冻结hash均匹配。

- client/src/local-token.ts:42–55 四输入source筛选保持E：explicit undefined才未选，env undefined/空string未选；>1先拒，0返回undefined；selected无效/文件失败不fallback，哪怕同值冲突。输入仅调用方对象，不读process.env。
- local-token.ts:9–12 token trim外层+JS空白/Cc规则原样；:17–36 regular sameFD/nofollow/nonblock、limit+1/64KiB原bytes/strictUTF8/前后stat/finallyclose与固定safeDetunedError原样，没新增mode/uid强拒/normalize或动态cause。
- cli/src/token-source.ts:4–12保持两参接口，四字段一对一映射共享resolver，没有在wrapper重新选择、吞失败或ambient读取。E7行为仍使用原薄wrapper，不被另一套token算法取代。
- client/src/node.ts:1–2保FileRequestKeyStore并新增resolveLocalToken；browser index.ts:1–2只导client/request-key，现isomorphic依赖链无local-token/nodeFS/file-store引用。package exports原node隔离没更改，Node模块无CLI/sqlite依赖，没有import时文件/网络调用。
- tests/contracts/m4-node-credentials.test.ts NC01/02分别核Node-only出口及E两参映射/冲突/missingfile；NC03真实built由C负责，本审查不把源码检查替代包出口built证据。
- docs04 M4.2-A、docs06、ADR049/examples/mcp-bridge与CLI指南只声明共享Node/桥env两source、不新增flag/browserFS，startup/discovery零HTTP/no session/no ACK、16KiBtext完整structured包装与有界close，不声称四宿主或schema/preflight后包已实现。建议0600/祖先alias与同UID边界、selected失败nofallback与0匿名均一致。

没有把MCP默认timeout60000或close失败当业务撤销保证。本文仅本包共享凭据提取/CLI兼容有限结论；完整bridge生命周期/真实stdio仍由C独验，所有产品/tests/docs保持freeze。
