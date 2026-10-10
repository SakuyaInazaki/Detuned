# M4.3-B：官方 patch 加载与配置热重载

状态：任务书已冻结；M4.3-A 尚待父接受。仅在 A 包验收与 C fresh baseline 完成后开工，本文件不表示本包已实现。

## 目标与来源

复用官方固定 SHA `5badb15009ae1756c3afe0ae0cef1faafc290ccc`、已持有源码及同锁依赖，不新安装。沿已验 plugin/registry 入口，补齐官方配置加载和真实配置文件 watch；只用私有 loopback HTTP、owned 配置与最小 env，不用真实账号、模型或全局 profile。

1. 用官方 `loadOverlayPatches` 与真实 Loader/Include 加载最终 patch 样例（只替换私有 Node/built 桥/token-file/URL 路径），实际发现并调用工具。
2. 最小 runner 加入 `--expose-internals`，有限试跑真实 `Loader.internal` 构造，成功后挂官方 Hmr service 的 `watchConfig`。真实修改私有 patch，从 actor A 凭据切换到 B；观察真实文件事件驱动 Include/loader 重装。

只验配置热重载，不外推模块代码热替换、完整 dsh CLI、模型或全部宿主认证。所有正式 run 最多三分钟；不得在冻结前执行本任务。

## 文件所有权

| 作者 | 最小范围 |
|---|---|
| A | 新 `scripts/integrations/dsh-runtime/loader.spec.ts`；窄扩 `launch.mjs`/`experiment.config.ts`，仅显式 `--suite plugin|loader`，默认保持既有 plugin。保 preload 与已验 runtime.spec 原行为。 |
| B | `integrations/dsh.md`、`integrations/dsh/cordis.patch.example.yml`、`examples/dsh-mcp.md`；验收后仅更新 compatibility.json 的 dsh 条目，其他宿主与当前状态未经授权不改。 |
| C | fresh baseline、独立验收与最终证据/状态文档；依实际错误契约选择 invalid patch 或取消竞态，不复制作者场景。 |

不新增通用框架、依赖、provider、core/SQL 或全局配置；不 mock setup、传输、SDK、registry 或 Loader.internal。

## 最小验收

- 作者至少两例：官方 config 实际激活；真实 watch 配置换身份。工具精确八个，实际调用经官方 registry，不从静态命名公式冒称发现。
- A→B 切换中旧 bridge 与在途 poll 完成退净，不 ACK；新 call 的 DB author/空间确属 B，A 凭据不串入 B。原论坛材料及未确认消费状态保持既有协议。
- 最后 watcher、loader、scopes、root 全部清退；用实际资源与事件证据说明，不以 SDK close 返回代替全部清理。
- 动态配置失败至少不能留下危险混合身份或业务副作用；是否保留旧配置/回滚，由首个真实实验确认后父裁定，预先不承诺完整事务回滚。
- C 独立核异常或取消边界，并保留首次失败/修正、实际 exit、耗时和来源 hash。凭据仅私有 fixture，证据不存 token 或敏感正文。

## 失败取舍与交付

若官方 Hmr、Vitest 与 internal 接点不互通，保留首失败并向父报告，不偷偷换 mock/fakeInternal。父可据事实另选公开 exact-path watcher + Loader 的有限路线；未经裁定不扩大实验。

先 C fresh，后父冻结精确接口；A/B 有限检查与 hash freeze，C 核 launcher 语法、默认 plugin 向后兼容的必要 smoke、新 loader/HMR 定向及独立 case。本包预期只改独立 runtime 脚本和指南，不默认重跑615主套件、四 core gate 或 current29；只有主产品变更或实际疑点时，由父另选检查。只在实际改动或具体归因后复验。旧 review、SQL/schema/archive/HEAD 与已验 plugin 证据原样保护。

交付须分开说明：官方 patch 激活、配置 watch 重装、独立异常验收与未验完整 CLI/模块 HMR。后续 Pi 真实 loader/T20 仍另包决定，不因本包通过提前标 M4 整体完成。
