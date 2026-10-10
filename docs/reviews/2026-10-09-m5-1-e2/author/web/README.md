# M5.1-E.2 B：创建时间 Web 目录与安全 Markdown

源码及依赖六文件冻结见 freeze-manifest.json；其余 content/knowledge/revision-evidence/main、下层、browser 与旧审查未修改。作者未运行 build/browser/core，交 D 统一。

## 目录

四个 getThreadPosts 接点显式 sort=created_at_asc（正常目录与opaque续页、搜索/失败引用进入主题、创建后/发帖后刷新）。不前端重排，不变旧API默认。页面说明按创建时间，历史未知时间置末；不宣称事务提交顺序。

## Markdown 边界

新 SafeMarkdown 用 react-markdown10.1.0(MIT) 同一组件渲染固定正文/概览规则/完整固定规则，标题/摘要/structured/目标继续text。CommonMark白名单 p/br/em/strong/blockquote/ul/ol/li/hr/h1–h6/pre/code/a/img，其中 img renderer仅span alt/source，无真实图片；无media/embed/HTML sink/rehype-raw/GFM/math/highlighter。原HTML默认转义文字，不删研究原文。

自定义 urlTransform 只让原URL到本地renderer判定，不直接赋任意href。a仅显式absolute http(s)、无control/空白、URL无credentials才链接，并target_blank+noopener noreferrer；其余span。图片URL仅纯文本，无自动网络。

UTF8输入<=128KiB才解析。唯一本地remark hook只读实际AST.children，depth64/nodes20000，未改AST或额外第三方plugin。越界抛固定错误，由局部 React Boundary 显示exact原文；Boundary source变化恢复，输入越界直接原文。原文切换同字符串，无正文规范化/HTML注入。不声称CPU硬cap、sanitize或内容验证。真实HTML/network/AST/recovery/键盘效果须以 D 浏览器为准，作者仅阅读与类型检查。

## 依赖/实际检查

固定 react-markdown 是唯一新Web直接依赖；真实MIT/version/peer/integrity、现pins不变记录 dependency-audit.json。publicregistry+env-i原HOME/PATH、空user/globalnpmconfig、ignore-scripts/ignore-pnpmfile，不运行安装脚本或用户配置，不下载Chrome。首CI默认frozen-lockfile拒绝新manifest exit1保留，第二授权nofrozen安装exit0/9.4s。实际传递图及fresh精确diff见 lock.diff/lock-key-audit.json；vitest3.2.7运行版本不变，新增@types/debug使可选peer snapshot key重算，未再安装。

Web noEmit首读旧dist无sort exit2；第二作者sourceconfig未解析vite/client exit2；第三仅Websrc+协议/client源码别名、DOMlib，types=[]，exit0。三份原stdout/stderr保留，不把 source检查当正式workspace门禁。

标签：区域“正文内容”，button“正文：显示原文/显示 Markdown”；规则“空间规则N内容/固定规则N内容”。超限“Markdown 降级：超过128KiB输入预算”；AST/异常“Markdown 降级：结构超过预算或解析/显示未完成”。已有读取/引用/上传/退出 generation状态机不变。
