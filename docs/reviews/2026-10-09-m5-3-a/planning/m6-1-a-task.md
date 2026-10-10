# 下一任务：M6.1-A 严格可复核材料快照基础

本任务书由根审核后生效；先完成M5.3-A元数据及新fresh再实施。依据[M6基础事实](../../2026-10-09-m5-2-a/planning/m6-foundation-facts.md)及本轮B scope事实。只补现ReviewModule.generateSnapshotManifest与独立JCS，不加DDL/HTTP/工具/正式批准，不称M6整体完成；旧研究post/idem hasher原字节保护。

## DTO与材料边界

现评审request尚未公开endpoint，正式冻结时保原fields并补：顶层reproduction_instructions非空白≤16000字符；code_refs每项repository非空白≤2048、commit精确40或64小写hex、必需source_artifact_id且包含于artifact_ids、reproduction_instructions非空白≤16000。严格拒重复ref/ID/code键，不静默去重；code集合键精确采用(repository,commit,source_artifact_id)元组；同键即使复现文字不同也拒重复，不去重。

显式dependencies最多32、artifact IDs64、code refs16、显式contributors128、reviewerIDs1–5且互异。依赖仅显式有限清单，不递归论坛。不在本包裁reviewer eligibility/名单资格或开启轮次。

目标仅同space active/current claim；历史structured用现parseNewTypedStructured严格校验后取statement/assumptions/scope/falsification_plan，不改历史值/content_hash。依赖同space active/current且可见，固定refs真实存在；无虚构当前版/修订补填。所有附件DB登记ready且space-visible，读取实际sha256/bytes；code材料source_artifact_id对应其中附件。DB metadata可用性不等当次磁盘bytes核验，本包不把异步blobIO插同步事务。

## 一致构造与strict manifest

同一个storage.readSnapshot覆盖材料、空间当前规则与policy及贡献者读取，先核expected_policy_revision；required_checks缺配置即拒，非required配置不卷入hash。旧snapshot helper无调用者，默认不新增StoragePort/框架；真实缺窄查询接点时先报根。

贡献者并集：Post.author_id + 被纳入帖子全部metadata修订editors + 显式contributors。分页累计最多10000修订/4096贡献者；超限明确拒不截断，不读正文历史。无贡献者身份自动真实性证明。

strict manifest version1包含space、固定target结构与content_hash、dependency refs/hash、附件id/sha/bytes、对应code material、space规则revision/policy_revision、实际完整policy及所需check配置摘要、贡献并集、顶层复现说明。snapshot ID/time/display_name不进材料hash；保研究原字符串和有意义数组顺序。

## 独立JCS与限额

默认无新依赖：先以RFC8785一手规范实现独立可测纯函数；若最小已核依赖更合适需先报根，不自行安装。不可改现CryptoHasher.canonicalJson或旧post/idem序列化。

object key按UTF16顺序；manifest集合字段以明确locale-independent稳定键排序（不用localeCompare）；正文/assumptions等有意义数组保序。JSON非法值拒绝：undefined/nonfinite/BigInt/function/symbol/非法surrogate/循环等，不映null掩盖。exact canonical UTF8 bytes≤256KiB、depth≤64/nodes≤20000，超限有界失败；不称nativeCPU或全内存硬cap。SHA256沿已有接口对exact canonicalbytes计算。

## 验收与所有权候选

下一fresh正式登记精确文件：ReviewModule、protocol review DTO、独立review canonicalizer及必要作者正式tests；不创建空service/port/route。A/B分工与独验owner由根dispatch，禁止并改同源。

- RFC固定数值/Unicode向量、JSON非法输入/深度节点/字节边界；输入不变异。
- 集合输入排列相同材料同hash，有意义数组改变hash；规则/目标依赖修订/hash/源码包/requiredcheck配置变化必变。
- 真实SQLite单只读snapshot、current revision/policy冲突、生命周期与可见性、ready附件与code关联、贡献者并集/分页限额、缺required配置拒绝。
- 旧contenthash/idem与现公开接口保持；适用回归保已接受699证据不伪称重跑，实际gate由独验owner统一窗口按改动范围执行。
- 首失败/命令/elapsed/exit/hash/资源清退保留，不把作者自报当根接受。无需模型/用户config/凭据、SQL迁移、安装或推送。

正式request持久化/schema3、review资格flags及sealed流程留M6.1-B/M6.2根后续裁定。不能因材料hash稳定就称评审独立、复现通过或批准有效；不自主制定迁移/弱政策审批策略。
