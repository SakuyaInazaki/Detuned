# M5.1-B Web 依赖/浏览器事实（只读，2026-10-09）

本轮只查官方文档/registry与本机安装元数据、浏览器目录及`--version`；未安装、下载、启动浏览器会话或修改manifest/lock，未读profile/历史/账号。

| 范围 | 已核事实 | 给父的选择边界 |
|---|---|---|
| 项目工具链 | Node v26.3.0、pnpm11.7.0；packageManager固定11.7.0，项目Node>=22.19 | 当前Node满足下面engine；不代表最低Node/全OS已跑 |
| Vite | lock及installed包7.3.6/MIT，engine `^20.19.0 || >=22.12.0` | [官方维护线](https://vite.dev/releases)7.3仍收重要/安全补丁；不必跳新major，但不能无条件推荐旧patch |
| React | [官方registry](https://registry.npmjs.org/react/latest)当前19.3.0/MIT；[官方版本页](https://react.dev/versions)19.3 stable，[发布文](https://react.dev/blog/2026/09/09/react-19-3) | 建议同版本react/react-dom；react-dom及types精确latest本次读取失败，不凭第三方结果锁版本 |
| TS类型 | 需要@types/react、@types/react-dom，复用当前TypeScript | 两types registry访问失败（web InternalError/本机网络URLError），尚未确认精确patch/license元数据；批准安装前再有限核官方package，不能写成已锁版本 |
| E2E | [官方registry](https://registry.npmjs.org/@playwright/test/latest)1.64.0，Apache-2.0，engine>=20，依赖playwright同1.64.0 | 独立@playwright/test入口，不混进Vitest默认发现；本次只提选择，不新增依赖 |

## Vite 安全与最小构建

[GHSA-9jrq-w75r-8gcw](https://github.com/vitejs/vite/security/advisories/GHSA-9jrq-w75r-8gcw)（2026-10-06）列7.0..7.3.6受影响、7.3.7修复：定制middleware将未改请求URL交transformIndexHtml并含inline module时可跨源脚本执行；普通内部SPA/MPA路径不匹配此条件。倾向同维护线至少7.3.7，但由父裁是否对现lock作最小安全patch；不得把7.3.6叫完全已排除漏洞。[另一同日Wasm advisory](https://github.com/vitejs/vite/security/advisories/GHSA-vfpm-58rq-9qcg)影响列8.2/8.3而非7.3。未做全依赖安全审计。

[Vite7 JSX文档](https://v7.vite.dev/guide/features#jsx)明确jsx/tsx原生支持（esbuild），故仅TSX生产build不硬需plugin-react；用tsconfig `jsx:react-jsx`/React runtime并独立tsc检查是可行最小方案，尚未本机build证明。plugin-react主要提供React Fast Refresh等开发特性，不把省略plugin当已实现同等HMR体验；无需额外React Compiler/router/状态库才能开始此片。

## 可用浏览器与隔离

本机macOS26.2；`Google Chrome.app`版本155.0.8059.40。仅查看缓存目录，已有Chromium revisions1228/1234和headless shell，实际shell --version分别149.0.7827.55/151.0.7922.34。没有启动带个人userDataDir的浏览器，也没读其文件。

[Playwright官方浏览器说明](https://playwright.dev/docs/browsers)支持channel:'chrome'；可优先父批准安装test包后，以现Chrome+每test非持久独立BrowserContext试最小E2E，不需下载前提，但尚未验证1.64与现Chrome通用兼容。严格匹配bundled revision不能只凭缓存目录断言：新包所需revision应从该固定包browsers.json核，再决定复用或下载。[隔离机制](https://playwright.dev/docs/browser-contexts)用独立context，不用launchPersistentContext指向用户profile。

[官方系统要求](https://playwright.dev/docs/intro)当前Node22/24/26及macOS14+，本机满足。已有可执行浏览器，所以目前不存在“必须下载且已知大小”的结论；若父选择固定bundled，需审批后先核具体revision/官方CDN URL与实际archive长度，再下载，不能凭猜测写MiB。此次未下载任何浏览器/包。

父待裁：Vite同线7.3.7安全patch、React/DOM及types确切pins、Playwright1.64.0与现Chrome channel或固定bundled。安装/lock变更/真实E2E须另包fresh和明确所有权；本事实不代表M5已实现。
