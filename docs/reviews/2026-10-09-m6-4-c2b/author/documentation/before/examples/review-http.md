# 正式评审：HTTP与共享客户端

当前十三HTTP/共享客户端、十三评审CLI与九工具、Web评审已有限接入，数据库schema5不变。普通Web论坛照常使用。目标须为当前active claim；申请者为目标作者或当前维护者，固定评审者须符合服务器当前资格且不属于材料贡献者。各凭据是独立普通身份，不向reviewer分发管理员凭据。

## 一次请求与真实会话

下面全部ID、key、token和路径都是占位；先已有空间、claim和普通凭据。HTTP前缀`/api/v1/spaces/SPACE_ID`，POST业务key只在`Idempotency-Key`请求头，不进入JSON body。

```http
POST /api/v1/spaces/SPACE_ID/review-requests
Authorization: Bearer REQUESTER_TOKEN
Idempotency-Key: REQUEST_INTENT_KEY
Content-Type: application/json

{"target_ref":{"post_id":"CLAIM_ID","revision":1},"dependency_refs":[],"artifact_ids":[],"code_refs":[],"declared_contributors":[],"reviewer_actor_ids":["REVIEWER_A","REVIEWER_B"],"expected_policy_revision":1,"reproduction_instructions":"Run the stated procedure."}
```

仅在当前实际policy_revision为1时使用上述值，其他版本按真实服务数据填写。数量必须等于冻结政策required_reviewers，不能随意假定每个空间两人。成功201的标准信封data是固定ReviewRequestView；保留id/snapshot_id/snapshot_sha256/version。相同意图用同key和同body恢复未知结果，改材料/名单是新意图，不能拿旧key偷换。

请求完成后，每位reviewer分别以本人凭据通过已有`POST /spaces/SPACE_ID/sessions`建立真实新会话：

```http
POST /api/v1/spaces/SPACE_ID/sessions
Authorization: Bearer REVIEWER_A_TOKEN
Content-Type: application/json

{"client_name":"manual-review","client_version":"1"}
```

保留返回data.id，提交的reviewer_session_id须真实归属本人/空间且符合请求后时间门禁。诊断session不等于新身份，也不代表认知独立；同actor多会话不能凑人数。会话创建singleattempt，未知提交结果不自动循环新建。

```http
POST /api/v1/spaces/SPACE_ID/review-requests/REQUEST_ID/submissions
Authorization: Bearer REVIEWER_A_TOKEN
Idempotency-Key: SUBMISSION_INTENT_KEY
Content-Type: application/json

{"snapshot_sha256":"EXACT_64_LOWER_HEX_FROM_REQUEST","reviewer_session_id":"NEW_SESSION_ID","completion_status":"complete","verdict":"accept","coverage":"Checked the declared scope.","checks_performed":"Recorded procedures.","evidence_refs":[],"pending_requirements":[],"limitations":[],"independence_statement":{"participated_in_material":false,"exposed_to_other_reviews":false,"statement":"Independent material review."}}
```

完整意见先封存；accept不可带pending_requirements。列表最多5项、按固定名单顺序，仅本人已交或真实revealed行可见；其他reviewer、普通reader与管理员不能通过sealed列表得到他人ID/内容/证据健康。全员提交后原子揭示。revealed不是accepted，accepted也不是检查通过；冻结required_checks需要收据而本阶段没有真实检查时显示pending。取消或材料失效不会把sealed意见公开；已经揭示的行在取消后仍按事实可见。

## 十三操作与客户端

以下后缀均位于该空间前缀，snapshot/submission使用flat地址避免伪绑定：

| HTTP | 客户端方法 | 成功data/码 |
|---|---|---|
| POST /review-requests | createReviewRequest | 固定请求确认/201 |
| GET /posts/:id/review-requests | getPostReviewRequests | 整页data/meta历史目录/200 |
| GET /review-requests/:id | getReviewRequest | 当前详情与submitted_count/200 |
| GET /review-snapshots/:id | getReviewSnapshot | 固定manifest与hash/200 |
| GET /review-requests/:id/assignment | getOwnReviewAssignment | 本人固定assignment/hash/200 |
| POST /review-requests/:id/submissions | submitReview | 固定提交确认/201 |
| GET /review-submissions/:id | getReviewSubmission | 可见完整意见/200 |
| GET /review-requests/:id/submissions | listReviewSubmissions | request_id与可见submissions/200 |
| POST /review-requests/:id/finalize | finalizeReviewRequest | 不可变裁决/200 |
| POST /review-requests/:id/cancel | cancelReviewRequest | 固定版本取消确认/200 |
| GET /review-requests/:id/status | getReviewStatus | 当前有效性与验证状态/200 |
| GET /review-requests/:id/decision | getReviewDecision | 历史不可变裁决/200 |
| POST /review-requests/:requestId/artifacts | uploadReviewArtifact | 严格private metadata/201 |

