# M5.1-B independent functional review

有限首个 Web 纵向片段可以接受：普通 human 通过真实 Chrome Cookie 会话读空间、主题和固定修订，发布 note 与固定 cites 引用，确认注销。核心 **675 tests / 99 files**，实际浏览器 **6 个不同旅程**（作者 1 + 独立 5），组合 current29 **29/29**。这不是完整 M5、生产 TLS、其他浏览器或 M6 评审验收。主代理是否接受由主代理最终裁定。

## 版本与门禁

A [13-file freeze](../author/server/freeze-manifest.json) 与 B [v3 five-file freeze](../author/web/freeze-manifest-v3.json) 当前全部匹配；D 的配置、私有 fixture、独立 spec 三文件见 [independent-source-freeze.json](independent-source-freeze.json)。唯一 whole gate owner 执行，作者没有重复 whole build/full/browser。

| 检查 | 真实结果 | 覆盖/证据 |
|---|---|---|
| 根 pnpm build 首跑 | exit0，7.809s | A v1 / B v1，[receipt](gates/build-first.receipt.json) |
| CSS 必要 Web 增量 build | exit0，1.721s | B v2，[receipt](gates/web-build-hover-final.receipt.json) |
| 最后纯文案 Web 增量 build | exit0，1.774s | B v3；脚本含 Web tsc/noEmit，[receipt](gates/web-build-copy-final.receipt.json) |
| 根 pnpm typecheck | exit0，4.914s | A v1 / B v2，[receipt](gates/typecheck-final.receipt.json) |
| 根 pnpm lint | exit0，4.859s | A v1 / B v2，[receipt](gates/lint-final.receipt.json) |
| 根 pnpm test 唯一首跑 | exit0，43.837s，675/99 | A v1 / B v2，[receipt](gates/full-final.receipt.json) |
| 四个正式浏览器脚本 noEmit | 最终 exit0，1.063s | config / fixture / author / independent；[receipt](gates/browser-source-noemit-visual-final.receipt.json) |
| 25 retained probes | 25/25 exit0 | 21 原脚本 + 既有获准 #11/#27/#28/#29 四 adapter，[results](current25-results.json) |
| 真 Chrome 浏览器 | 6/6 不同旅程组合 | [browser-results.json](browser-results.json)；最终 B v3 仅复验受影响 BI01 |

最后 B v3 只改三处展示文本，没有请求、状态、DOM 结构或测试改变，未重复全仓 type/lint/corefull 或所有浏览器。最终版本由根首 build + 两次必要 Web build、原业务 gates、受影响真实视口/hover BI01 组合覆盖，不能说全部最终字节一次 whole build/full 通过。所有完整 stdout/stderr、exit、时长均在 [gates/](gates/)；[current29-results.json](current29-results.json) 与 [gate-output-audit.json](gate-output-audit.json) 保留命令和输出 hash。

正式 pnpm 使用空 user/global npm config、原 HOME 和实际根脚本。每次保留真实 `pnpmfiles changed` 依赖状态警告；项目 `verifyDepsBeforeRun: warn` 是父有证据的防隐式安装取舍。Vite 构建保留约 501kB JS chunk 提示；#28 stderr 48 行 unknown date-time format 提示，不能用该旧 AJV probe 声称日期格式认证。浏览器 NO_COLOR/FORCE_COLOR 提示也保留。corefull 的 caffeinate 仅本次进程，无全局配置修改。

## 独立浏览器事实

- BI01 真 Cookie 唯一且 HttpOnly / Strict / path `/`，私有 loopback 显式 insecure 因而 Secure=false；页面脚本无法读 Cookie，localStorage/sessionStorage 空，刷新后真实恢复。恶意研究文本保留为纯文本，没有 reading 内 script/img、执行标记或远程请求。真实空间/主题/引用按钮 focus+Enter，窄屏引用后焦点进入正文表单标题。主题筛选实际 selectOption 正反生效。
- BI02 普通 observer 发布被服务拒绝，所有业务表计数不变；隐藏空间不在 UI，实际同源 fetch 404。换普通 contributor 后读正例成立，成员撤权下一读 404，凭据撤销后 session/空间读 401。没有用 admin 身份冒充普通用户路径。
- BI03 真实 POST 已提交后代理丢失响应，耗尽 SDK 默认 3 retry（总 4 次 HTTP）后 UI 保留正文与同一请求 key、禁止编辑。显式第五次重放仍同 key，DB 始终只有 1 个 note，真实 author 为普通 contributor、revision=1。没有 mock create 或把瞬时自动恢复当未知结果。
- BI04 代理持有实际已完成的旧 GET，然后注销 abort/变代；首次 DELETE 在到服务前失败，页面明确“尚未确认”，实际 Cookie session 仍 200，没有假报成功/保留业务操作。放出旧响应不回填 workspace；显式重试注销成功，session 401、令牌输入空、无持久浏览器凭据。
- BI05 合法 60,000 UTF-8 bytes note 的 JSON 被真实有界 HTTP 分页；新 revision=2 出现后仍完整读旧 revision=1 原文，并显示更新提示。批准的 synthetic historical 结构化材含 `研究🧪`（UTF-8 约 1.2MB，JS 字符长度约 480k），实际 read 在连续字节/ref 证据下超过 1MiB 后仅当前 raw chunk、不冒充完整文档，从首段重开恢复分页。该 owned DB 记录先以合法普通 note 经 HTTP 接受，再于浏览器接入前扩充 structured 并按实际 canonical 算法重算 content_hash；它不是合法巨型 HTTP 新写入。

