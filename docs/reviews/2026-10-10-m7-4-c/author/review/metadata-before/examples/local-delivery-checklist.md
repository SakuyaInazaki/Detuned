# 本地交付核对清单

从[README快速开始](../README.md#本地快速开始)使用真实built CLI，不假设已全局安装detuned命令。运行前已有Node/pnpm及构建产物；数据/bootstrap/token放仓库外新私有目录，mkdir存在即停止、set-eu/umask077/noclobber，token单独wx0600提取。JSON不是token-file，admin只用于管理，参与者各用独立普通actor/限定scope凭据。

| 项目 | 实际证据/限制 |
|---|---|
| 本地启动 | M7.4-B真实CLI init、live/ready、close0/null、同DB无新token reinit和restart有限通过 |
| 生产布局 | Docker review三COPY与递归workspace/dist closure及同checker负例通过；当前镜像未构建/启动 |
| CI源 | 原install/build/type/lint/test:all保留，退役两旧archive探针；维护T01–T11保留，远端CI未新运行 |
| 当前数据库 | schema6；普通serve不自动迁移，升级/备份恢复用既有[升级](upgrade-recovery.md)/[备份](backup-recovery.md)指南 |
| 运行条件 | 本机Node26实际证据；最低Node22.19契约、clean install及当前Linux容器未新认证 |
| 接入 | Pi固定SDK/dsh官方plugin有限；Claude原八工具历史、新checks native未认证；Codex保护阻塞，见[矩阵](../integrations/compatibility.json) |
| 分发 | root package private=true/version0.1.0-dev保持；v0.2是本地工程目标，非npm发布/公网部署授权；许可证待维护者决定 |
| 研究 | 无模型D01与58固定案例不是AI研究收益或数学证明；M8另评 |

quickstart的init/serve/两普通身份配置三个shell块已有一次有限文档smoke：仅替换自有私有目录/loopback端口，真实两distinct非admin限定同space read/write及me、normalserve close0与登记group/root/control absence已证；未执行install/build块，不证明用户HOME路径或原3000端口实测。见[收据](../docs/reviews/2026-10-10-m7-4-b/verification/doc-smoke-first.json)。新引入的静态COPY修复不能升级旧Linux证据。下一步是可选Codex隔离实验，禁止前端、VM/Colima操作及全局Agent配置修改。用户手动运行前台服务不代表授权Agent启动常驻环境。
