# M7.1-A 内部检查回执闭环与 schema6 维护任务候选

status: root_decisions_transcribed_pending_c2b_seal_m7_fresh_dispatch

仅 planning；本候选不授予产品写入或运行权限。C2B metadata/seal、M7 fresh 与 root dispatch 后才准实施。A 领域/协议/鉴权/日志/评审事实，B SQLite/生成结构/维护/迁移，D 独立回归与唯一串行运行窗。Web/browser、既有封存与旧三组历史 fixtures 保护。无需模型、VM、宿主、任意帖子执行、安装、全局配置或推送。

## 功能范围与持久模型

本包实现内部 domain 闭环，不新增 checks HTTP/CLI/tool；M7.1-B 才接公开传输，之后 M7.2/D01。后端 WebSessionService 阻止受限凭据换普通会话属于鉴权修复，无前端工作。

schema6 四类正式表：check_runs、check_run_versions、check_receipts、check_run_credentials，不加第五类。run 固定 request_id/snapshot_id/check_name/verifier_actor_id/config hash；attempt 按(request,check_name)单调递增。version history 重建创建/receipt/invalidate过去状态；状态/event/幂等同事务。receipt每run唯一、receipt_id全局唯一，客户端ASCII[A-Za-z0-9._:-]非空≤128；跨run冲突不泄漏其他run/space；receipt不可变。

create输入 request_id+snapshot_id+check_name+verifier_id+expected_request_version，两ID严格绑定，不能snapshot反查猜request。仅 collecting/revealed 且当前材料/政策、profile允许active actor创建。事务推进request.version，保持phase/count、reason=null；run持久记录创建前request version供并发审计，不作为未来receipt/finalize身份。绑定固定request/snapshot/config。创建run/history、request新版、event、幂等同事务。选择最大attempt，终态request不创建新run；重评新round。receipt/invalidate只推进run.version，保现终态request/decision约束。

## 受限鉴权与日志

credentials增加stored capability verify；只能['verify']、exact单space、非null expiry，并有immutable credential→run绑定。一般CreateCredentialRequest仍只read/write/admin，不得签verify。内部专用签发仅当前maintainer/owner且具read/write；verifier来自固定run，不由caller任填。ttl默认3600、60..86400；同run新签撤旧run token，不动actor其他token，明文只返回一次、存hash，无幂等自动重试。混caps、缺失/矛盾绑定fail closed，前缀不作安全机制。

Auth刷新绑定/expiry/revoke/actor；verify expiry<=now拒绝，普通凭据时间契约不变。verify禁止普通space/list/me/post/search/poll/export/admin/private-review/Websession；generic空间权限先拒verify，GET spaces/getMe等绕过requireSpaceAccess的业务路径补共享core门禁（必要仅spaces路由接点）。不靠membership赋普通read/write，不因同actor而看本人sealed。指定run授权仅metadata、固定snapshot与manifest明确纳入的固定post/公共artifact、run日志、自己的receipt。

ArtifactService复用bounded stream/stage/hash/publish/配额/当前授权/幂等/cleanup，新增run专用authorize/create/read；visibility=space，server设check_run_id和owner，client不填绑定。仅pending+active request新upload/newreceipt；读取/原key重放按当前scope/privacy，不强求pending。receipt日志必须同space/run/verifier且新流程登记ready。unused日志不是receipt。普通ArtifactMetadata不必扩，来源核持久record。固定snapshot/config/实际身份逐次核；红删不能借manifest重放泄漏。

## 回执、聚合与历史

receipt完善现字段：observed hashes64小写hex且精确匹配；pass/fail/error；environment/tools版本、execution_steps、started_at/finished_at有界明确schema。时间有效ISO、start<=finish，不证明可信时钟。pass exit_code0，fail/error不推断算法真假。同receipt_id同原内容返回原结果、不同冲突；run只终结一次，重跑newattempt。新receipt需pending、request active、当前授权/材料；同key/同receipt重放先当前授权/privacy，再重建历史，不因run terminal误拒。状态pending→pass/fail/error；maintainer显式invalidate任何run，留reason/version/history/receipt，可操作终态request的run，原decision不改。

字段限长尚待root确认：现SubmitCheckReceipt environment是无max的非空string，execution_steps同样；不存在tools或started/finished字段，也无已实现结构化环境类型。作者不得自选限长。建议root直接指定这些字段类型及codepoint/byte预算后补task，再fresh。

required frozen checks取每name最大attempt：空→not_required，否则failed优先、再error、再pending，全pass才passed；invalidated作pending且current_validity报check_invalidated。revoke/expiry/disabled actor只阻新操作，不自动否定历史receipt，撤信必须显式invalidate。

finalize保负评优先与OPEN_OBJECTIONS等既有错误优先；allaccept且checks pending/error/invalidated→REVIEW_INCOMPLETE，fail→changes_requested，全pass→accepted。accepted按冻结required顺序保存全部pass receipt IDs；由checkfail得changes_requested保存当时最新failed IDs；原负评决定时[]。intrinsic历史核immutable receipt/run-version及snapshot/config，不因后来invalidate/log红删把决定视结构坏；当前privacy/有效性分层。core status/knowledge与module共享聚合。

current_validity加check_invalidated/check_log_redacted/check_log_unavailable于invalidated理由组，原12相对次序不变、最多15；只查当前required latest及历史decision引用的真实checks。unused日志不影响；metadata日志状态不声称当场磁盘全hash。历史pass保事实、当前invalidated明确；不得泄漏sealed/私有验证数据。

## schema6与维护

schema5→6仅显式离线复制升级；canonical SQL/生成DDL/结构profiles同步，冻结V5来源，bootstrap/backup/restore/offline-upgrade/logical header版本一起更新。物理保正式历史，restore撤credentials/换secret/newadmin，旧verify失效但历史receipt不自动否定。logical formal仍excluded，不扩family；header6兼容/import新6，公开artifact日志不重建可信receipt。

D必须在M7 fresh后、任何产品/schema改写前，以当前已接受built runtime短流程生成真实schema5来源fixture，归档脱密/来源/可重复配方；不用新代码伪造旧来源，不改旧三组fixtures，不触VM/任意旧库。此步骤是写入实施前的时序门禁，由root/D落实。

## 验收与交付

真实SQLite、鉴权、stream：scope越权矩阵、expiry/revoke/rotation、普通路径保护；并发run requestversion/attempt；receipt hash/log来源/冲突/回滚/重启重放；最新覆盖旧pass、error/fail；invalidate/history/privacy；真实5→6备份/恢复/失败原子性。D唯一串行窗口，精确fresh、作者sourcefreeze、交叉审查后门禁。受控契约与真实DB证据分清，未运行不得宣称通过。

所有权JSON只是候选；existing已静态确认，new必须missing且不得创建占位。真实冲突报root，不自主扩线。

## 已核具体实现接点 / 待根确认

- CredentialCapabilitySchema当前被protocol/admin.ts::CreateCredentialRequestSchema直接复用；加入stored verify必须分离通用签发allowlist，并在core/admin-service.ts::createCredential内部防绕过，因此两文件列A候选。不能只改actors.ts让通用接口意外接受verify。
- /spaces列表当前routes/spaces.ts直接storage.listVisibleSpaces，不调用requireSpaceAccess；已列唯一必要route候选，只调用新增core门禁，不实现checks HTTP。
- environment现为string非空无上限，execution_steps同样；tools版本形状和长度、environment长度、steps长度与时间schema具体格式待root确认。没有现成环境对象可直接沿用。