B 源码静态审查核到 TextEncoder 字节累计、固定 post/revision 与连续 start/end byte 检查；所有业务请求携带代际 AbortSignal，回填检查 generation；未知 publish intent 保存原 body/key，注销保留原 CSRF nonce 供 DELETE/retry；正文/structured 均 React text/pre，没有执行帖子或任意外链。CLI `resolveWebAuthConfig` / `resolveWebAssetsDir` 位于 mkdir/DB/listen 前；静态匿名窄路径仍经过可信 Host/Origin，API 不被 SPA fallback 接管。A 的 static 5 个 core 合同本次 full 实际通过，不把 inject 称浏览器执行。

## 首失败、有限修正与视觉

首 browser exit1/40.053s：作者实际 1pass，D5 都在 exact 空间名漏空格的 D locator 失败；首完整 [output](gates/browser-first.stdout) 和 [contexts](browser-first-output/) 保留。只改 D locator；第二轮 BI02–04 通过，BI01 exact label 与选项文本匹配假设、BI05 两页假设失败。随后 BI05 修有界继续和 canonical GET pathname observer（原多了不存在 `/content`）后实际通过，没有降低原文/ref/连续 UTF-8 断言。原上下文依次保存在 browser-second/third/fourth-output。

BI01 原生 select 按键问题用单纯 HTML 对照核：本机 **Chrome 155.0.8059.40 / darwin / headless**，select 实际有焦点，ArrowDown/Enter trusted keydown 到达 select 但 value 仍 open，见 [diagnostic](select-key-diagnostic.json)。因此本包不称该受测组合的原生 select 键盘通过，不推广为所有 Mac/Chrome 限制；按钮键盘与真实筛选正反仍通过。新脚本首 noEmit 唯一 D Error.code TS2339 已局部 guard 修正，原 diagnostic 保留。额外当前锁 audit 首 helper 把 peer 后缀当版本不等，保首脚本/result 后按版本基部比较，最终 exit0；不是产品依赖失败。

根视觉发现按钮 hover 深底深字后批准 B 仅 CSS 修；真实最终 computed 文字 rgb(24,94,81)、背景 rgb(224,240,232)、opacity1、disabled=false。作者原窄屏 fullPage 长图重影保留，DOM header/hero 各 1；独立实际 scroll 定位的 [top](screenshots/independent-narrow-top.png)、[reading](screenshots/independent-narrow-reading.png)、[composer](screenshots/independent-narrow-composer.png)、[hover](screenshots/independent-narrow-hover.png) 与 [geometry](screenshots/narrow-dom-geometry.json) 才支持窄屏布局，未拼接/修图。根已接受实际视口与对比度。最后 B v3 文案增量后 BI01 exit0/3.127s 重采同一安全窗口；原图保留于 screenshots-pre-hover-fix / screenshots-pre-copy-fix。

## 隔离、依赖与保护

实际测试只使用非持久 Chrome context + owned temp SQLite + 私有 Fastify/loopback proxy；token 仅 Node 内存与本次密码填入，不出现在断言值、截图或结构化网络/会话快照；Cookie/CSRF 只用布尔/状态比较。trace/HAR/video/storageState 自动采集均关闭。18 次真实 fixture finalizer receipts 的 app/proxy/DB 关闭与 temp 移除全成功，当前 18 个 owned path 都不存在，见 [cleanup-audit.json](cleanup-audit.json)。两个纯 HTML 浏览器也在 finally 关闭且 runner exit0；没有读取全局进程/用户 profile/模型账户，没有模型或公网请求。

依赖安装复用父明确批准的既有 pnpm store，公开 registry、空 npm config、ignore-scripts/ignore-pnpmfile、无 -g / 浏览器下载；A 保首失败、离线 refresh、linked/native SQLite 证据。D 核真实 installed React/types19.3.0、Vite7.3.7、Playwright1.64.0，当前 lock 380 package / 380 snapshot，exact importers 及 peer 绑定有效，没有 vite7.3.6 key，见 [current-lock-audit.json](current-lock-audit.json)。HEAD 与 Git index 锁对象 SHA81fa…均不等 fresh before SHA1ca6…，见 [recovery](lock-before-recovery.json)，因此不能拿 HEAD 冒充 before，也不能声称完整历史锁图语义 diff；本包锁审查限当前图/pins/importers + 安装日志。首 +11/-2 是安装器报告，不是完整历史依赖比较。

[integrity-before-metadata.json](integrity-before-metadata.json)：288→302 source/config/test 文件，准确 7 改 +14 新，无删除/越权；A13+B5+D3=21 路径。旧 review **6721**、SQL/archive **4**、schema **2**、current docs57+mutable5 与 HEAD 全守恒。锁改变是本包获准 dependency delta。dist 明确 build 改 10 旧 tracked，新增 static4+Web3 个 untracked；旧 dist 其余保持。未改旧脚本/旧 review/SQL/schema/archive，未 commit/push/publish。

未发现尚待产品修复的 P1 功能反例。下一包由根裁任务书；本包不提前开评审、附件 UI、搜索 UI、生产部署或更广浏览器认证。当前入口 metadata 与下一 fresh 尚未由 D 开始，待根接受本报告后按授权顺序收口。
