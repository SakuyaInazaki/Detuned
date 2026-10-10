# 本地交付核对清单


M7.5-A已获root有限接受：固定Node22.19.0 Darwin arm64与既有pnpm11.7.0，私有clean fixture install、配置/SQLite/esbuild及九backend build已验证；文件级组合验收为142文件904cases与16文件73cases，完整覆盖158文件977cases，组合0fail/pending/todo。逐文件完整替换，非挑选单case补齐；不是一次全绿流水线，历史失败及v3 full中断保留。未新安装pnpm工具链，不含Web、当前Linux或模型完整会话；许可证按用户决定暂未指定。
从[README快速开始](../README.md#本地快速开始)使用真实built CLI，不假设已全局安装detuned命令。运行前已有Node/pnpm及构建产物；数据/bootstrap/token放仓库外新私有目录，mkdir存在即停止、set-eu/umask077/noclobber，token单独wx0600提取。JSON不是token-file，admin只用于管理，参与者各用独立普通actor/限定scope凭据。

| 项目 | 实际证据/限制 |
|---|---|
| 本地启动 | M7.4-B真实CLI init、live/ready、close0/null、同DB无新token reinit和restart有限通过 |
| 生产布局 | Docker review三COPY与递归workspace/dist closure及同checker负例通过；当前镜像未构建/启动 |
| CI源 | 原install/build/type/lint/test:all保留，退役两旧archive探针；维护T01–T11保留，远端CI未新运行 |
| 当前数据库 | schema6；普通serve不自动迁移，升级/备份恢复用既有[升级](upgrade-recovery.md)/[备份](backup-recovery.md)指南 |
| 运行条件 | 本机Node26实际证据；最低Node22.19契约、clean install及当前Linux容器未新认证 |
| 接入 | Pi固定SDK/dsh官方plugin有限；Claude原八工具历史保留、D固定native九工具/check矩阵有限通过；Codex C.1归属修复已验、E/R1固定native九工具/check矩阵已有限通过（原失败历史保留），见[矩阵](../integrations/compatibility.json) |
| 分发 | root package private=true/version0.1.0-dev保持；v0.2是本地工程目标，非npm发布/公网部署授权；许可证待维护者决定 |
| 研究 | 无模型D01与58固定案例不是AI研究收益或数学证明；M8另评 |

quickstart的init/serve/两普通身份配置三个shell块已有一次有限文档smoke：仅替换自有私有目录/loopback端口，真实两distinct非admin限定同space read/write及me、normalserve close0与登记group/root/control absence已证；未执行install/build块，不证明用户HOME路径或原3000端口实测。见[收据](../docs/reviews/2026-10-10-m7-4-b/verification/doc-smoke-first.json)。新引入的静态COPY修复不能升级旧Linux证据。Codex E/R1与Claude D固定native矩阵已有限通过；禁止前端、VM/Colima操作及全局配置修改。用户手动前台运行服务不授权Agent创建常驻环境。

历史[C.1有限修复](../docs/reviews/2026-10-10-m7-4-c1/README.md)：focused4/4，reject-mcp4.311s通过，normal8.157s失败；独立自有组confirmed/ACK及候选/组/root/control清退已证。核心论坛、正式评审、回执与D01可本地使用；Claude固定D native九工具/check矩阵已有限通过。当前E/R1有限结果见下。

当前[D有限native结果](../docs/reviews/2026-10-10-m7-4-d/README.md)：Claude2.1.282 initialize/exact九工具、ordinary两写六读、非法prepare前0HTTP、500/scope/metadata/noACKpending/cancel通过；native143/null为TERM清退，driver0/null与候选/组/root/control absence已证。完整CLI/profile/model不升级。E/R1已实施并有限通过，见下。

当前[E/R1有限Codex结果](../docs/reviews/2026-10-10-m7-4-e/README.md)：核心论坛、HTTP/CLI/MCP、正式独立评审、外部检查回执及无模型D01已可本地使用，数据库schema6不变。M7.4-E/R1已获root本机有限接受：固定Codex0.144.6 initialize/exact九工具、19次工具调用、普通check两写六读及权限/取消/noACK矩阵通过；Claude D固定2.1.282对应有限native结果保持，Pi0.87.1公共SDK与dsh固定官方有限链保持。完整四宿主真实会话、T10/D02、当前Linux独立环境证据仍待；许可证按用户决定暂未指定；M8独立，后续前端取消。
