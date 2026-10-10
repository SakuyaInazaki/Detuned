# E2 B6 独立安全 Markdown / 依赖窄审（2026-10-09）

结论：限定范围未发现可行动阻断。只读 B6、新 renderer 与既有固定ref/generation接点、author/web fresh package/lock差分及必要已安装元数据；没有运行browser/gate/perf、修改产品/锁或安装。本结论不替代D运行证据或完整供应链审计。

## 渲染与恢复

- safe-markdown.tsx:5–22 白名单CommonMark与本地只读remark AST访问，节点20000/depth64越界抛错；输入UTF8 >131072在:45–48先退原文。检查不会改研究字符串；仍不保证解析之前CPU硬抢占，父冻结语义相符。
- :25–30 URL仅显式absolute http/https、无空白/控制、无username/password且URL可解析；:50–55 a替身统一经过此检查，其余span。img始终span，src只是React文本，不生img或自动请求。无media/embed/rawHTMLsink、rehype-raw或HTML转化插件；allowedElements中的img为该受控替身需要，不是实际图片元素许可。urlTransform身份函数不单独作安全保证，最终全部有网络能力的a/img出口受控。
- 安装react-markdown10.1.0 lib/index.js:359–368默认raw节点转text（skipHtml未开启），React显示原HTML文本，不是执行HTML。AST依赖中的MDX工具不等于本组件启用MDX、GFM或执行能力。
- :32–40 局部Boundary错误显示固定降级说明+exact source，source变化才清failed并重试；:43–56原文切换直接pre原字符串，不JSON/trim/归一。失败不是完整渲染证明或“内容相同”。Boundary不包整论坛，source新值可恢复；raw状态的effect只重置展示选项。
- app.tsx:545仅完整content.document.body接renderer，title/summary/tags/structured仍文本；space-overview.tsx:46/49仅规则项，固定目标文本。既有content/rules固定ref/1MiB与generation/abort写回门禁未被渲染接线改变。app:278/349/384/493四getThreadPosts都显式created_at_asc，续页继续带sort；没有本地单页排序冒全序。styles仅布局/字体，无url资源或自动外链。

## 依赖差分

- package.diff只有新增直接react-markdown10.1.0；其安装metadata MIT、React/@typesReact>=18与现19.3.0兼容。原React/react-dom/types/Vite/TypeScript声明不变。
- 核author/web lock.diff与lock-key-audit：现vitest仍3.2.7，仅新增@types/debug4.1.13 optional peer导致snapshot key变化，不是版本升级。react-markdown依赖由实际锁图解析，新增78不同包名（snapshot另含同包peer key），本机这些新增名metadata全部可读，license字段均MIT或ISC；这是metadata事实，不声称全面许可证法律审核/无漏洞。
- 实际新图含remark-parse11.0.0、remark-rehype11.1.2、unified11.0.5及HAST/MDAST/micromark工具；无直接sanitizer/highlighter/GFM/math/rehype-raw或新runtime JSX执行配置。安装首frozen拒已保存，第二9.4s exit0/ignore scripts与pnpm warning按B记录，不伪称clean install或无warning。

## 冻结绑定

B manifest SHA `8d280e9d6cdb0023ad98e5957761169edadd3525871496a0c97163f73ee9f925`。本次读取前后六项实际SHA均匹配：app/styles/space-overview/safe-markdown/package/lock。保持B产品冻结；索引没有获得实现授权，本审阅未涉及索引或追加性能。

时间范围说明：上文“索引没有获得实现授权”专指该Markdown审阅当时；其后根依据集中性能反例授权A runtime index v2，报告不撤改当时观察。最终索引独验见本包verification/independent-report.md。
