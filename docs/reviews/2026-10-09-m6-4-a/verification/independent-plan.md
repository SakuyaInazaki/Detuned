# M6.4-A 独立HTTP验收计划（未运行）

仅一个正式文件 `tests/contracts/m6-review-http-independent.test.ts`，六旅程。私有owned WAL SQLite、实际Fastify HTTP socket与共享client，普通human requester、两个独立group reviewer（observer+write）、reader和真实bootstrap admin对照。合成研究种子明确来自真实PostService与StoragePort fixture，session在request后通过实际HTTP创建。使用短小私有bytes，不持久凭据；异常只记safe code/status和固定检查点。

- H01：真实双reviewer完整12入口与private上传→本人sealed/未提交者list[]→全员揭示→immutable决定/status→原写key重放，DB集合无二次副作用与ACK不推进。
- H02：当前ACL/crossspace/匿名/只读/真实admin也不能看别人sealed；strict body/query/forgedscope零副作用。同origin NodeHTTP cookie+CSRF正反及review所有成功/错误private,no-store；不声称浏览器Cookie执行。
- H03：revealed cancel依revealed_at仍可读，sealed cancel/stale不揭示。cited私有bytes真实SHA下载，unused对reader隐藏；红删后metadata/材料隐私拒绝，但status安全可读。
- H04：真实stale/incomplete/version/required_checks及当前权限优先，旧key不绕撤权；不同错误不假passed/不产生半状态。
- H05：真实chunked multipart socket，窄BlobStore stage观测barrier只证明真实HTTP读取开始；然后实际membership撤权或PostService材料revision，末事务拒绝并核artifact/events/key/物理stage无增。另abort与关闭drain/finally，全过程没有伪造数据响应或降低默认retry；同key合法历史retry仍单份。
- H06：真实合法服务响应正对照，再独立loopback controlled transport分别修改ID/parent/date/unknownfield与1MiB超限及取消。明确是故障传输，不冒后端坏stored数据；固定安全clienterror，不执行模型或任意外链。

A/B写源全停并freeze后，D核before和仅server module workspace link必要接线（不install）：新增测试源noEmit检查exit→依赖串行build→新作者+独立旅程单worker/file串行首跑→根裁修后仅受影响复验→最终type/lint+完整core/current25一次。原timeout/assertions保持。current25沿封存M6.3版本，不未经root改其OpenAPI/domain断言。每次日志唯一label，失败与资源receipt保留；DDL/JCS/Hasher/旧9715/外部pins守恒。
