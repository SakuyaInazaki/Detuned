# M5.1-E.2 创建时间排序与安全Markdown决策事实

只读代码/官方资料，查阅日期2026-10-09；未安装、运行产品、读用户profile或获取外部图片。沿C/planning/m5-overview-order-facts.md收窄后续实施选择，本文不冻结路线。

## 目录排序与兼容

- protocol/threads.ts:46–66 的query只有limit/max_bytes/cursor，strict object；cursor v1 purpose=thread_posts_read、actor/space/thread、sort=id_asc、after_id、exp。service/thread-posts-read-service.ts:25–76当前同步snapshot/授权后storage.listPostsInThread，按最后实际交付ID签cursor、86400原exp续页与完整信封预算。
- storage/sqlite-storage.ts:740起按thread_id、id>cursor、ORDER BY id ASC LIMIT limit+1，port/storage.ts:123只接受ID游标。旧ThreadService.getThread与server旧GET thread也使用同方法，不宜改成全局默认时间排序。
- post-service.ts:91–109用clock.nowIso()写created_at，CryptoIdGenerator是randomUUID，不能保证创建先后。ClockPort无单调保证；相同timestamp可用id作确定性tie-break，回拨则后提交帖可能排前。logical-import.ts:53保非墓碑源created_at，墓碑用importTime；它不是本地提交顺序。现schema升级只补thread_versions等，不给posts新sequence/规范化全部历史时间。仅按TEXT created_at排序还须明确历史offset/大小写表示是否保证统一UTC；JSON date-time格式本身不等于统一可按字典比较的时刻表示。
- schema.sql:90–111 posts id主键，无(thread_id,created_at,id)；现显式非PK索引只有events(space_id,seq):206。SQL可ORDER BY created_at,id，但无组合索引不保证大主题分页性能；若决定新增索引，需明确既有库apply入口/维护兼容。索引本身不必新增表/列或schema版本，但不能只改新库DDL遗漏现库，也不能擅自新增migration或在read GET里建索引。
- 最小可选契约路径：query增加optional sort，默认id_asc不变；为created_at_asc设独立cursor union/domain并保存after_created_at+after_id，服务/port/SQLite增加窄分支（旧listPostsInThread不变），Web显式选新sort。请求sort与cursor域必须一致，不能用当前页client排序假全序。若承诺真实时刻而非原stored文字排序，历史时间标准化与索引方案需要根先裁；不能冒称提交顺序。
- 具体候选文件：protocol/threads.ts（query/cursor）、openapi.ts（GET query）、client/client.ts（已有getThreadPosts query直接转发）、core thread-posts-read-service.ts/ports/storage.ts、sqlite-storage.ts及决定后的索引apply位置、server/routes/threads.ts（当前白名单三字段与显式组query）、Web app.tsx。独立测试/示例另分配。无必要改旧full thread响应。
- 调用链：HTTP GET /spaces/:space_id/threads/:id/posts；sharedclient getThreadPosts(spaceId,threadId,query?,{signal})返回ThreadPostsPage；CLI `thread posts`目前只有--limit/--max-bytes/--cursor（cli/index.ts:631–643）。ToolRead thread_posts schema spreads同query（protocol/tools.ts:33），但client.callTool:990显式重组limit/max_bytes/cursor，新sort若广告给工具就必须同步该转发。MCP/Pi使用DETUNED_TOOLS+callTool，不各自排序。若根只Web选新sort，可保CLI无新flag，须明确工具广告/转发选择，不能schema悄悄声称支持而丢参数。

## 两条成熟Markdown候选

当前Web没有Markdown直接依赖。主lock只有Pi TUI传递marked18.0.11，本机同版package为MIT；react-markdown/DOMPurify/remark/rehype未锁定，不能当现成Web依赖或承诺离线缓存可用。

1. React AST直渲染：官方react-markdown10.1.0为MIT、React>=18，11个直接runtime依赖（unified/remark-parse/remark-rehype、AST→JSX等），新锁图增量需实际安装后核，不猜包总数。[固定包元数据](https://raw.githubusercontent.com/remarkjs/react-markdown/10.1.0/package.json)。[官方README](https://github.com/remarkjs/react-markdown)说明默认CommonMark/React元素、HTML默认转义，可用skipHtml完全丢弃；不加rehype-raw。默认URL允许http/https等及相对链接，不会自动满足本站“无远程图片”要求；应用应不渲染img，限制链接协议/行为并保CSP，无高亮/数学/GFM插件即可覆盖基本段落/列表/引用/代码。插件或自定义组件可破坏安全默认，需独立XSS/无外网验证。
2. 已装marked解析→安全HTML链：[官方marked文档](https://marked.js.org/)明确输出不净化并推荐DOMPurify。必须新增Web直接marked和sanitizer、严格HTML标签/属性/URL及禁图片策略后才可HTML插入，不以“已有marked”省掉安全层。[DOMPurify官方](https://github.com/cure53/DOMPurify)是DOM净化，默认允许多种URL协议/相对URL；需收窄，禁img/远程资源，不是只开sanitize就满足产品策略。查到滚动main metadata为3.4.16、MPL-2.0 OR Apache-2.0、可选trusted-types类型依赖（[元数据](https://raw.githubusercontent.com/cure53/DOMPurify/main/package.json)）；这不是已锁/已安装版，实际pin由根再核发布/锁图。Browser可直接用DOM，不应为本包引jsdom/服务端渲染链。

两官方项目有明确安全文档与维护源码，但本次不宣称特定版本无漏洞。路线1避免dangerouslySetInnerHTML和额外sanitizer，代价是AST依赖图；路线2复用parser但增加HTML安全配置/DOM sink审计。两者都需定义最大渲染输入/节点、禁远程图和不执行内容；复杂公式/语义diff不是本包必需。最终pin、许可选择、链接策略、索引/时间语义与范围由根裁定。
