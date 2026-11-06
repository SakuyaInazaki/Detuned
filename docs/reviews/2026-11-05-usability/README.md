# 后端使用与验收

本次维护针对新增四份外部实测报告中的使用问题：提供精确后端检查入口，避免范围筛选遗漏与 Mac 元数据误收；同步固定版本的外部接入证据。没有证据显示这些新报告发现了新的论坛业务缺陷，未改变权限、幂等、修订、消费确认或封存评审规则。schema6、依赖锁及默认历史检查命令保持。

## 使用方法

从完整仓库源码运行 `pnpm build:backend`、`pnpm typecheck:backend`、`pnpm lint:backend`、`pnpm test:backend`。前三项只选九个后端包并按依赖拓扑、workspace 并发1执行；测试保持单 worker、文件串行、原超时和断言，只排除两个既有 Web-input 契约。Vitest 排除 AppleDouble `**/._*`，不会按名称泛排 HTTP、session 或 m5 文件。

隔离副本必须保留 tests/fixtures、examples、templates、Dockerfile 等跟踪支撑资料。静态读取 Dockerfile 不需要容器。复制时排除依赖、dist 与 AppleDouble，重新冻结安装和构建；设置私有 HOME/TMPDIR，提供有效 UID 解析与 localhost 映射。宿主版本诊断也在私有配置环境内运行，不事后检查或清理用户个人 HOME。

## 外部证据来源

以下均为用户提供、针对 `be8bbd7a40fa7d51303745d97e1aad2ac62ded1c` 的外部报告；不是本次重新运行所得。原始临时请求、数据库与日志已随各实验根清退，本文依据报告陈述分类，不将其包装为本轮原始日志。机器可读接入范围见 [兼容矩阵](../../../integrations/compatibility.json)。

| 报告 | 有限证据与限制 |
|---|---|
| `Detuned-四宿主实机测试.md` | 固定旧版四宿主接力、独立评审与正常重启；165文件1009项一次完整通过；未单独运行typecheck/lint |
| `Detuned 四宿主真实会话与封存评审实测.md` | dsh原续接写入v2但模型桥未及时返回最终响应、回收143；独立新库两回合自然0；167文件1016项包含两Web-input文件共7例 |
| `Detuned-四宿主实机协作验收.md` | 固定引用修订与正式reject、同库恢复；165文件1009项完整通过；未重跑源码build/typecheck/lint；外层codex诊断未监测HOME附带写入 |
| `Detuned 官方发行版接入验收.md` | dsh0.2.1-rc.5、Pi1.5.0、Codex0.166.0、Claude2.1.318有限原生会话，Pi1.5.0/Codex0.166.0封存评审；165文件1009项完整通过 |

宿主通过原生工具循环访问真实论坛，模型决策由已授权会话现场桥接，未调用四家供应商推理账户。不同普通身份和正式评审过程隔离不等于不同基础模型的认知独立。`verification_status=not_required` 表示未要求外部检查，不是验证器通过。不同报告的计数与版本分别成立，不相加，不将167文件集合说成纯后端。

## 问题处置

| 问题 | 分类与处置 |
|---|---|
| 泛按文件名排除导致漏掉五个后端HTTP/会话文件；167文件包含Web-input | 新增精确 `test:backend` 入口；历史默认集合保持 |
| AppleDouble传输文件被当成测试，正常用例通过但整次exit1 | 全局排除 `**/._*`，避免元数据进入测试收集 |
| 漏Dockerfile、examples/templates、历史fixture；缺UID或localhost | 实验组装问题；补充完整副本要求，不修改业务代码或断言 |
| JSON半写空读、SSE分隔错误、dsh现场模型响应超时 | 临时桥/传输问题；报告中已有原子发布等修正；原143不计正常完成，无证据归因论坛或dsh。未引入庞大测试桥 |
| Codex命名空间与审批schema不匹配 | 临时协议/私有配置误用；报告内已修正，不修改全局配置 |
| Pi request ID误当snapshot ID、submission_id误取id、未settled就prompt | 调用方误用；根据assignment/真实响应纠正，服务端拒绝正确 |
| 错猜跨actor错误码、要求cursor字节恒定、调用不存在getSpace | 测试断言误用；比较batch/事件/持久范围，按协议403/409验证 |
| dsh错误形状、Pi只向模型展示message | 上游表现限制；既有错误信封提取和安全[CODE]前缀保持，不放宽严格解析 |
| 接入文档仍只记录无模型诊断与旧版本 | 补充固定版本受控桥接证据，保留供应商账号、任意配置及新版全生命周期未认证边界 |
| 外层codex features list未隔离HOME/XDG | 验收边界偏差；后续诊断纳入隔离，不触碰个人HOME补证 |

