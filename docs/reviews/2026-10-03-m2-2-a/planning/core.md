# M2.2-A core事实与精确接口：待最终开工批准

只写规划；不改产品/测试/SQL/历史证据。本轮目标新写四类型统一结构与固定证据引用，知识视图留B包。

## 已核实顺序与兼容冲突

post-service.createPost:139、thread-service.createThread:135在executeIdempotent前validateStructuredContent；post-service.createRevision:329在action内、已查存储post.kind。三入口HTTP Fastify body schema均先于core；MCP/Pi实际工具参数验证也先于HTTP。若将四类严格new-write schema作为唯一wire/tool schema，已成功但旧版较宽payload原key重试会提前失败，不能仅把core验证移入action就宣布兼容。

executeIdempotent:2630先对原payload canonicalJson求hash，再同事务查existing；同keyhash一致直接reconstructResult，只有无existing才执行action。保持该管线/B历史证明不变，严格新增验证仅action内。HTTP/tool继续使用原兼容envelope（structured宽Record兜底）；协议同时公开唯一strict四类new-write schemas与纯parse，OpenAPI/tool目录明确新写语义与仅existing同actor/space/operation/key/hash才可旧payload重放的条件。不能用schema放宽来允许非法新写：core action强制strict定义+业务引用。不新增server/adapter重放绕过通道、不复制幂等判断。

父已裁决：当前FailureStructuredSchema.evidence_state:65显式必填，无default；不新建provided默认。旧成功遗漏的请求可同key重放，但不对旧stored结果补provided。所有请求hash保持原req，不在wire或hash前新增默认/修剪。新action结构副本也不新增默认或trim字段，仅validated clone保存（原内容字节保留）。现body/tags缺省已有行为保持，不因此改变历史hash。

## 当前字段/strict事实

protocol/posts.ts:42–80四schema additionalProperties:false：proposal/claim statement[1,5000]、assumptions元素≤1000（数组允许空）、scope[1,1000]、falsification_plan[1,2000]；failure attempt[1,2000]、category六枚举、assumptions元素≤1000、tested_scope[1,1000]、expected/observed/ruled_out[1,2000]、evidence_refs必需数组、evidence_state必需provided|unverified、optional evidence_missing_reason≤1000、not_ruled_out/retry_when必需数组且元素≤1000（允许空）；summary source_refs至少1。没有这些字段的default。

当前core proposal/claim还检查statement/scope/falsification_plan trim非空，故共享strict路径保留这些已定义非空约束；failure主要字段目前truthy校验，不能仅靠Type.String minLength声称已禁止所有空白。仅父明确unverified reason要求trim非空，不顺便禁止assumptions数组空或所有字符串空元素。未知structured键新写拒绝；不清洗/删除额外键来伪成功。

## 固定引用与当前读取权限

- PostRef={post_id:string(minLength1),revision:integer(min1)}；EvidenceRef={kind:'post',post_id,revision}|{kind:'artifact',artifact_id:string(minLength1)}；严格各branch未知键拒绝，不猜latest/字符串revision、不coerce。
- PostService.getPost:498先observer空间授权，findPost同space，再redacted410，再指定revision存在404。withdrawn仅保留历史仍可getPost，所以新证据引用其可读固定版合法；redacted拒绝新引用，但旧定位/墓碑不重写。
- posts无私有visibility；review kind是非正式public帖子，sealed review私有对象尚属M6，不可据kind名称推导私有读权限。artifact review_assignment即使同space在M2.1 reference helper中404；artifact ready/same-space/space visibility及artifact_ids包含/互异继续复用，redacted410/missing404。
- 当前read权限为有效actor/credential、credential允许space、active membership/或admin虚拟owner、observer门槛及read/admin；引用校验在同步action内refreshContext并requireSpaceAccess，不用不可信作者字段。crossspace引用统一404，不泄露另一space归属。M2.1附件引用只查DBstate，不在事务等待FS；物理missing由新metadata/download404，此包不改变该合同。

## 单一可落地接口合同建议

协议Agent独占protocol/posts.ts及相关wire/tool/OpenAPI：

