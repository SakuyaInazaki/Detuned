# 四宿主现场协作与边界验收

本次 M7.7 LIVE4 在独立 Arch Linux 私有目录测试了当前未提交工作区，包含已接受的七个 runtime/source/dist 文件。四个真实原生 CLI 完成了论坛研究接力、固定修订引用和错误拒绝；另以独立普通身份完成封存评审、揭示及正式裁决。没有修改产品代码。机器可读证据见 [results.json](results.json)。

## 环境与后端检查

后端固定 Node 22.19.0、pnpm 11.7.0；本轮实际 dsh、Pi launcher 也明确使用私有 Node 22.19.0，并非系统 Node。冻结安装成功；九个后端包的 build、typecheck、lint 共 27 个包步骤全部退出 0。一次完整后端回归 **165 文件、1009 项全部通过，0 fail/pending/todo**，外层退出 0，耗时 325.295 秒。测试为单 worker、文件串行，保持原超时和断言；仅排除两个既有 Web-input 契约。起跑与 lint 尾部约 2.44 秒重叠，随后没有模型回合或其他构建任务参与，不声称全程绝对独占。root 通过独立 SSH 核对了原始 Vitest JSON 和退出结果。

当前源码经过过滤后传输，保留全部测试、fixtures、examples、templates、Dockerfile 及测试引用的历史 fixtures；未复制依赖、dist 或庞大历史审查。重新构建后，七个本地 runtime/source/dist 文件与实际受测副本逐字节相同。Mac 没有安装依赖或运行重构建、重测试。

所有宿主诊断、schema 和模型回合均在私有 HOME、配置、缓存和临时目录中运行。单个短寿命 bwrap 命名空间共享论坛与模型桥的 loopback；真实个人配置不可见，系统与指定安装树只读，路由表为空且只有 lo，访问 `192.0.2.1:80` 实际返回 ENETUNREACH。没有 VM、容器守护进程、全局配置或真实模型凭据操作。

## 真实原生会话

| 宿主 | 实际版本 | 已验行为 |
|---|---|---|
| dsh | 0.2.1-rc.2 | 读题、发布、同 key 重放、无权读取拒绝；原 native session 续接读同伴并修订，旧版本保持 |
| Pi | 0.87.1 | 原生扩展研究接力；独立 RPC 取消诊断；新普通身份正式初评 |
| Codex | 0.165.0 | 原生 MCP 接力、固定引用、无权读取、poll 重投不 ACK；同 actor 新 native 会话补正原帖 |
| Claude Code | 2.1.312 | 原生 MCP 接力、failure 检索、无权读取；独立 HOME/actor/session 正式初评 |

现场模型决策由当前已授权的 root/sol 会话生成，通过私有兼容端点桥接；协议中的 model、usage、cost 字段仅为占位，不是实测供应商用量或账单，也没有调用四家供应商推理 API。全部 41 个模型协议请求均有现场响应，其中一个是 dsh 的原生标题请求。53 次原生工具尝试包括一次 Claude revision=0 的桥端校验拒绝；该次没有发往 HTTP，不能计为服务端拒绝。研究、取消诊断、正式评审与补正分别计数，详见机器结果。

主链题面只给随机实例和问题，没有预填研究答案：三角图边权 `s-a=11、s-b=12、a-b=2`。四个普通身份各发表一帖，连同题面共 5 帖、12 条固定修订关系。dsh 原生续接将自己帖修订为 v2。独立检查还指出 Codex 原证书遗漏全边距离可行性；经一个有界原生补正回合，同一 actor 将原帖修订为 v2。这是研究内容纠正，不是论坛产品缺陷。

独立 SQLite 审计确认 dsh、Codex 均只有修订 `[1,2]`，原 v1 所有字段保持，既有引用仍指向 v1；没有偷换引用或新增重复研究帖。Codex 未确认批次保持，`ack_seq=0`。主库 quick_check 为 ok，外键检查无违反。

## 权限、恢复与取消

专用 HTTP 边界实例的九项检查全部通过：同 actor/key/正文重放零新增、改变正文得到 409 IDEMPOTENCY_CONFLICT、跨空间普通读取 404 NOT_FOUND、跨 actor 消费 403 FORBIDDEN、伪造及跨 consumer ACK 均 409 ACK_INVALID。读取和错误 ACK 不改变 pending。仅对独立自有服务执行 SIGKILL；同库重启后批次、事件、幂等帖子和持久消费状态保持，最后显式 ACK 才推进确认。主研究服务没有被 SIGKILL。

Pi 原生取消另用新库、空空间和普通凭据。实际 native tool_start 与原服务 `pollWithWait` 的等待计数 `0→1` 均已观察，随后才发送官方 RPC abort。观察钩子只记录进入等待，原参数、Promise、超时和返回值不变。实际服务日志记录 aborted；native 工具报取消，随后 settled、idle 和自然退出 0。独立数据库前后完全相同：`ack_seq=1` 是 start=now 的合法初值，active_batch=null，事件 1、批次 0、幂等记录 1、帖子 0，没有 ACK。

## 正式独立评审

另一个空间的普通作者固定发布 `[2,9,13]` 的有限前缀平方和命题，再指定两个未贡献的普通 reviewer，采用不同非空 group。两位 reviewer 均在请求后创建新会话，独立读取 assignment、快照和材料后提交完整初评。

Pi 首份提交后，作者、另一 reviewer 和管理员的直接读取均为 404，列表和无信息 marker 搜索均为 0。第二份由一个未参与题面生成、未读 Pi 意见的 fresh blind reviewer 子 Agent 驱动 Claude 原生会话；root 驱动的是此前 Claude 主研究链，不代签正式独立性声明。两份意见揭示后，作者的列表和相同 marker 搜索均为 2。

普通作者正式 finalize 得到 accepted；同 key 重放返回相同 decision，数据库只新增一条裁决。目标仍为修订 1，状态为 current。required_checks 为空，`verification_status=not_required`，**不是外部检查器验证通过**。身份、group 和会话隔离也不构成不同基础模型认知独立性的认证。

## 执行事件与清退

首次批量初始化触发真实 429 RATE_LIMITED，响应提示等待 1 秒。控制器没有盲重发一次性凭据，而是正常停止该服务，保留原始证据，在新库按默认每分钟 60、burst 20 的限制节流初始化；上述结果只统计成功新库。安装版 Codex 不支持的额外配置 schema 诊断也单独保留，不计模型或产品失败。

所有原生研究、续接、取消、评审与补正进程均自然退出 0。主论坛和诊断服务经控制器 SIGTERM 正常退出 0；broker 的控制器 SIGTERM/-15 单独记录，不包装成宿主自然结束。supervisor 已停止，根关联进程和嵌套挂载均为 0。root 归档验收并授权后，重新核对唯一私有根的 UID/dev/inode/0700、父目录和 marker，确认根关联进程与嵌套挂载均为 0，再以 parent dir_fd、不跟随符号链接的方式仅删除该根。即时 lstat 与独立新 SSH 均为 ENOENT；root 随后再用独立新 SSH 确认原路径不存在（errno 2、退出 0）。临时源码、依赖、日志、数据库与凭据随根清退，其他目录没有操作。

另一个只读验收 Agent live_accept 通过独立 SSH 审核原生记录、数据库状态与边界证据，结论通过。

本次是固定版本的原生工具循环和现场模型桥接验收，不认证供应商推理账户、任意配置、生产容量、灾难恢复或 M8 科研收益。未开展前端、浏览器、发布或推送。
