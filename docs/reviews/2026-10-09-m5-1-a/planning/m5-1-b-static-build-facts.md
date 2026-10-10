# M5.1-B 静态发布与构建接线事实（只读）

当前A产品保持freeze。父选React19.3.0/Vite7.3.7/Playwright1.64.0与独立Chrome context；本报告未安装、build、test或实现下一包。

## 服务与认证

- server/app.ts:143全onRequest执行Web可信Host/Origin、cookie响应no-store及draining；静态首页/assets也会经过这些hook。这层Host/Origin应保留，不能把静态anonymous当跳过同源政策。
- :262全preHandler先解析cookie/Bearer，再仅ANONYMOUS_HTTP_ROUTES放行。新根首页/assets目前会被Bearer要求或过期cookie401挡住，无法正常显示登录页；需明确静态GET/HEAD只读路由策略，在验证Host/Origin后允许加载，不给API鉴权新增通配anonymous。不存在静态文件也不应fallback出API HTML。OPTIONS/CORS与POST rootauth原规则保留。
- @fastify/static已是server直接依赖，实际8.3.0（manifest ^8.1.1）；根workspace require不可解析该非根依赖，必须从server实际node_modules核。本次首metadata require失败不意味着未安装。
- 安装官方README说明root/prefix、默认index.html、dotfiles/list可控；wildcard默认true不预glob，wildcard:false会枚举root整个树。最小单服务可新增server窄静态注册helper或app内注册，只显式webAssetsDir正规root，首页+assets路径，不引用dataDir、不启目录list、不通配API fallback。allowedPath可做限定，但不替core鉴权。构建dist若含链接或非资产路径需父freeze明确允许清单/路径边界，不能将任意配置目录称安全。
- A候选owner server/app.ts、新static-web.ts（若需要集中目录验证）、server/index薄配置出口、CLI/index.ts。buildApp显式webAssetsDir?与webOrigin组合；CLI --web-assets-dir需在mkdir/开DB/listen前核路径/index与Web配置，assets未配不自动猜data目录。既有resolveWebAuthConfig早检入口可扩同组合校验，业务不读env。insecure CLI listener严格loopback现约束保持。
- 静态index不应长期cache，hash assets可单独cache；auth与cookie API no-store已有hook。是否静态带cookie也保持no-store是当前行为，优化需父审，不偷改auth策略。

## Workspace / 类型 / 脚本

- 根packageManager pnpm11.7.0、engine Node>=22.19；实装Node26.3.0/pnpm11.7.0。根build/typecheck/lint均pnpm -r，对每workspace脚本执行；workspace packages/* 自动收packages/web，无需扩大glob。根无ESLint配置/包：现各包lint是tsc --noEmit，不能宣称已有ESLint规则。
- 根TS为NodeNext/ES2022、lib仅ES2022，严格noUncheckedIndexedAccess等；Web tsconfig需要局部Bundler/ESNext、DOM/DOM.Iterable、react-jsx、noEmit保根strict，不把DOM/React改进所有服务包。web package build可typecheck后vite build，typecheck/lint沿现严格TS模式；若引真正ESLint是额外依赖/配置，待父选，不默认扩大。
- sharedclient基础入口index只有browser安全依赖，已有client/node独立出口；Web只import @detuned/client，禁止/node/core/storage。Vite需打包其workspace dist/协议依赖，现各包pnpm -r排序通常client先web（web manifest显式workspace dependency），不能用浏览器服务端shim掩盖Node引入。
- Vitest3.2.7默认node、全仓扫描，排除docs/reviews与dsh-runtime；新增独立Playwright入口应置scripts/integrations/web或显式独立目录并加入Vitest exclude，避免核心CI直接拉浏览器。真实浏览器脚本只显式Chrome executable/channel与独立context/privatefixture，不下载browser或继承用户profile，不称Node cookiejar等同浏览器。
- 当前lock唯一Vite7.3.6，作为Vitest间接依赖（非root node_modules/vite链接）；父选7.3.7是同线patch。新web exact7.3.7若仅添加direct依赖可能仍保间接7.3.6；需一次受控锁解析将既有Vitest Vite同步到7.3.7（例如统一override），核lock所有vite snapshot/peer组合及旧version删除，不能仅看Web package版本就称去重。未执行任何lock/安装变更。
- React/ReactDOM及types、Vite/React transform、Playwright确切manifest与有限安装命令待父freeze。无router/state额外依赖；Vite可使用其内置TSX/React JSX编译，是否plugin-react必要由父审，不能预先增加无必要插件。

候选最小新增Web package（manifest/tsconfig/index.html/src app/style/config）+显式独立浏览器验收脚本/入口，根lock及Vitest exclude的影响另分owner。需决策只在静态路径边界、部署root配置与一次Vite patch/安装边界；本报告不代替下包fresh与冻结。
