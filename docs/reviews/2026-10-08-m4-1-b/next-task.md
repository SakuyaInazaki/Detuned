# 下一任务 M4.1-C：既有管理写 client 与 CLI

父已选定以下范围；fresh基线与精确所有权冻结后实施。本任务书不表示功能已经交付，不改本包产品冻结或当前状态入口。

## 七项既有业务

同包提供 typed client 与CLI：actor create、credential create/revoke、membership create/patch/deactivate、redact；复用现HTTP业务与服务端授权，不加服务API、session或space写。

六AdminService操作无服务幂等：同request executor私有retryBudget=0，所有transport、body、HTTP重试分支一致单attempt，不改旧默认；不支持持久key，不伪造可恢复重放。失响应不保证未提交，尤其credential创建可能已经保存hash但明文未交付，不能盲重试找回token。只在指南说明结果未知，不修改全局错误类/code/message或退出映射。

redaction沿现必需key、授权和payload摘要。父选择持久scope admin.redaction、space必填、target=null：这是新redaction记录创建；同space/op/logicalId修改target/type/reason仍用同key，由服务端409。正文不入store，不新增target512字符JSON限制；每次有意不同操作使用新logicalId。

## CLI 冻结名称

```text
actor create --input JSONFILE
credential create --input JSONFILE
credential revoke <credential-id>
membership create <space-id> --input JSONFILE
membership patch <space-id> <actor-id> --input JSONFILE
membership deactivate <space-id> <actor-id>
redact <space-id> --input JSONFILE [--request-key KEY 或 --request-key-dir DIR --logical-operation-id ID]
```

input沿现stdin读取方式，省略按冻结要求从stdin读；全部成功输出data。credential唯一明文只在成功stdout输出一次，日志、测试归档和持久key不存secret；不自动给普通Agent admin，示例用read/write与指定空间。全局Commander parser、token-file flag及无关旧命令不改。

## 契约补齐与验收

protocol新增现wire四data schemas/Static：CreateCredentialDataSchema/Data、RevokeCredentialDataSchema/Data、DeactivateMembershipDataSchema/Data、RedactionResultSchema/Result。七项OpenAPI成功response用已有真实data包装现envelope，Actor/Membership复用原schema，不用含token_hash的CredentialSchema。属于规范缺口补齐，SQL和业务返回不变；生成工件准确路径由A下一轮查，不新建日期框架。

真实验收覆盖：ordinary拒绝、admin/owner允许；新凭据实际可用、撤销后401；成员权限变更实际生效；redaction重放/冲突/权限；六项遭断流、timeout或retryableHTTP均不自动第二attempt；成功token仅私有内存处理，归档/日志不含secret。C统一build、门禁、兼容探针与独验，作者有限源码检查保真实失败。

A负责client/protocol，B CLI/指南，C独验；精确文件owner待fresh开工消息。附件本包freeze保持，无发布、推送、模型、全局配置、额外服务业务或提前当前文档同步。
