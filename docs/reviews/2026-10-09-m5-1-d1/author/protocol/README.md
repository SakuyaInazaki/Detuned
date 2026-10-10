# M5.1-D.1 B：有界修订与附件目录客户端

协议新增严格目录查询、三个相关分页分支、用途隔离游标、完整成功信封和 UTF-8 字节计量函数。ready/missing 保留任意 purpose 与安全整数 bytes；redacted 仅 id/state。OpenAPI 复用单源 DTO，不改变旧完整修订或 ArtifactMetadata。

两个客户端方法复用既有 1 MiB 有界 JSON 路径，保 EOF、fatal UTF-8、取消、超时、重试、认证和浏览器会话传输；校验严格响应及请求 post_id/ref 一致性。旧 listPostRevisions 保持原路径。artifact-transfer.ts 仅将三个附件 JSON 诊断文案改为中性 JSON 文案。

响应格式检查仅内部派生实际 created_at 字段：修订 data.revisions[*].created_at；附件 data.artifacts[*].created_at（仅 ready/missing）。仅移除这两个已知位置的 date-time keyword 后 Value.Check 保其余完整结构，再用已锁定 full date-time 谓词逐项检查；无全局 registry、转换或输入变异。

作者 source 定向首跑 4/4，通过（56 ms）；测试使用受控 Response/分片流，不能冒称真实服务验收。包括严格 DTO/OpenAPI、跨页与传输、超限/非法 UTF-8/泄漏字段/错误 ref、挂起正文取消和超时、服务 422 与旧大正文兼容。

含新测试的 noEmit：首配置相对路径错误 exit 2；第二次仅测试 RequestCredentials 类型名缺失 exit 2；改为现 RequestInit 字段类型后第三次 exit 0。全部原日志保留，未跑 build/fullsuite/current29，交独验统一执行。

源码和新测试现停写，文件清单见 freeze-manifest.json。
