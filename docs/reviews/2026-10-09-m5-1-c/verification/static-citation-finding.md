# 固定结果引用的独立静态发现

初次读取 C v1 的 `app.tsx` 时，固定 reader 的“引用回复”条件为 `busy || !thread || view !== 'discussion'`；搜索/失败入口不能进入正确主题，无法按任务书复用固定引用。此为真实源码静态缺口，未记录为浏览器失败；D 向父报告后，父裁定 B 窄修。

B v1 与 v2 冻结均保留，v2 仅 app/knowledge 增加结果主题绑定与明确“进入主题并引用”。最终源码 app.tsx:280–297 调用真实 `getThreadPosts`，核实际主题 ID 与 space，再承接原 `postId/revision`，保留返回来源；knowledge 的报告入口带实际 `thread_id`。D 不拥有实现文件，未自行修产品。

C02 第三次定向运行证明：原讨论主题仍为旧主题时，打开另一个主题的搜索修订 1；背景真实 HTTP 修订到 2 后仍读旧正文；进入正确主题并发帖，真实 SQLite 新帖的 thread 与搜索结果主题一致、与原讨论主题不同，`cites` 指向旧修订 1；返回原第二页两条结果且无额外搜索 HTTP。见 [第三次完整输出](gates/browser-c02-third.stdout)。不能把基线的 M5-B before 字节冒充 C v1 实现字节。
