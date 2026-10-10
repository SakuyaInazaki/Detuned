# M5 部署与出口事实（只读，2026-10-09）

本轮不实现部署、不安装或启动容器；E2 产品冻结保持。路线与运行预算由主代理冻结。

## 已有材料与缺口

- 仓库未发现 Dockerfile、compose YAML、`.dockerignore` 或项目 LICENSE/COPYING/NOTICE；不能把第三方 MIT 许可当作本项目许可。公开分发前需明确项目许可。
- `.github/workflows/ci.yml` 已在 Ubuntu、Node 22、pnpm 11.7.0 下 frozen install → build/typecheck/lint/test:all，并执行两旧 R3 探针；没有镜像、干净部署或卷恢复任务。
- 已有 `examples/web-local.md`、`examples/operations.md`、`examples/backup-recovery.md`、`examples/upgrade-recovery.md`；Web 本地指南明确尚未验证生产 TLS/反向代理/容器/干净安装。

## 真实运行边界

- 根 engines 为 Node >=22.19.0 / pnpm >=9，packageManager 为 pnpm 11.7.0。本机实际 Node v26.3.0、pnpm 11.7.0、Darwin arm64，已安装 better-sqlite3 13.0.3；本轮没有再次打开 native DB，也未验证 Linux 镜像 ABI/prebuild/编译工具链。
- CLI `serve` 默认 `127.0.0.1:3000`，支持 data-dir、Web assets/origin、显式 loopback HTTP、资源/写速率限制、默认 10 秒关闭预算与请求日志开关；没有 TLS certificate/key 或原生 HTTPS 选项。数据库必须先 init，整个 data-dir 包含 DB、锁和附件存储，不能只持久化 SQLite 主文件。
- `--web-allow-insecure-loopback` 要求监听 host 为 loopback；不能直接将它改成容器内 0.0.0.0 后声称 Web 可安全公开。HTTPS origin 与 exact Host/Origin、Secure cookie 的部署接点需实际验证，现实现不信任 X-Forwarded-*；TLS 终止方案待裁。
- Web assets 是可信且稳定的构建目录，不能与 data-dir 混放；现静态服务限定编译资源，非任意目录浏览。init/恢复管理员明文只成功 stdout 一次，不能烘焙到镜像、compose 或验收日志。

## 本机容器条件

- `command -v docker` 为 `/opt/homebrew/bin/docker`；仅 `docker --version` 返回 Docker 29.8.0（build 88096ef005）。podman 未找到。
- version 命令使用新私有空 DOCKER_CONFIG、显式 `unix:///var/run/docker.sock` 与 env-i，之后删除空目录；未读取用户 Docker 配置，也未调用 daemon/context/login/pull/build/run。daemon 可用性未知，不能把 CLI 存在计作容器运行通过。

## 下一最小交付候选与验收（未实施）

- 候选文件：单服务 Dockerfile、`.dockerignore`、compose YAML、一个部署/恢复教程、隔离 `scripts/integrations/deployment/` 验收入口及必要 CI 接点；项目许可由有权者决定。先明确固定 Linux Node/pnpm、native SQLite 构建范围、非 root UID/卷权限、可信 assets 与精确 public origin，禁止新增模型/provider 服务。
- 干净环境：原锁安装与构建、native DB 开闭、匿名最小 health、普通 human 登录/读取/写入/退出、静态 CSP 与 cookie/origin 正反例；记录实际平台，不外推全 OS。
- 持久卷：重启后研究数据/登记附件/幂等结果/pending 保留，SIGTERM 先取消并等待 finally/显式 FD 关闭再 DB/严格锁释放；不自动 ACK。协调 sidecar 不作业务数据零写承诺。
- 恢复演练：停服务 → 既有离线 backup → 不存在的新目录/卷 restore → 新凭据登录，旧凭据/游标失效；源保留、备份私有、不覆盖、不把 backup 目录作为 runtime。保留已文档化发布持久性与管理员 token 未交付边界。
- docs08 M5.3 的 D01 v0.1 步骤 1–4/非正式摘要，以及 M5.4 的 20-client/干净安装恢复需明确具体场景和预算。既有 600 秒规模证据可按未变下层引用，不默认再跑；镜像相关性能由主代理另定。正式评审/model/完整宿主不因此获得认证。

当前明确未决条件：本机 daemon/容器运行权限、公开基础镜像获取与 native 构建预算、TLS 终止与 host 映射方案、项目许可。以上缺口不是既有论坛功能失败。
