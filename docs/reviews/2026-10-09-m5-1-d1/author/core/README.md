# M5.1-D.1 A：有界目录实现

七文件源码冻结见 [manifest](freeze-manifest.json)。PostCatalogReadService 提供 getRevisions/getArtifacts；两路由复用同步 readSnapshot 当前授权、独立签名域、完整 UTF8 信封预算及原 exp。SQLite 窄投影不读修订正文，附件过滤同space/public后才映射；redacted 在SQL中用CASE隔离旧材料字段并只输出id/state。旧全修订端点未改。

新StoragePort：getPostRevisionMetadata(postId,revision)，listPostRevisionMetadata(postId,limit,afterRevision?)，listRevisionArtifactMetadata(spaceId,postId,revision,limit,afterId?)；后两项最多limit+1候选并返回has_more。现主键用于键集，无DDL/迁移/新依赖。登记状态不证明文件存在或字节真实核验。

## 实际检查

- 首作者源码定向：`node node_modules/vitest/vitest.mjs run tests/contracts/m5-post-catalogs.test.ts`，exit0，5/5，918ms总时长。见 [stdout](source-first.stdout)、[stderr](source-first.stderr)、[exit](source-first.exit-code)。PC01大正文不调用旧读取+旧端点兼容；PC02过滤/墓碑/missing30MB与历史purpose；PC03 UTF8裁剪继续/数量/单项失败；PC04签名域/actor/post/revision/原TTL与当前撤凭据；PC05存在性/非法query/脱敏410。
- 包含新test与源别名的noEmit：`node node_modules/typescript/bin/tsc -p docs/reviews/2026-10-09-m5-1-d1/author/core/source-tsconfig.json --noEmit`，exit0。见 [stdout](noemit-first.stdout)、[stderr](noemit-first.stderr)、[exit](noemit-first.exit-code)。

作者未运行build/fullsuite/current probes，不自报根验收；统一门禁及独立成员撤权等由D执行。无模型、安装、Web/CLI/MCP或SQL改动。当前目录是每页动态snapshot，不保证跨页冻结，也不是全目录文件检查/硬CPU预算。
