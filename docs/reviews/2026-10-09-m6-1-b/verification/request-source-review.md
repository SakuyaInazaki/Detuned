# M6.1-B A 请求服务相邻源审

审查者 B，2026-10-09。只读审查 A 首版10文件清单 `author/request/freeze-manifest.json`（SHA-256 `828093225ea415df322452e86305d21bf6090e62b8ea7347899b7edf1e259be0`）。没有运行作者测试、完整门禁或SQL反例，没有修改A/B源码。下列F01已经根代理裁为本包阻断并交A窄修；报告保留首版结论，修复关闭待新冻结版本。末尾hash检查时8个文件仍匹配首版，records helper与作者test已进入根授权F01修复写态，不能把本报告冒称修复版审查。

## F01：冻结名单的内在资格矛盾未被历史重建拒绝（阻断，待关闭）

首版 `packages/core/src/services/review-request-records.ts:97–100` 仅检查assignment的request_id、非空reviewer ID、group类型、人数与ID唯一性。未核名单与**冻结manifest.contributors**的排除约束，也未按**冻结manifest.review_policy.distinct_independence_groups**检查保存的group非空/唯一。相同规则在fresh创建 `modules/review/src/request-service.ts:52–57` 确已检查；丢失的是历史metadata的内在一致性校验，不应重查当前membership/eligibility/group。

最小私有SQL反例建议（未执行）：先用合法真实服务请求创建R，确保目标作者A在其manifest.contributors、两名reviewer R1/R2与A不同。执行 `UPDATE review_assignments SET reviewer_actor_id=:A WHERE request_id=:R AND reviewer_actor_id=:R1`。FK仍合法，固定人数/唯一性仍成立；首版 `getRequest` 和同key `createRequest` 重放会返回含贡献者A的名单，而不会409 RESYNC_REQUIRED。

同根因第二分支：以冻结policy要求distinct groups、合法不同组创建R；只将R两条 `group_at_assignment` 改为同一非空字符串（或其中一条改null）。首版重建仍返回成功。检查应只依赖冻结policy及冻结assignment，不因后来真实membership资格或分组变化否定合法旧请求。

## 其它已读边界（未发现新增可证明阻断）

- 权限与当前状态：request-service:21–38先刷新凭据和space contributor访问。create:25–29要求当前目标author或maintainer/owner；cancel:32–37要求**requester**或空间维护权限，不沿用后来targetauthor身份。cross-space/missing404、target redaction410在所有权和expected_version错误前；read用observer并同readSnapshot。RR06相邻正式fixture覆盖后来targetauthor不是取消权限，但日志不作为本源审依据。
- 原子性：create:42–76和cancel:96–115外部写事务包含快照、items、head/version、固定assignment、public metadata event和幂等结果。builder的同步readSnapshot复用标准同连接事务；服务不异步跨事务。贡献者与资格在fresh action中核，virtualadmin不自动形成真实eligible membership；名单clone+UTF16排序，不改输入数组。
- 历史重放：idem:107–111、974–985、1287–1292、1483–1486、2355–2359、2423–2424、2455–2456完整登记compact两operation。ref绑定request/version/snapshot/hash，cancel operation另外绑定requestID。create固定v1、cancel固定v2，经semantic重建验证而非取currenthead；取消后create仍重放collecting v1，当前policy变化不重做fresh资格。service在进入idem前仍刷新当前写权限及privacy；idem:2709–2729 existing分支不扣meter/不再次写event，同key不同payload409。fresh失败不退process admission符合已冻限流契约。
- cancel fresh：request-service:102–105先判expected_version冲突409，再只允许collecting；维护者changed_by来自当前可信actor。新version/reason/time同事务写，旧version和assignment不更新。
- core/module边界：records helper:27–80检查raw exact UTF8 SHA、strict manifest schema、header/ref、历史post hash、space rules/policy/profile、items一一对应、set排序及规模。当前target/dependency/附件visibility与redaction先于历史返回，不以旧snapshot复活私有内容。module getSnapshot:82–91另用既有JCS比较exact存储canonical字符串；core不import review模块/canonicalizer。新增event:requested/cancelled仅requestID/version/actor/visibility，event-service:211–214按目标真实thread过滤，无正文/名单/组投影。

范围限制：这是首版源审与反例建议，不是执行证据；不重新验证已接受快照构造器/JCS，不扩成任意数据库恶意改写模型。工具cancel DTO漂移由A/D另处理，本报告不重复。F01修复后需要窄定点关闭，未发现需要改B24的相邻问题。

## F01 v3 定点关闭（只读源关闭，独验执行另记）

根批准仅核固定名单与固定manifest/policy的内在不变量，当前资格/分组后来变化不改写历史。复核依据 `author/request/freeze-manifest-v3.json` SHA-256 `c37d86ebfbd1155d63770b45e9bacbdbf99fa94afa726d8ccfef91276904a4bf`；helper与RR05测试当前字节均与v3逐项SHA一致。

`review-request-records.ts:99–106`现在拒绝冻结reviewer与manifest.contributors交集；当冻结policy要求distinct groups时，检查持久group为非空白字符串且互异。未调用当前membership/eligibility或重写任何assignment。公共重建函数由getRequest、cancelAuth及compact历史重放共用，因此F01所述读/重放路径同时覆盖。

RR05源段先以distinct groups=true合法创建，再私有SQL注入贡献者、相同组、空白组三个反例，分别要求固定409 RESYNC_REQUIRED；恢复原名单后保留原manifest/items/compact ref腐坏断言。没有弱化旧断言。B未运行该测试，仅检查其源；作者与D执行证据归各自材料。F01源缺口关闭，首finding和首版hash保持；未发现此修补的新增相邻阻断。B24原实现及测试保持冻结，至此停止写入。
