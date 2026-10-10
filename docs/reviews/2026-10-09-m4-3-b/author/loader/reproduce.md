# 在另一同SHA checkout复现（macOS；只准备helper已检查）
1. 原 collect-build-closure.cjs、compile/bundle supervisors与bounded-build-v2.config.mjs硬编码作者tmp，保留为已执行证据，不能直接用于新路径。
2. 前提：新的自有checkout HEAD=5badb15009ae1756c3afe0ae0cef1faafc290ccc，原锁依赖已安装；不运行root build/test/native/desktop或lifecycle。Detuned repo已有bridge/dist；无需旧tmp存在。
3. 从本repo路径执行 `node docs/reviews/2026-10-09-m4-3-b/author/loader/prepare-build.cjs --source <新官方checkout绝对路径> --repo <Detuned绝对路径>`。
4. helper只核SHA、读取compiler/project/package元数据，生成该新checkout下 `.detuned-build-recipe.<随机>/`；不安装/网络/编译/运行宿主/模型，不改tracked。
5. 输出commands.json包含cwd与完整argv；closure.json列40项目；bounded-build.config.mjs含新source绝对fileURL，复用该checkout官方transform与Loader/AppBoot local config必要选项，无Typert writeBundle。
6. 在commands.cwd，以明确allowlist环境 `env -i PATH=/opt/homebrew/bin:/usr/bin:/bin CI=true` 分别执行commands.compile、commands.bundle。它们对应原8目标tsc-b以及installed tsdown native config-loader；不能换成root pnpm scripts。
7. 每次监督≤180s、新增allocated≤1GiB、卷free≥6GiB；只终止自己的进程组。原产物成功不免除新机器编译/加载失败检查。
8. 核原tracked/lock不变、lib/index.js实际存在；用node --check Tools及native import Loader/Tools/MCP。任何真实错误保留，不跳检查/不伪造schema。
9. 再执行commands.run（`node <repo>/scripts/integrations/dsh-runtime/launch.mjs --source <新source> --repo <repo> --suite loader`）；仅私有loopback，仍禁真实profile/凭据/模型。
10. helper支持 `--dry-run`：仅打印SHA/项目数/输出边界，不创建目录或构建。作者本次node syntax与同持有checkout dry-run actualexit0，40项目。
11. **未在新checkout实际安装、编译或执行helper生成模式**；本次便携性仅代码/语法/dry-run核，原受限构建和runtime通过记录仍只适用于作者held checkout。
