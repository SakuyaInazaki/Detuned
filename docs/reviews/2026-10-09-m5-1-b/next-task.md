# 下一任务：M5.1-C 新主题、搜索、失败索引的真实Web旅程

父已接受M5.1-B有限Web片段，证据以本包README/verification为准。以下范围已冻结，下一fresh后直接开工，不将计划标成通过。接口事实以[既有API核对](planning/m5-1-c-api-facts.md)为准。所有权限、修订、幂等仍由HTTP/core裁决，不新增依赖、DB字段或API，不启动模型/用户profile。

## 所有权与保护

- B：Web src实际UI及必要纯展示/legacy响应窄化模块。
- D：现专用浏览器fixture的必要私有seed扩展与独立browser新cases。
- A：必要作者辅助/文档，具体文件在fresh后冻结；不并改B/D文件。
- 保认证generation、AbortController、CSRF、固定意图body/key；换空间与退出取消请求、清旧结果，晚响应不得跨代回填。无自动ACK，无rawHTML、外部资源或正式评审资格。

## 实际行为

**新主题。** title及可选首帖note（title/summary/body）通过现`createThread`一次原子创建。输入沿现schema，未知结果显示可明确重试且复用原body/key；变化为新意图。成功从server envelope的thread与initial_post打开，不猜作者、编号或新帖ref；不将两个独立请求包装成原子操作。

**空间导航与搜索。** 只提供真实讨论/搜索/失败三个入口，没有空未来菜单。现`search`使用q及可选kind/thread/tags、每页20、opaque cursor原样传递；过滤改变重置cursor。UI不复制ACL、游标签名或服务端搜索规则。仅纯文本展示返回title/summary/snippet/ref，打开返回post_id/revision/thread_id的固定版本，不能自动切current；返回结果保筛选/页状态。400/422、权限、断网与空结果均有可恢复反馈。退出/换空间清旧结果并阻止在途查询回填。

**失败索引。** 现`getView(space,'failures')`取实际data数组，显著标“作者报告／最多50条的当前视图”；无分页API，不称完整索引、正式证明或批准。展示实际适用条件、tested_scope、expected/observed、evidence_refs及缺失、ruled_out/not_ruled_out/retry_when、missing_fields与固定ref。历史null/缺字段写明未提供，不补编故事；legacy边界先真实类型窄化后纯文本呈现。可按已有关键词跳搜索并筛failure，不能空query伪造全量搜索。正文与引用复用固定版本组件，正式评审仍未启用。

## 必要独立验收

1. 真Chrome+临时SQLite创建thread与firstpost原子成功；提交后丢响应用同key重试仅一份副作用，作者/空间/ref由DB与server对照。
2. query/tag/thread过滤与opaque分页，改过滤重置旧cursor；结果旧ref在后续修订后仍打开旧版，返回保原结果状态。
3. 失败实际字段/null/缺失、作者报告与50条有限视图准确，恶意snippet/title纯文本、不执行或自动外联。
4. 撤权、换空间、logout期间在途查询不回填，原CSRF/权限不可绕；错误可理解并恢复。
5. 核心键盘与窄屏实际旅程；仅自有非持久Chrome context，无HAR/trace/storageState/凭据快照，可保存无秘密的真实截图。

若无core/client/protocol/server/deps变化，复用当前M5.1-B已验core675/99与current29；只跑必要build/type/lint、受影响browser及既有关键旅程，不假称再次运行全core/current25。若真实变更触及这些层，先报父另定范围。保原失败与资源真实清退，父依据独立证据验收。

## 紧随边界

证据/附件发现及有界修订目录在下一M5.1-D补实际HTTP/client缺口。现legacy listPostRevisions返回完整body/structured，无编码字节页上限；不得把它冒充有界metadata目录。现也没有任意修订的附件发现API。M5目标没有被省略，只按包推进；本C范围完成不等于完整M5或M6/M7正式评审已实现。