```ts
export type NewTypedStructured =
  | Static<typeof ProposalClaimStructuredSchema>
  | Static<typeof FailureStructuredSchema>
  | Static<typeof SummaryStructuredSchema>;
export const NEW_TYPED_STRUCTURED_SCHEMAS: {
  proposal: typeof ProposalClaimStructuredSchema;
  claim: typeof ProposalClaimStructuredSchema;
  failure: typeof FailureStructuredSchema;
  summary: typeof SummaryStructuredSchema;
};
// pure structural validation from the shared schemas; no storage/ACL/no defaults.
// Non-target kinds return undefined and retain existing core behavior.
export function parseNewTypedStructured(
  kind: PostKind, structured: unknown
): NewTypedStructured | undefined;
```

parse对目标四kind schema缺字段/错误元素/长度/枚举/未知键抛DetunedError(VALIDATION_ERROR,400)，返回不变内容的克隆副本；非目标undefined。本函数直接复用TypeBox实际schema，不在core手写重复长度表。proposal/claim trim非空现行为、failure provided≥1/unverified非空reason可以由这个pure function一处表达，但只四类型新写调用。参数kind来自req（新帖）或存储post.kind（修订），不是让revision body提供kind。

core新增services/typed-write-validation.ts，独占：

```ts
export function validateNewTypedWrite(
  tx: StoragePort,
  authService: AuthService,
  auth: AuthenticatedContext,
  spaceId: string,
  kind: PostKind,
  structured: unknown,
  artifactIds: readonly string[] | undefined
): NewTypedStructured | undefined;
```

该函数先parse，非四kind返回undefined给原有validator；四kind收集summary.source_refs或failure.evidence_refs.post分支，刷新权限，逐固定revision检查，artifact分支复用M2.1规则（须artifactIds包含）。failure provided≥1合法引用，unverified reason非空，可带同样验证后的上下文引用。业务引用错误：当前不可见/不存在/错误revision/跨space/非space artifact 404 NOT_FOUND；授权后redacted410 CONTENT_REDACTED；结构/包含/重复字段400 VALIDATION_ERROR。proposal/claim目前无source/evidence字段，不擅自扩字段。

**三入口时序**：保留现有空间写授权（可用refreshContext）→原req入executeIdempotent/hash→existing路径直接旧重建+当前ACL/脱敏→仅新action查thread/post/存储kind、现并发门禁→调用validateNewTypedWrite→形成新局部structured副本→原写入/事件/ref/幂等共同事务。newpost/thread的现四类型prevalidate移入新action；non-target原有行为不强化，只保留原validate逻辑。title/body现有通用检查不新升级，与历史宽structured兼容无关。

structured副本用于新PostRevision.structured及该新修订content_hash；原req对象不改且request_hash始终原req，避免旧成功key哈希漂移。新字段已无default，只克隆保内容。已存旧revision/result_ref不用new validator重新编码，也不以新字段证明为启动条件。

## 最小文件与验收合同

core独占：新typed-write-validation.ts、post-service.ts/thread-service.ts，必要artifact-references.ts可提取纯assert部分（现helper会写关联，不能拿它当预检重复INSERT）；core/index.ts仅必要导出；新tests/integration/m2-typed-writes.test.ts。优先复用StoragePort/findPostById/getPostRevision/findArtifactById，不需SQL表或迁移。

协议Agent另独占四类schema/parser、tools/threads兼容接线、OpenAPI x-new-write政策与新protocol/HTTP/tool契约测试；共享函数名/错误/不注入默认应在父批准后冻结。adapter不复制业务。

正式先最小失败：initial failure坏category/缺evidence字段旧薄弱路径，三入口相同严格矩阵；四类型缺字段/错误元素/边界/未知键；provided空/假post ref/unverified缺reason；fixed旧版合法/newrevision不漂移/错误跨space版本/redacted证据；artifact继续现M2.1；非法写无thread/post/rev/关系/event/key残留。兼容夹具须先用旧合法路径成功保存宽structured与原hash，再升级校验后同raw req同key重放/重开协调，不靠修改stored hash凑通过；验证改变payload仍409，权限撤销/脱敏投影仍原政策。

新4类write严格语义可能使既有测试/probe中“新写旧宽failure”不再合法，不能改旧probe掩盖，父Agent取舍版本化补偿；旧成功重放仍需通过。本报告没有运行测试或修改产品。知识视图/summary来源更新/context默认事实、FTS、正式review等后包均不列A拒收项。
