# M2.1 Unit A：冻结交付

已实现core/protocol/storage与合同/ADR；未改变SQL、schema profile、迁移、archive或旧探针。

- BlobStorePort/ArtifactService已按approved-contract固定接口。当前权限流前/事务内reload；FS发布后短DB事务，ready/event/typed幂等共同提交，冲突/失败/重放清本次文件；publish失败不拥有key、不会删除existing对象。
- typed artifact.create接入operation/ref whitelist、持久precheck、结构/作用域验证、编码和重建；旧11族保持原分支。redacted/missing不破坏typed持久合法性，重放当前状态/权限/物理存在决定410/404。
- 同步SQL接口sum全部状态quota、live storage keys、revision_artifacts写入；帖子/初始帖子/修订事务校验和关联，互异ids/structured evidence包含规则落core与protocol schema。
- 35操作真实multipart OpenAPI，无伪JSON requestBody；公共DTO无key/原名。当前C01硬编码改实际全集与JSON body结构，G01仅补缺失的JSON可选链以兼容multipart。历史probe不改。
- docs03/04/07与ADR023同步；approved-contract自洽，草案单独保留。

定向结果：`pnpm exec vitest run tests/integration/m2-artifacts-core.test.ts tests/contracts/r4-c-route-contracts.test.ts` 13/13；core新测试9（A07三参数）与G014。`pnpm exec vitest run tests/contracts/r4-c-contracts.test.ts` 26/26（sandbox本地listen EPERM后经允许127.0.0.1重跑）。source paths临时配置tsc检查protocol/core/storage exit0；未build，未全29、未全suite；这些留统一验证。stdout/stderr分列于此目录。受控Blob port用于业务所有权/事务测试，真实FS durability/HTTP multipart/binary/CLI由Unit B验证，不能把本结果称真实FS验证或独立验收。

代表证据：quota含ready/redacted/missing；event触发器失败无partialDB；publish期间credential/actor/expiry/membership变更拒绝commit；redact→DB重开协调→旧key410；missing文件404无DB状态修改；多余文件清理、不同key计费、冲突及碰撞；三种帖子写关联及非法引用回滚。

冻结后无继续源码/测试/文档写入计划，等待父Agent统一验收。下一阶段不由本Agent自行启动。
