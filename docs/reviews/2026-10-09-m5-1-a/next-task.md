# 下一任务：M5.1-B 真实 Web 讨论首个完整旅程

父已接受M5.1-A有限Node HTTP范围，证据以本包README/verification为准；以下范围已冻结，下一包fresh后立即实施。不把M5.1-A Node HTTP认证证据当浏览器cookie/DOM通过，不提前标FR-10/T11整体完成。事实：[静态/build接线](planning/m5-1-b-static-build-facts.md)、[UI/client接口](planning/m5-1-b-ui-api-facts.md)。用户持续自动推进授权保持，无需等待用户重复确认。

## 文件与依赖边界

- A：root package.json、确有必要的pnpm-workspace配置与lock；Vitest排除专用scripts/integrations/web；packages/web package/tsconfig/vite.config/index.html；server静态helper/app/index与CLI flag；新静态合同测试。
- B：packages/web/src/**实际UI；专用browser目录明确author spec。D：独立Playwright config/fixture/independent spec与统一verification。具体逐文件owner在fresh后一次冻结，不互改。
- 固定React19.3.0/react-dom及types19.3.0、Vite7.3.7、Playwright1.64.0；精确Vite override同步现间接7.3.6，核完整锁图无旧新重复。无router/state/plugin-react新依赖；局部Web Bundler/DOM/react-jsx类型配置，生产source map关、无Node shim。
- 安装必须fresh后，公开registry、显式空userconfig、项目/owned私有store，不读账号secret/globalconfig，不执行任意postinstall；既有必要native保持。记录精确新依赖/许可/锁图delta，常规可逆本地安装已有授权，不再向用户重复确认。
- Playwright只已装Chrome channel chrome与独立非持久context，不下载浏览器或访问用户profile。独立`pnpm test:e2e`不混默认core，也不自动引模型/外网或host agent。

## 单服务静态边界

可选buildApp.webAssetsDir与CLI --web-assets-dir必须同时webOrigin。CLI配置/目录/index预检在数据创建、DB和listen前；错误固定有界安全文案。只指定packages/web/dist，不自动猜data目录。

仅根GET/HEAD `/` 与明确 `/assets/*` 匿名，仍先可信Host/Origin；不能先解析旧cookie使过期session挡登录页。其他API鉴权保持，没有任意SPA fallback。只发布指定dist/index.html及assets中的实际普通构建js/css；拒链接、目录列表、dotfiles、数据目录或任意扩展泄漏。缺文件真实404，API/auth未知路径JSON，静态路由不能接管API。

保持现no-store，index no-store。CSP self scripts/styles/connect，无inline/eval/object/remote img；frame-ancestors none、base-uri none、form-action self与nosniff。UI源不执行研究文本，不用raw HTML或Markdown库，不自动抓外链/执行附件。

## UI 与状态

- 登录token只放本次Authorization，提交后清输入；不存local/sessionStorage或其它持久storage。启动getWebSession恢复，CSRF仅memory。
- 会话generation+AbortController隔离旧请求/晚响应。logout先封旧响应回填，再明确请求server注销；网络失败显示未确认，可显式重试，不能报已退出。已提交业务不承诺回滚。
- 空间/主题每页20，open/archived，opaque cursor原样；帖子目录复用id ASC，不称绝对创建时间。空/加载/断网/401/403/429/无权限均可读反馈，原生label/button/focus，窄屏单列。
- 一次只打开一固定post/revision。getPostRevisionContent用65536每页预算，每次用户“继续”，保持同ref/offset；累积<=1MiB且完整EOF业务complete时才解析整份JSON，用纯text/pre呈现title/summary/body/tags/structured五字段。超本地cap切换明确原始JSON段查看，可继续/重开，不假称完整，不偷偷换current。has_newer_revision仅提示。
- 发布note title/summary/body，服务端仍唯一验证；“引用回复”用既有refs/cites精确固定修订，不造reply_to字段或回复树。第一次意图生成内存key，未知结果用同body/key；修改意图新key。成功只用server作者/版本。重试期间body锁定，不靠新会话换身份或新key重写。
- 正式评审明确未启用。失败/搜索/证据/更多修订页接后包，不空造导航或宣称完整FR-10。

## 必要实际验收与出口

1. 原认证协议回归；真实静态与CLI错误配置在数据创建前拒绝、未知文件/API/路径链接/扩展边界、CSP与no-store。
2. 独立Chrome+真实SQLite普通human登录、恢复、读空间/主题/固定正文、note与cites发布、退出；同key响应丢失重试仅一帖子，实际author/版本/关系核对。
3. observer拒写、凭据/成员撤权即时、logout晚响应不回填；网络未确认注销不报成功，CSRF/Host/Origin原权限不绕过。
4. 恶意研究文本无脚本执行/外网，长帖固定ref分页与1MiB退化说明；键盘操作与窄屏可用，错误/空/加载可理解。
5. 单一D统一build/type/lint/full及适用当前探针；browser专用test:e2e另证据、不计作模型认证。保存首失败与环境条件，native child/context/HTTP/DB/temp真实清退。

父依据证据验收首片并立即衔接失败/搜索/证据旅程。M5.1-B有限旅程通过不等于M5全部完成，更不等于M6/M7正式评审可用；本任务未实现、未安装、未运行。

## 浏览器证据保护

仅访问自有临时fixture，无模型/用户profile。不得输出HAR、trace、storageState或credential/cookie/CSRF敏感快照；可保存没有秘密的真实桌面/窄屏截图供父视觉验收。context/PID/HTTP/DB/temp真实清退与首失败保留。fresh完成后按冻结owner实施，不因已有Node协议证据跳过真实browser。
