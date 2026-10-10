# M6.1-B 正式状态输入：仅现有契约事实

本记录只读直接接点，未实现/测试下一阶段、未裁DDL/迁移/权限策略。M6.1-A源保持冻结；不操作Colima/Docker VM或新增后台环境。

## 专用对象与future DTO

- docs/03-data-model.md:129–140 规划 snapshots(id,space_id,manifest_json,manifest_sha256,policy_revision,target_ref,created_by)、snapshot_items(snapshot_id,item_type/id/revision/hash)、review_requests(id,snapshot_id,round,phase,version,invalidation_reason)。现StoragePort没有这些对象CRUD；本包只是同步材料构造。
- 同表 review_assignments：request_id/reviewer_actor_id/reviewer_session_id/group_at_assignment/state；review_submissions：assignment_id/snapshot_sha256/completion_status/verdict/coverage/checks_performed/evidence_refs/pending_requirements/limitations/independence_statement/submitted_at。
- decisions：id/request_id/actor_id/snapshot_sha256/review_ids/check_receipt_ids/outcome/rationale/created_at。现protocol/review.ts没有assignment、request持久对象、decision响应DTO或上述对象的稳定版本接口；不能据phase枚举声称流程已实现。
- CreateReviewRequestSchema（本包冻结）已含材料refs/attachments/code/declared contributors/reviewer IDs/expected policy/复现说明；HTTP body无request_key，未广告ToolReviewRequestOpSchema复用其properties并外加space_id/request_key/op。
- CreateReviewSubmissionSchema为上述提交字段，不含assignment_id或request身份（未来路径身份尚无实际route）；completion允许complete/provisional，coverage/checks/independence只有minLength1；snapshot hash仅长度64。尚没有docs05的正式complete、accept需空pending、非空白/精确hash等业务判定。
- FinalizeReviewRequest只有optional expected_phase；CancelReviewRequest只有reason1..500。SubmitCheckReceipt已有receipt_id/observed snapshot与config SHA/result/environment/execution_steps/exit_code/logs_artifact_id；缺实际check run/receipt持久接口。
- docs05:33–35规定申请作者或maintainer、eligible成员名单及贡献排除；:47–61规定每assignment不可变初评、重复幂等、全部提交后同事务revealed；:75–84规定finalize同事务重读当前材料/成员/意见/检查/开放异议并追加decision。现模块不实现这些行为。

## 会话归属与有效性接点

- protocol/spaces.ts:95–115 Session含id/actor_id/space_id/client_name/version/harness_session_id nullable/metadata/created_at，没有active/expiry/revocation或review assignment字段。
- StoragePort:102–104已有createSession/findSessionById；sqlite-storage.ts:410–441查询只按ID返回真实actor/space/metadata。可核归属，但该查询本身不检查当前成员/凭据或声明独立性。
- core/space-service.ts:202–225以当前auth actor生成session，observer访问检查后写入；sessions不授予额外权限。现core源中没有其它findSessionById业务调用；现帖写工具不接受session_id，不能称逐帖审计绑定。
- docs03:144–146明确同actor换session不增加评审人数、independence_group是维护者设置，服务只能证明账号/排除/封存约束，外部认知隔离仍是声明。资格/有效性规则等待根冻结。

## 当前公共投影与封存缺口

- docs03:140明确封存submissions不进posts/FTS，附件assignment私有。现schema只有普通posts与artifacts两类；普通review/decision是informal文章，不是正式状态（:45–47）。不能把公开文章表改当封存存储。
- artifact-service.ts:27拒非space visibility的metadata/content为隐藏404；:49–52上传metadata仅支持visibility=space，拒assignment/check字段；:74创建review_assignment_id/check_run_id均null。现HTTP上传不能创建封存意见附件，未有assignment-owner可读私有接口。
- SQLite revision目录:708先同space且a.visibility='space'过滤。公共下载仍同一artifact服务门禁，无根据assignment身份开放读取。
- SQLite searchPosts:1391–1395从posts/current revisions或post_fts连接，限定空间与active；它没有正式submissions表或assignment ACL。context-service.ts:104用同search读取失败，其它固定公共post refs路径；不能据此声称未来封存输入自动安全。
- SQLite public event查询:1137限定e.visibility='public'；protocol/events.ts:17–29已预留review.requested/revealed/finalized/invalidated与review_assignment visibility，但没有本包真实review事件产生或私有事件消费门禁。
- space-export-snapshot.ts:12–17只posts/revisions及space可见artifact/association；docs03:219导出header formal_review/check not_enabled。封存对象目前不存在，不是已实现封存导出过滤证明。

## 明确待根决策的合同空位

持久request/assignment/submission/decision响应和版本/幂等域；assignment私有附件创建及owner读取；reviewer session归属/复用资格；宽松历史空间policy在正式申请处的unsupported flags错误；有效成员资格与eligible/group设置授权；revealed投影、计数脱密、失效与正式decision门禁。这里只列缺口，不规定策略或迁移路线，不改现宽松space政策写兼容。
