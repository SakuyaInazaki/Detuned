# M6.2-A A：初始源码冻结

实现严格提交 DTO、固定 assignment ID/count、内部 sealed submission 服务、原子最后揭示、typed compact 及私有附件读 union。原基础 create/cancel 确认和历史重放不增加 count；当前 ReadView 增加 count，并在 collecting/count>0 时遮蔽 changed_by。

新服务构造：`ReviewSubmissionService(storage,authService,idempotency,clock,idGen)`；`getOwnAssignment(auth,spaceId,requestId)`、`submit(auth,spaceId,requestId,body,key)`、`getSubmission(auth,spaceId,submissionId)`。未增加公开路由/工具广告。维护 intrinsic void 校验与在线 ACL/privacy 分离；末位提交检查所有之前 evidence 的当前保密性与附件 ready，再同事务更新版本、计数、揭示时间、事件和幂等记录。

作者正式文件新 RS01–05 五组；旧 RR 两处当前读详情预期仅增加 submitted_count，历史 replay deepEqual 保持。A 未运行测试、构建、类型或 lint 检查；D 为唯一执行窗口。本冻结是实现交接，不是已验证/验收结论。

`review.submission.create:<requestId>` compact v1 绑定 submission/assignment/request/version/snapshot/hash；确认不含 payload 或未来 revealed_at。`artifact.review.create:<assignmentId>` compact v1 绑定 artifact/assignment，旧 artifact.create/upload metadata 保持严格 space。私有材料读取仍须独立当前 ACL 与 own-or-revealed；内部证据 void 不成为读取授权。

B-owned SQL/维护/附件/client 尚需其独立冻结；A 不修改这些源。没有安装、模型、VM/Colima、全局配置或推送操作。
