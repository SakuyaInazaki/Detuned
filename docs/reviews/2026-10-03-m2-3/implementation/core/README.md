# M2.3 Unit A core/storage交付证据

最终验收由父代理独立判定。单元范围：SearchService、新search-cursor helper、StoragePort搜索budget末参数、token-signer可选nowSeconds、SqliteStorage搜索；新tests/integration/m2-search.test.ts；docs03/ADR-026。没有DDL/schema/迁移、新依赖、旧正式测试/旧证据或历史hash管线变化。

## 行为与限制

- tags属性参数化JSON元素全部匹配，精确大小写，先过滤后页；q按Unicode码点分支，短LIKE补tags text元素，仍转义字面符号，长FTSphrase保留标题snippet。
- 正常SearchService显式注入已有signer/secret/clock/hasher。标准HMAC payload只绑定query SHA256、actor/space、ID DESC位置、sort/purpose/v/24h；不复制原q/filters。所有cursor错误统一400，旧裸ID重取第一页；当前授权先核。getView不需signer/新增budget。
- ID DESC不是时间/相关性或跨页读快照。非ASCII大小写保留SQLite短LIKE/长trigram不同规则，无新fold/tokenizer/NFC。
- 同deferred读事务检查短LIKE完整属性候选/长FTS匹配候选，超限422 QUERY_TOO_BROAD；items JSON UTF8预算单独检查。不是SQL VM/CPU/envelope硬限，大空间短词可能需缩条件。不会只扫前N后伪称无结果。
- 逻辑query规范化/纯payload guard和共享限额由协议单元B提供，core不引入TypeBox直接依赖、不复制长度表。

## before证据

- before.log：实际产品storage2/2失败，tags未过滤、emoji两码点误入MATCH。
- storage-after.log：修标签/码点/短tag匹配后2/2通过。
- service-before.log：新增绑定cursor/预算反例2失败（原storage2已通过），未伪造成正式错误码/签名成功。
- planning/sqlite-mechanisms.cjs/json：官方说明配套内存SQLite机制实验，非产品测试；Node26.3.0/SQLite3.53.4。最终定向结果另列，未测Node22/真实宿主/模型/10万基准/干净安装。

新正式S01–S09：标签全部精确/大小写/逗号/去重；中文emoji字面符号短标签；签名键集变页大小、q/tags/thread绑定及裸ID；候选/响应超限与缩条件；篡改/错用途/过期/actor-space/额外key、授权先行；修订/撤回/脱敏两分支；组合过滤先页与FTS预算；clock注入兼容、Unicode case限制；129/256/257 emoji码点边界。

本单元未跑全workspace build/test或完整29；protocol构建由B独占，最终统一构建/独立验收由父协调。运行日志保留原失败，不把机制实验当产品验证。

## 最终定向验证与冻结

A源码/正式测试/docs03/ADR与交付证据已冻结，等待父独立验收。

- `targeted.log` 首次联合37项35通过/2失败：预算throw漏导入DetunedError/ErrorCode（storage-typecheck.log也准确捕获），随后补导入；保留原失败，未放宽反例。
- `final-targeted.log`：`pnpm exec vitest run tests/integration/m2-search.test.ts tests/integration/m2-knowledge-views.test.ts tests/integration/m2-typed-writes.test.ts tests/integration/m2-artifacts-core.test.ts`，4文件37/37（9+7+12+9）通过。
- `final-core-typecheck.log` 与 `final-storage-typecheck.log`：对应包`typecheck`均通过。
- cursor最终错误文本复用B的SEARCH_CURSOR_ERROR_MESSAGE：“搜索游标无效，请去掉 cursor 重新获取第一页。”；core不复制协议长度/错误表。

正常app组合根由B显式注入。A未构建core/storage dist、未运行全suite/29命令；protocol独占构建由B完成。真实宿主/Node22/10万基准未测，未更改旧正式测试或probe。
