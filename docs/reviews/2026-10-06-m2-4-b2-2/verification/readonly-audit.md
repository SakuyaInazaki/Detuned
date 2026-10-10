# 只读 source 与保护清单审计

2026-10-06。核查最终冻结 v2 的实现路径，没有修改产品或正式 tests。

| 核查点 | 源依据 | 独立证据 |
| --- | --- | --- |
| cursor 空/空白/长度业务验证在 current ACL 与 thread binding 后 | packages/server/src/routes/threads.ts，packages/core/src/services/thread-posts-read-service.ts | 新 cursor-order-v2 probe 17 组合，真实 HTTP 无写 |
| 一次 readSnapshot 取得 current actor、thread、候选 post metadata，返回仅 metadata | core thread-posts-read-service | 首 WAL 双连接 barrier；v2 core 源 hash 不变 |
| storageHasMore 或 removed 都续页，after_id last 实际发送，limit/budget 不进 payload | core thread-posts-read-service | 两 storage next 分支静止 91 行无重漏；absent lower bound |
| 全 envelope UTF-8 bytes，实际 request_id；不够一项则 422 | protocol threads build/serialize/bytes + core trim loop | raw body 与 serializer；空/非空 4095 bytes 临界 |
| strict v1/thread_posts_read actor/space/thread/sort/after_id/exp；原 TTL 保留 | protocol threads payload validator + core signer | 非末页 clock 推进、budget 变化、等号/+1s、篡改字段 |
| schema 三 page 分支；stored metadata thread title 不套新 write validator | protocol threads metadata/page schemas | full page Value.Check、三 meta 分支、旧 stored fixture |
| 接入复用 HTTP client、旧 thread 未改业务读取合同 | client/CLI/protocol tools | actual Pi/MCP/CLI、旧 raw cursor、旧 default50 正例 |

独立脚本调用共享 serializer/signer 用于编码/解码对照，但业务预期与遍历/TTL/ACL/WAL assertions 自行编写，没有以开发者 test assertions 替代独验。

冻结保护核查见 [integrity.json](integrity.json)：v2 窗口 129 source/config/tests、36 currentdocs、5 mutable、2492 既有历史、4 SQL/archive、2 schema 全同。首基线→首 freeze 合法 delta 仅 8 改/3 新 source 与 docs03/04/12+新示例，见 [implementation-delta.json](implementation-delta.json)；v1→v2 只 route/contracts 两路径，见 [version-transition.json](version-transition.json)。无旧路径删除，无新增未归属 source，HEAD 基线不变。

构建实际 2 次。首基线 dist 208 tracked + 44 untracked；最终 208 + 48。基线→最终 27 tracked dist 改变、4 新 untracked thread-posts service 产物；第二构建相对其前 snapshot 仅 route 的 .js/.js.map/.d.ts.map 三产物改变，原 48 untracked 全同。来源见 [build-artifact-delta.json](build-artifact-delta.json)。不将产物变更算保护 source 改变，也不清理继承的 dirty 状态。

本轮 source 没有独立发现未解决产品问题。状态文档收尾尚待父授权其他单元；未来授权 mutable 文档更新需单列，不作为已测试产品变更。