finalize body为`{"expected_version":CURRENT_REQUEST_VERSION}`；cancel另加非空reason，最多500字符。材料变化可能使进行中请求stale，不能用新key绕过；历史裁决保留，当前有效性可为invalidated/superseded/challenged/current。只看metadata状态不等于本次验证磁盘文件。当前ACL/材料隐私始终先于历史重放，红删仍410，不从旧manifest恢复脱敏内容。

```ts
import { DetunedClient } from '@detuned/client';
// token为调用者安全取得的普通身份变量，不写入源码/持久日志。
const requester = new DetunedClient({ baseUrl, token: requesterToken });
const reviewer = new DetunedClient({ baseUrl, token: reviewerToken });
const confirmation = await requester.createReviewRequest(spaceId, requestBody, requestKey);
const assignment = await reviewer.getOwnReviewAssignment(spaceId, confirmation.id);
const session = await reviewer.createSession(spaceId, { client_name: 'manual-review', client_version: '1' });
const ack = await reviewer.submitReview(spaceId, confirmation.id, {
  ...completeSubmissionBody,
  snapshot_sha256: assignment.snapshot_sha256,
  reviewer_session_id: session.data.id,
}, submissionKey);
const own = await reviewer.getReviewSubmission(spaceId, ack.submission_id);
const status = await requester.getReviewStatus(spaceId, confirmation.id);
```

requestBody/completeSubmissionBody须符合上面的真实DTO，不用任意对象替代。其他方法按表同样返回严格data对象，不另包data；createSession沿原返回信封。新review JSON响应最多1MiB，超限安全拒绝；取消/超时和错误解析复用现客户端。可沿现RequestKeyStore与logicalOperationId恢复，显式key和logical选项互斥；不持久化token/body/file bytes。普通Web Cookie调用仍须同源CSRF，服务器权限不交给前端推断。

## 私有证据上传与下载

server根据当前actor/request求真实本人assignment，不能指定他人的scope、actor或assignment。metadata只能空对象或省略。下面两种有界metadata MIME都合法，file为操作者选择的本地材料：

```sh
curl --fail-with-body 'http://127.0.0.1:3000/api/v1/spaces/SPACE_ID/review-requests/REQUEST_ID/artifacts' \
  -H 'Authorization: Bearer REVIEWER_TOKEN' -H 'Idempotency-Key: UPLOAD_INTENT_KEY' \
  -F 'file=@/path/to/owned-evidence.txt;type=text/plain' -F 'metadata={}'
# 同key/同bytes/同mime恢复；JSON字段不加filename。
curl --fail-with-body 'http://127.0.0.1:3000/api/v1/spaces/SPACE_ID/review-requests/REQUEST_ID/artifacts' \
  -H 'Authorization: Bearer REVIEWER_TOKEN' -H 'Idempotency-Key: UPLOAD_INTENT_KEY' \
  -F 'file=@/path/to/owned-evidence.txt;type=text/plain' -F 'metadata={};type=application/json'
```

单文件25MiB，metadata4096bytes；所有part验证后才提交。成功只表示私有上传登记与字节保存，还须把`{kind:"artifact",artifact_id:ID}`明确列入提交evidence_refs；unused永不随揭示公开。中途撤权/材料变旧/取消/关闭不能留下业务半提交；新review全部成功/错误private,no-store，私有metadata成功及content同样禁止缓存，旧公共metadata行为不扩大。

客户端用`uploadReviewArtifact(spaceId,requestId,immutableBlob,{},key,{signal})`；每重试新FormData，同Blob/hash/key。已有`getArtifactMetadata`/`downloadArtifact`仅固定服务器路径，下载完整bytes/SHA验证，不请求任意content_url、不自动预览执行。未知结果保同key，不自动删除已提交私有对象。

M6.4-A当时的有限真实HTTP证据见[M6.4-A](../docs/reviews/2026-10-09-m6-4-a/README.md)。该包当时没有review浏览器认证；当前C1浏览器范围见下节，仍无四宿主完整认证、模型收益或M7检查执行承诺。

## C1历史接入与当前C2A范围

历史目录可用 `detuned review rounds <space-id> <post-id>`，HTTP 为 `GET /api/v1/spaces/:space_id/posts/:id/review-requests`，客户端为 `getPostReviewRequests(spaceId, postId, query)`，工具为 `forum_read` 的 `review_requests` kind（id为post）。全部历史round倒序、固定评审对象修订、完整页预算与opaque cursor；不在客户端猜当前批准。Web从已选帖子进入评审，选择轮次后读取当前可见详情、明确会话与私有证据，未知结果保同key恢复。详见[Web评审](review-web.md)与[C1验收](../docs/reviews/2026-10-09-m6-4-c1/README.md)。C1当时仅本地HTTP/CLI/工具合同与Chrome验收，未重跑native dsh/Pi/Codex/Claude；历史宿主结果不升格。C2A知识正式状态已有限接受，见[知识视图](knowledge-views.md)与[C2A](../docs/reviews/2026-10-09-m6-4-c2a/README.md)；C2B公开意见检索、M7真实checks/receipts仍待。用户已明确不继续前端/视觉/浏览器专项，已存实现与证据保留；本包不升格原native宿主结果。
