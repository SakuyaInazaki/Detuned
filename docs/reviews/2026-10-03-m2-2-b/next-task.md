# 下一包内部任务：M2.3 搜索语义与分页可复查性

供主代理下一轮自主分派给gpt-6.1-sol开发子Agent；用户无需手动转发。本轮M2.2-B产品/测试保持冻结，当前最终状态以父代理独立验收结论为准，不提前宣告通过。

## 先规划，后冻结接口实施

先读最新AGENTS、README、docs00/08/11，再读docs03/04/09、当前审查结论和本目录next-step-facts.md。只读核实SearchService/searchPosts、HTTP query/schema、client/MCP传输、现标准签名port与token用途。先提交精确tags传输/归一化、cursor载荷/TTL/错误、服务与storage接口、扫描预算事实、测试反例及文件所有权建议给父代理。父代理冻结合同并拆读取业务/协议传输所有权后才改产品，不自行选大范围架构。

## 父代理已裁定语义

1. **标签属性全部匹配。** 对当前revision存储tags元素精确比较、区分大小写；查询[]无筛选，重复查询tag可去重。必须先过滤tags/kind/thread再分页，不能用FTS tags文本模拟属性筛选。
2. **CSV兼容与逗号标签。** 保留现CSV调用兼容，不能split包含逗号的合法tag后冒充无损。优先规划新增互斥 `tags_json` 标量JSON数组，由共享client将数组无损映射；与tags CSV同时提供须明确拒绝。先核实既有协议元素长度/数量、HTTP重复/空值/非法JSON/类型/未知键政策，提出精确边界供父冻结。不要自行采用歧义混用或随意强化写入tag限制。
3. **ID DESC稳定键集。** 保留现排序，明确非时间、非相关性、非快照。新cursor通过现标准签名机制绑定actor/space/归一q/filters/sort/位置，不新增表或自造crypto。旧裸ID不能当绑定cursor，不静默降级；明确调用方需重取第一页。精确错误码、TTL、用途、字段白名单/版本、签名验证和规范化次序先审批。
4. **Unicode与字面q。** q计数及1/2、3+分支均按Unicode码点，保留现trim，不做NFC或语义改写。SQLite FTS/LIKE符号及大小写行为先核官方说明并用真实产品反例确认，区分文档事实/源码推断/运行证据。定义可观察字面查询合同，覆盖中文、emoji、`%`、`_`、反斜杠、双引号、FTS标点。保留现snippet来自title列语义，不改排名/高亮展示路线。
5. **生命周期与权限。** 修订后旧词不再作为当前搜索内容；撤回/脱敏后两分支不返回旧正文/标题/摘要/标签。当前权限检查在cursor处理或候选读取之前；actor/space绑定不能替代当前权限重查。过滤完成后才确定limit+1与next_cursor，不能因分页后过滤漏项或假称末页。
6. **扫描预算事实。** 核实现有QUERY_TOO_BROAD错误码及查询扫描预算缺口，先给父具体源码事实与触发反例/最小边界建议供本包开工裁决。未具备的预算不得伪称完整性能，扫描受限不能偷偷返回空集合冒充无结果；不要自行实现10万长压测或通用搜索架构。

## 例子与开工需冻结的合同

- tags=['中文','Case']只匹配同时含这两个精确元素的帖子，含'case'不能代替'Case'；[]不限制；重复['Case','Case']可归一同一筛选语义。
- tags=['a,b']应经无损数组传输匹配单个'a,b'，CSV `tags=a,b`仍表达两个tag；两传输参数同时出现如何报错必须明确。
- 同actor、同space、同归一q/filters/sort持有效cursor续页；换actor/space/q/tag/thread不得复用；改写位置或签名、过期、旧裸ID明确拒绝与重取第一页，不隐式绕过。哪些错误码/status/TTL由父冻结。
- '图'、'失败'、'零权边'与emoji混合由码点数决定分支，不能因为UTF16代理对误选。符号按确定的字面合同，不让输入成为高级FTS表达式。大小写差异以官方与产品反例判定，不先宣称所有路径相同。

归一化应保留有意义文本：q仅trim；tags去重及哈希排序是否用于绑定、大小写不变；空tags与省略是否等价、可选thread/kind空值、JSON数组元素规则、cursor最大长度与signature用途均开工规划精确列出。不能为了绑定cursor而改历史写入hash/幂等合同。

## 有限验收

先新正式产品反例失败，再改根因，保留before/after和真实环境日志：

- 产品HTTP/client/core一致T05中文1/2/3+、emoji与字面符号矩阵；长度与trim码点边界；官方依据与实测结果能对应。
- tags全部/精确/大小写、空[]、重复、CSV旧调用、逗号tag无损传输、互斥与错误输入；kind/thread与tags组合先筛再页。
- 有界多页ID DESC、不重复、终页next_cursor明确；绑定actor/space/q/filters/sort、位置篡改/过期/裸ID拒绝；当前权限撤销先拒绝，不因cursor泄漏候选。
- 修订/撤回/脱敏在LIKE与FTS两分支均不返回旧材料；跨space无泄漏。
- 父批准的扫描预算/QUERY_TOO_BROAD行为有真实有限反例，不伪造空结果或性能承诺。
- 保持M2.2知识投影/三写入口/历史原key回放、M2.1附件流/配额/恢复回归。旧probe/证据不改；若旧正式setup需适配先报准确文件与原因。

有限定向测试和类型检查后冻结，父代理统一构建、全量独立验收、决定状态。Node22/真实宿主/模型/10万数据没有运行就明确未测。

## 所有权候选与非目标

- 读取业务：core SearchService、StoragePort搜索读取接口、SqliteStorage searchPosts必要查询、现token-signer复用接线、新产品搜索集成测试；必要docs03/ADR。
- 协议/传输：protocol SearchQuery/OpenAPI/tool、server query/search必要接线、client tags数组/静态返回类型、新HTTP/client契约测试；docs04迁移提示。
- 主代理先冻结精确文件与共同接口，避免同时改同文件/构建；验证Agent独立验收。不能改schema/SQL DDL、迁移、archive、旧reviews/probes/logs或历史hash管线。

不做M2.4全文/硬预算/检查点重构、10万长压测、M6正式评审、排名/新索引架构/新真理表。未经授权不发布/部署/commit/push/reset/clean、不改全局配置、不调用真实研究模型服务或自动启动论坛参与者；用户授权的主代理→开发子Agent编排继续允许。deepseek-brainstorm持续禁用，不安装、不调用。完成规划先交父审批；不要把阶段交付等同整个产品完成。
