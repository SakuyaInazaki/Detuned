# 下一任务：M5.3-A 单服务容器与D01 v0.1组合恢复

本任务书依据根已定范围；已经根审核，M5.2-A TLS文档闭合和下一fresh完成后实施。当前仅计划，容器/干净安装/D01组合尚未验收，不更新主状态。

## 所有权与保护

- A：`scripts/integrations/deployment/d01-recovery.mjs`及必要同目录窄helper、`examples/d01-local.md`。
- B：`Dockerfile`、`.dockerignore`、`compose.yaml`、`scripts/integrations/deployment/container-health.mjs`、同目录构建/运行README、`examples/deployment.md`。必要最小CI工作流路径在fresh前登记，未经登记不扩修改。
- D：独立验收脚本与verification证据；不得用作者自报替代真实Linux/恢复独验。
- 初始零生产API/SQL/schema/依赖锁变更，旧review/archive/source保护；真实产品缺陷先保反例并报根，不自行扩大修复。禁止模型、用户配置/凭据、全局信任/主机全局安装、发布或推送。

## 容器冻结范围

1. 单服务native arm64，Node22 Debian bookworm-slim，开工核官方真实manifest后固定具体patch及官方digest，不能仅浮tag或猜digest。pnpm11.7与原锁frozen；仅esbuild/better-sqlite3必要安装脚本获准，不开放任意lifecycle。构建可用apt基础编译工具；必须在Linux实际加载native addon并开闭真实SQLite，不复制Darwin node_modules。
2. runtime固定UID非root，直接exec node CLI；完整持久data挂`/data`，可信编译assets独立，TLS cert/key只读挂载。容器不自动init，操作者显式初始化；保必要workspace布局，未经实证不用pnpm deploy裁依赖。镜像尺寸优化不属本包目标。
3. compose默认宿主绑定127.0.0.1，HTTPS精确webOrigin。证书/私钥/token/data/review运行凭据不得进入build context/image；.dockerignore与独验共同检查。展示命令只用占位私有路径。
4. health仅匿名loopback且正确HTTPS验证；不设置全局NODE_TLS_REJECT_UNAUTHORIZED=0、不吞CA错误。自签验收只给probe显式自有CA，不称公开PKI。TLS配置/端口/持久目录按真实CLI接线。

## D01组合脚本冻结范围

- 真实CLI init/serve标准dataDir，A/B/C独立普通身份由HTTP管理建立，权限限空间。步骤1–3保错误原提案、真实三点反例、带范围failure、C检索并引用固定修订改进；不伪造评审/accepted。
- 建立pending后真正停止服务器和C客户端，重启二者并核新PID。C仍读原pending及固定材料，不自动ACK；同key重放业务/事件/幂等条数无重复。上传并关联附件，保owner/ref/state与真实下载SHA/bytes。
- 发布有固定来源refs、明确非正式的typed summary。先核现schema能承载所需字段；不适用时报根，不能草率以note冒充summary。原反例不抹除、不错误关闭，来源不进入正式认证语义。
- 停服后执行offline backup到新目录，再restore另一个新目录。保源/好备份；恢复管理员只用于给原普通actor重发限权凭据。旧token拒、同actor新凭据仍拒旧签名cursor；新poll保原pending并签新cursor，随后仅显式ACK。恢复不自动激活禁用身份。
- 可在宿主已built和容器冷build运行同脚本。client-key-store/token-file是外部材料，不声称物理backup包含它们；原目录重启保secret/token与restore轮换secret/撤旧凭据必须分清。
- 所有child/PID/group/HTTP/FD注册，启动、操作、关闭watchdog有界；失败也清退并保首真实日志。私钥/token仅私有tmp/内存/IPC，公开证据只白名单、hash/数量/身份占位与结果，不输出原敏感响应或凭据。

## 验收与交付

- 真正冷build/native arm64 Linux容器运行、nonroot、正确CA HTTPS health、显式init、wholedata重启持久、只读TLS挂载与context/image秘密排除。
- 真实D01步骤1–4+来源summary、同key副作用唯一、pending恢复/不隐式ACK、固定材料/附件SHA、backup新目录restore与旧凭据/游标隔离。
- 20 clients只做≤60秒有限争用/持久恢复smoke，明确非容量认证；不重跑600秒历史benchmark。
- DockerCLI存在、compose静态解析或镜像构建成功均不能替代Linux实际服务/SQLite/恢复结果；未能运行层必须准确not_tested并给具体阻碍。
- 保首失败、实际命令/exit/elapsed/资源清退/版本digest/许可和构建输入hash。必要适用build/type/lint与独验范围由根按实际改动冻结，不预填通过。

本包之后仍需核完整M5出口；M6正式评审/M7验证门禁继续，不将此v0.1演练当科研结论或四宿主模型认证。TLS当前包和旧证据不回写；fresh前不得实施或安装。
