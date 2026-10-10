# 下一任务：M5.1-D.1 有界修订与附件目录

根已冻结本任务的设计；当前M5.1-C已获父接受；实施在下一包 fresh baseline 后开工。本文是任务书，不是实现或验收声明。D.1 先交付两个只读 API，D.2 随后接入 Web 证据发现、修订目录及差异展示。事实依据：[后端缺口](planning/m5-1-d-backend-facts.md)、[现有契约](planning/m5-1-d-contract-facts.md)。

## 范围与响应

新增 `GET /api/v1/spaces/:space_id/posts/:id/revisions/catalog` 和 `GET /api/v1/spaces/:space_id/posts/:id/revisions/:revision/artifacts`。旧完整 `revisions` 端点保持原语义；无 DDL、迁移、新依赖、CLI 或 MCP 变动。

修订目录 data 为 `{post_id,current_revision,revisions:[{revision,editor_id,created_at,content_hash}]}`。存储查询仅投影这些元数据，不读取 title、summary、body、tags、structured 或 session。附件目录 data 为 `{ref:{post_id,revision},artifacts:[...]}`。

附件 ready/missing 项严格保留 `id,state,owner_id,sha256,bytes,mime,created_at,purpose`；bytes 为 `0..MAX_SAFE_INTEGER`，允许合法导入的超过 25MiB 声明，不套上传上限。purpose 保留原字符串，包括空值和自定义值。redacted 项严格为 `{id,state:'redacted'}`，不返回 purpose、owner、hash、bytes、mime 或 time。只展示同空间、visibility 为 space 的关联；跨空间或私有材料连 ID 和数量也不披露。不带 content_url、重复 space 字段、storage_key 或私有绑定。

ready/missing 是数据库登记状态，不证明实体文件存在、字节已核验或导入合成元数据是真实原件；下载继续沿既有固定路径和 FS 校验。

## 分页、预算与授权

两 query 均严格拒未知字段：limit 为 1..100/default20，max_bytes 为 4096..65536/default12288，cursor 最长4096。meta 沿 ThreadPosts 的 `truncated/next_cursor` 动态单页语义，不新增跨页固定快照承诺。

完整 wire UTF8 预算包含信封 api_version、request_id 和签名 cursor。读取 limit+1，裁剪后 cursor 指向最后实际输出项；单项仍装不下返回 422 QUERY_TOO_BROAD，其余非法 cursor 返回 400 VALIDATION_ERROR。修订目录 cursor purpose=`post_revisions_catalog`、排序=`revision_desc`；附件目录 purpose=`revision_artifacts`、排序=`artifact_id_asc`。两者绑定 actor/space/post，附件另绑定精确 revision；TTL86400，续页保留原 exp，不延长有效期。

每页在同步 readSnapshot 中刷新当前凭据/actor、检查 observer 空间权限及 post 所属空间和 lifecycle；redacted post 返回410。附件目录另检查精确 revision 存在。新增窄 `getPostRevisionMetadata` 或 exists port，不为存在性调用旧全正文 getPostRevision。旧权限、错误隐藏及脱敏边界保持服务端唯一规则。

## 所有权与实现边界

下一 fresh 后由根分配精确文件。A 负责 core/storage/server 的小目录服务、窄 SQL 投影及路由；B 负责 protocol 单源 schemas、OpenAPI、sharedclient 薄 wrapper 与必要 targeted guards；D 负责独立测试与统一验证。优先复用既有 readSnapshot、授权、签名 cursor 和信封预算实现，不创建通用框架。sharedclient 沿现取消、超时及有界响应方式，不复制业务规则。

必要验收：大 body 不进入目录；UTF8 全信封预算及数量分页；cursor 域隔离和当前 ACL 撤权；不存在固定 ref；跨空间/封存关联不披露；redacted 不泄旧元数据；missing 大于25MiB、空/自定义历史 purpose 保真；旧完整 revisions 端点兼容。独验使用真实 SQLite/HTTP，精确记录实际命令、首失败和适用检查，不预填通过。实现完成后同步契约、示例及新 ADR，根验收后再更新状态。

下一 D.2 才实现 Web 修订/证据发现、附件上传绑定及差异旅程；本包不以旧全正文列表冒充有界目录，不遗漏这些后续目标。其他 M5 待办见 [剩余页面与交付清单](planning/m5-remaining-pages.md)。