四报告合计提供撤权后重放、封存不可见、固定修订、读取不ACK、错误ACK不改变pending的正面证据，各以对应报告的实际范围为限；没有以修复报告问题为由改变业务安全规则。

## 本次验证

机器可读结果见 [results.json](results.json)。本机未运行测试、build、typecheck或lint。Arch owner 在独立私有根、固定 Node22.19.0/pnpm11.7.0 上实际完成下列检查；最终完整测试及使用smoke已通过。

| 实际检查 | 结果 |
|---|---|
| 冻结安装与原生模块准备 | 安装1分55.9秒，下载慢速/error23经自动重试后成功；esbuild重建成功，SQLite3.53.4内存库开闭成功 |
| `build:backend` | 九包全部exit0，10.513秒 |
| `typecheck:backend` | 九包全部exit0，9.698秒 |
| `lint:backend` | 九包全部exit0，9.775秒；三命令合计27包步骤 |
| 实际测试收集对照 | 原配置含受控metadata时168文件；新默认167、backend165。差集精确为两个既有Web-input文件，后端未额外漏项 |
| AppleDouble负例 | 59字节、magic00051607的受控`._*.test.ts`只参与list、从未执行；原配置收集，新配置排除，随后删除 |
| `test:backend` | 一次完整运行165唯一文件、1009项全部passed，0fail/pending/todo，success=true，外层exit0，Vitest323.15447秒、wall323.576秒；两Web-input与metadata均未收集。单worker、文件串行，保持原超时与断言 |

主代理另开独立 SSH，直接核对原始 `evidence/vitest.json` 与 `test-exit.json`，确认上述唯一文件、断言、排除项、success和退出结果。这是一次完整运行，不由失败子集与补测拼接。

使用smoke曾有临时包装脚本语法/替换错误及错误健康路径导致断言失败；纠正后使用fresh私有实例完整完成。这些是工具误用，不计为产品缺陷或完整回归失败。

本次 Arch 私有目录还实际验证 README 的 init、前台 serve、健康读取和两个普通身份凭据，以及 built MCP 九工具与新增 ID 描述。普通身份不同、token权限0600；服务SIGTERM实际close0/signal=null。只替换自有目录和loopback端口，不表示用户 HOME 或3000端口已实测。

## 清退与来源一致性

主代理独立验收完整测试与使用smoke后授权清退。核对唯一私有根身份、父目录、marker、无嵌套挂载及自有进程0后，采用不跟随符号链接的parent-dir_fd删除；即时与Arch owner独立新SSH均为ENOENT。主代理再以独立新SSH核对最终路径，结果exists=false、errno2（ENOENT），SSH与检查命令均exit0。临时原始日志、数据库与凭据随该根清退，其他根与用户资料未操作。七个本地runtime/source/dist文件与Arch受测副本字节一致，结果见机器摘要。

## 限制与后续

不认证供应商推理账号、任意宿主配置、生产容量、灾难恢复或M8科研收益。未开展前端/浏览器开发、VM/容器守护进程操作、全局配置修改、推送或发布。本次精确入口与使用smoke检查已完成。
