# M7.5-A planning 独立静审

当前结论：闭包与固定工具前提准备通过；执行路线文档需先与 root 已选 158-file 方案一致，再审 D runner。没有运行 Node、pnpm、安装、测试或子进程；仅读实际指定材料和静态哈希。

## 必须收敛的任务歧义

planning/task.md 主命令段仍规定“只run上述8文件”，完整 backend 尾段则为 option，允许单次 vitest 或逐文件 alternative；ownership.md 同样称 additional option。正文仍留每文件60s及预算待选，没有落实 root 已定单次 vitest worker1/fileserial、full tests900s、总1800s、logical/allocated各2GiB及精确2 archive例外。执行前应仅文档确认已选路线覆盖旧 focused/alternative，不能让 runner 自行选路线或减测试。此为计划一致性阻塞，不是扩大实验。

## 独立闭包核对

实际解析 ownership 两个 JSON 清单189/195项，并集371文件；逐项 regular文件 bytes/SHA 全吻合，158个 .test.ts。相对源码 import 静态闭包没有发现遗漏；所指 dist 与安装后 package node_modules 是预期新 build/install 产物，必须禁止旧产物复制。m2-typed-writes.test.ts确实引用两 legacy 文件，现存 thread .ts 对应 .js specifier；两文件27402B与清单hash吻合，仅这两档案源需要例外。两 Web input parser 明确不在并集；其余 web-auth/static tests 是既有后端 HTTP/权限路径，未引入 packages/web 源码或浏览器。m7-delivery-layout 的 workspaces() 枚举九包manifest、递归从CLI依赖验证 Dockerfile文本，不要求复制Web包；读取 Dockerfile 不执行 Docker。

## 工具与安装策略

固定现有 pnpm manifest/真实入口静读为11.7.0、Node>=22.13，Node22.19.0满足工具声明；入口实际使用 dist/pnpm.mjs，而非不存在的 pnpm.cjs bundle。本审查不据 engines 宣称实际最低Node兼容成功。pnpm实际源码中 ignore-pnpmfile/cache-dir/state-dir/userconfig、global virtual store及side-effects cache存在；config读取 global pnpm YAML，默认 global virtual store 可启用。因此 D runner必须用真实 v11有效 CLI/env/YAML键强制私有config/cache/store/state/virtualstore及关闭global virtual store/sideeffects/版本自动管理，不能把空npmrc或CI=true当作这些全部已关闭的证明。只读原 pnpm工具代码允许，不能复用工程/global依赖缓存。

原 allowBuilds esbuild、ignore-scripts/ignore-pnpmfile安装与显式rebuild esbuild是窄策略；SQLite仅既有13.0.3预编译smoke，不授权gyp/prebuild下载器或其它dependency生命周期。root已选九后端包顺序build；storage脚本只写副本schema，原工程manifest/lock/source/dist必须复核。Node官方包固定hash必须下载后比对再安全解压，不凭规划引用当下载成功；网络/版本切换/缓存隔离及所有子孙实际清退留待 runner静审与授权执行证据。

无模型/nativehost/VM/全局配置/前端范围扩大。未验证安装、网络、2GiB闭包实际资源或Node22运行；full通过只能由未来新真实158-file receipt支持，不叠历史967/155。
