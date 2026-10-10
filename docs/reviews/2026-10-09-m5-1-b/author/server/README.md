# M5.1-B A：构建基础与静态边界

产品/测试已冻结，UI由B所有，独立浏览器/统一build由D执行；不冒称浏览器已通过。

buildApp.webAssetsDir显式构建根必须webOrigin；公开resolveWebAssetsDir用于CLI --web-assets-dir在mkdir/DB/listen前预检，拒坏路径/index、链接根、已知data目录/子目录。GET/HEAD根页与/assets/*先保Host/Origin再免cookie解析；实际普通index与js/css可发布，目录、链接、dotfile、map、任意扩展、缺文件404，无SPA/API兜底。CSP self/no-inline/no-eval、frame/base/form限制、nosniff/no-store。可信build目录应在检查与发送期间稳定，不宣称抵挡同UID恶意改目录的原子FS安全。

## 真实检查

首pnpm exec在test前拟隐式install被NO_TTY拒，未运行case。直接runner首5为4pass1fail：编码..被URL规范化出静态域，原鉴权401而fixture误期待404；仅WS03诊断仍fail，日志保留。父准无凭据401+合法Bearer404且无哨兵双条件后受影响1组通过；最终真实root pnpm test静态5/5 exit0。未放宽权限/弱化assert。

source-noEmit首次0；最终pnpm exec tsc含server/CLI/新test亦0（noemit-final.json）。A无wholebuild/fullsuite/browser执行。5组覆盖静态坏cookie/原API、Host/Origin/无SPA、非发布路径/链接、显式配置早拒无data创建、invalid组合先于storage配置。D统一最终验收待执行。

## 安装与标准入口

首受限store SQLite open失败；managed次CI frozen/override mismatch退出，均保留。根明确窄允许复用既有/Users/sakimi/Library/pnpm/store缓存避免重建native，不读/改user rc或Agent配置。--no-frozen-lockfile、公开registry、空npmuser/globalconfig、ignore-scripts/ignore-pnpmfile实际9.4s exit0；版本/许可证见dependency-receipt.json。无lifecycle/browser download，原SQLite真实开闭成功。

pnpm11.7自动新增3精确Playwright release-age例外，不是关闭政策。父准offline frozen refresh5.3s exit0、pins/lock/workspace前后同hash，纠正minimumReleaseAgeExclude状态差异。但ignore-pnpmfile state遗漏pnpmfiles：run默认[]比较不等；强制同ignore设置则for-of undefined不可迭代（installed pnpm.mjs:193960、194123、246820）。不手改state/升级/继续install。父准项目verifyDepsBeforeRun:warn，保真实依赖警告、防普通scripts隐式install。root标准test实际5/5，不称无warning/完整依赖状态健康；该警告是已定位state键，不是未装包。

标准scripts前缀：npm_config_userconfig=/dev/null npm_config_globalconfig=/dev/null CI=1 pnpm <script>；真实作者完整allowlist/argv/exit见json receipts，HOME仅原值透传，无CODEX_HOME。原首失败/各必要纠正未覆盖。
