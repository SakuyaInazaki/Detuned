# M6.2-A submission 独立静态源审

范围：A DTO/ports/Auth、request read view、submission service、intrinsic/compact replay、public event filter及作者正式测试；B产品保持v2冻结。没有执行测试、编译或反例。被读文件哈希见同目录 submission-source-review-manifest.json；A并行授权修复导致的hash差异明确记录，不能据本审查称运行通过。

## F01 — snapshot_sha256 非严格64字符（待root裁定）

packages/protocol/src/review.ts:57 使用 `^[0-9a-f]{64}$`，没有长度约束。ECMAScript `$` 可在终末换行之前匹配。因此合法快照hash后追加 `\n` 的提交正文能通过此字段的模式校验；modules/review/src/submission-service.ts:60 的DTO检查不能拒绝，:65 实际hash字符串比较会变为 SNAPSHOT_STALE 409，违反冻结的lowerhex64/非法输入400合同。ToolReviewSubmitOpSchema（tools.ts:202–208）直接复用同一properties，受同一边界影响。

最小反例建议：在RS04既有合法body的 snapshot_sha256 后追加换行，断言shared DTO/tool拒绝；真实服务同输入400且无状态/计量副作用。建议仅此字段增加 minLength/maxLength=64（保模式），由root指定A修复与D串行复验。未执行反例，不宣称已观察到409。

## 其余已读路径的有限结论

- request-service.ts:78–79 的current read单独加count，collecting且部分提交时changed_by=null；base写确认和旧compact重建不加count。cancel保存count但确认仍base形状。RS01严格比对create/submit历史确认。
- submission-service.ts:15–34先刷新凭据、observer+write，再固定assignment/snapshot保密性；fresh才重查真实active/eligible、human/agent、贡献者与当前强group。AuthService第四operation不改变旧省略时role推断，普通post contributor门槛没有在此放宽。
- submit:58–85为外层事务，actual session actor/space/时间/全库唯一查验，原assignment唯一和count校验；最后一份写入前逐已有submission检查post与artifact隐私及ready。head/version/submission/revealed_at/private event/public reveal/idem都在同事务。RS02/RS05覆盖作者设计的回滚与红删拒绝；这不是独立运行证据。
- getSubmission:88起current read门禁后，只本人或该份revealed_at已落可读取，未揭示管理员没有例外；之后intrinsic与snapshot/evidence privacy，不以后来资格/policy改写历史。取消不主动公开封存意见。
- review-submission-records.ts:8–45核assignment/request/session/version/snapshot/compact精确绑定；维护void出口不返回材料。idempotency-service.ts:2765–2785同key重建当前privacy并校真实reviewer/owner，fresh admission与资格不强塞进历史replay。
- event-service.ts:187/197只公共visibility投影；review.submitted使用review_assignment，公开review.revealed仅最终requestID/version。私有payload不进入该public投影。

非阻断待合同确认：getOwnAssignment调用fresh assignment检查（submission-service.ts:37–39），因此需要write及当前eligible；它不是稳定的纯read身份查询。若root要求read-only凭据仍可查本人固定assignment，需要明确收窄；本审查不自行改变该策略。

限制：没有验证SQL并发/实际回滚、全入口封存探测或正式维护矩阵；这些由D执行。未做任意数据库腐坏模型全审计。除上述F01外，本次所读路径没有新增可证明阻断。

## 2026-10-09 root disposition（保留上述首轮推测）

D实际 SD07 已反驳F01：schema、tool及native regex的三个末尾换行反例均拒绝，合法对照为true。见 [真实收据](sd07-first.json)、[stdout](sd07-first.stdout.txt)、[stderr](sd07-first.stderr.txt)。上述F01是静态推测，未复现，不是未解决缺陷；root裁定不修hash字段，本报告不再主张真实bug。

getOwnAssignment合同已由root明确：当前read权限的本人固定assignment可读，后来eligible=false、cancel或revealed不剥夺此只读访问；新submit/createForReview仍严格write+fresh资格。该项由D补真实反例、A待红证后修复；本审查没有修改源或执行检查，不能预填修复通过。
