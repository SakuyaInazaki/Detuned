# M2.2 下一步只读事实

2026-10-03。产品/正式测试/既有文档未修改，没有运行新测试；不是M2.2实施或验收结论。仅供父Agent定界。

## 已有规范与验收

- docs03:49–61：proposal/claim必需statement、assumptions[]、scope、falsification_plan；failure必需attempt/category/assumptions[]/tested_scope/expected/observed/evidence_refs[]/ruled_out/not_ruled_out[]/retry_when[]；summary.source_refs至少1条，正文每结论对应来源。PostRef固定post_id+revision；EvidenceRef是固定帖子修订或artifact_id（:39），不能跨空间内部引用。
- failure类别counterexample/proof_gap/test_failure/performance_failure/environment_error/budget_exhausted。适用条件由assumptions+tested_scope表示，证据由evidence_refs表示，已排除范围ruled_out、未排除变体not_ruled_out、重试条件retry_when不能省。无可上传证据需evidence_missing_reason且evidence_state=unverified；provided仅表示有可读引用，不表示验证了结论。环境/预算失败的ruled_out只能限于此次执行，不能自动否定数学路线（docs03:59–61，AGENTS条9）。现规范没有可机器证明“数学路线未被否定”的字符串判断规则，不可臆造关键词裁判。
- docs03:65–73：修订expected_revision，关系目标固定旧修订，不漂移最新版，提示新版本。supersedes不删除旧证据；addresses不自动关闭challenges。撤回保留历史/引用位置；脱敏返回墓碑（:75）。
- docs03:94–101知识视图来自当前表与不可变材料的索引，没有独立可编辑“真理表”：findings规范索引claim及其支持、异议、评审/验证状态，不把无人反对当正确；failures按分类、范围、证据、关联路线查询，reported仅为作者报告，独立复现由reproduces关系与来源显示；未排除变体/retry条件是failure材料的必填事实；open-questions为question+未解决challenges，归档不等于解决；summary视图为置顶summary具体版本，引用对象新版时标来源更新。
- docs04:71有三view名称，:157 context包含目标/有效规则→置顶摘要→阻塞异议→相关失败→近期变化；:117重放重新鉴权/脱敏。完整分页/中文FTS/max_bytes预算属于M2.3/M2.4，不能全部借M2.2扩大实现。
- docs05:86–91历史评审状态/材料失效以及:113–117输出标签由专用对象计算，summary/decision自然语言不能伪造正式通过。当前M6未实现，M2.2只能如实给已有研究索引，不能用review帖子当两份封存评审。
- docs09：T01/T03旧修订与固定引用；T04空间授权不泄漏；T13脱敏read/history/FTS/context/replay无原文；T06涉及摘要来源更新（完整预算/10万容量另属后包）。D01第3步失败应有范围、引用提案修订及反例，后来方案解释为何规避反例；第5步错误原主张仅历史引用，原反例不得为通过新方案而抹掉/错误关闭。roadmap M2整体验收T05–07/D01前3步不能误当M2.2单包全量新增工作。

## 当前实现与明确缺口

| 文件/行 | 已有 | 缺口事实 |
|---|---|---|
| protocol/posts.ts:42–82 | 四类structured各自字段/type/长度schema；failure evidence_state/missing_reason已有 | StructuredContentSchema:85联合末尾宽松Record允许任意结构，CreatePost:133 structured可选且未按kind判别；不能声称 typed schema在各写入口完整强制 |
| core/post-service.ts:30–111 | proposal/claim必填与非空；failure类别/基本字段/数组/evidence_state；summary非空source_refs；create/revision都调用 | 不是完整共享typed校验；各数组元素/限制/未知键可能绕过；failure unverified→missing_reason、provided→可读证据的条件未校验；source_refs/evidence帖子引用未统一做存在/固定修订/同空间业务证明 |
| core/thread-service.ts:36–103 | 初始帖子独立结构验证 | 与post路径重复且更弱：failure只7基本字段，未验证类别枚举/evidence_state/evidence_refs/not_ruled_out/retry_when，造成三个写入口不一致 |
| core/artifact-references.ts | M2.1事务内artifact ready/same space/space visibility与evidence包含；重复ids拒绝 | 仅artifact证据，不覆盖post evidence/source_refs；不能替代全部M2.2类型化/来源校验 |
| core/search-service.ts:42–79 | failures=kind failure前50；findings=proposal25+claim25；open questions加未解决challenges | item来自普通搜索摘要，没有failure完整条件/未排除/重试字段、findings当前异议/验证事实；没有summary视图扩展，现规范操作目录仅三名称 |
| storage/sqlite-storage.ts:1232–1326 | search以current_revision join，仅active生命周期；空间kind/tag过滤；返回post_id/revision/title/summary/tags/snippet | 搜索投影不返回structured；旧引用/证据来源新版本、缺失、脱敏状态未作为知识view元信息整合 |
| core/context-service.ts:48–98 | pinned_refs固定版、active限定，has_newer_revision比较置顶帖子本身；failure概要 | 未逐summary.source_refs标来源更新；failure类别/evidence_state缺失时默认counterexample/provided，不能把历史缺项默认为有证据数学反例 |
| storage/sqlite-storage.ts:650–695/1359–1365 | redacted修订读取墓碑/structured={}，搜索active排除，脱敏清内容/FTS | 新知识view读取structured须复用当前脱敏投影；不能直接读旧SQL/缓存恢复已脱敏来源原文 |
| tests/integration/m0-m1-r2-regression.test.ts:309 | S09普通post坏failure类别反例 | 不证明初始帖/修订一致，亦没有本包完整条件/可读证据/source更新/知识view正式矩阵 |

## 旧引用/脱敏事实与最小涉及文件

已存在固定post/revision材料读取、关系、当前lifecycle与墓碑投影，知识索引应保留引用的指定revision；发现current_revision较新可以提示，不能改引用目标。来源脱敏仍保留引用定位但不得返回原body/summary/structured；已撤回材料仍可历史定位，不能用active列表消失推导路线已被反驳。summary来源更新与置顶summary自身更新是不同事实，当前仅实现后者。

现有与上述事实对应的代码位置包括protocol/posts.ts、core/post-service.ts与thread-service.ts、artifact-references.ts、search-service.ts、context-service.ts及storage知识读取投影；工具定义在protocol/tools.ts，现view名称为三种。这里只记录事实，不批准新增view/context功能、SQL表/迁移或M6状态机。实施顺序和范围仅由已裁定next-task.md及主代理分派决定。
