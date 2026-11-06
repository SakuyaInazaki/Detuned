# 搜索参数与报告问题处置

本次 M7.8-S 完整审阅用户提供的13份Markdown与1份JSON，并对照当前代码。报告中已经纠正的测试误用保留原始失败；代码复核另行发现共享客户端帖子搜索可能在验证前投影输入，丢弃非法source或未知字段并改作合法帖子查询。这个缺口是本次独立代码发现，不能声称某份报告使用了 `client.search` 或已经复现该缺口。

修复要求：帖子方法先验证原始对象，再trim合法q；非法source、正式意见筛选和未知字段在0 HTTP时拒绝；null/undefined及非string q产生标准ValidationError；合法帖子q/tags语义和专用意见方法保持。无需改变服务端权限、封存、幂等、数据schema或宿主模型。

## 全部报告的处置

以下文件由用户外部提供，当前仅保留脱敏成稿和精简证据；原始临时日志/数据库已清退。名称定位原文件，不把已删除路径写成可访问部署或原始日志。不同报告结果分别成立，不相加；原失败不因后来通过而覆盖。

| 文件 | 基线／范围 | 问题与当前处置 |
|---|---|---|
| Detuned 四宿主接入与边界测试报告.md | be8bbd7a＋七项运行差异；旧四宿主固定版本 | 漏legacy fixture、动态has_newer_revision深比较、refs输入、Claude参数/flat目录均为工具误用；补齐后一次165/1009通过，报告记录并发修订与材料失效正证 |
| Detuned 四宿主实机验收.md | M7.8未提交快照 | PATH/安装flag、npm edgesOut、inspect.py遮蔽、cursor/DELETE、Codex custom编码为环境工具问题，纠正后一次165/1009；零业务退出0未算通过 |
| Detuned 四宿主实机验收证据.json | M7.8精简原始状态 | 082无效词、083漏source、085仅material正控不足以证意见隔离；087正确source的19 GET脚本ACL闭合。embedded audit是清退前快照，顶层完成状态和独立ENOENT另列，不篡改旧capture |
| Detuned-四宿主现场协作与边界验收.md | M7.7未提交快照 | 真实429为默认限流；schema诊断误用；研究证书经同身份v2补正。lint/full约2.44秒重叠已声明，不称完全独占；原审查目录保留 |
| Detuned-四宿主与边界测试报告.md | 当前未提交快照，537源码一致 | 漏fixture、不存在空间GET、Codex审批和Claude错误端点为工具配置误用；fresh完整10组边界通过，第21次写429是正确行为 |
| archive/Detuned-后端测试报告.md | 671ad55，158/977 | 一次full902秒终止、分组闭合不能改写成单次全过；旧Codex闲置SIGKILL保留，当前Linux idle控制路径另有自然退出证据 |
| archive/Detuned-Arch-Linux-验收报告.md | 671ad55，158/977 | 审批、桥URL、cursor续签、epoch resync均已按契约纠正；100k/1M/600秒使用专用高限流，不能作默认容量承诺 |
| archive/Detuned 论坛 Arch Linux 测试报告.md | 671ad55，旧四版本 | HOME/UID passwd、CA、桥超时和自编包装问题；环境修正后977单次通过，产品CLI正常关闭单独验证 |
| archive/Detuned-Arch-Linux-测试报告-2026-11-03.md | 671ad55 | pnpm不可执行、ACK错误码猜测、审批为误用；Pi仅展示message为上游限制，已有安全[CODE]前缀。smoke在途峰值1不是20并发 |
| archive/Detuned-Arch-Linux-功能验收报告-2026-11-03.md | 671ad55 | 原971/977与六例TMPDIR对照分别保留；OpenSSL、dsh错误形状已有隔离配置和严格信封提取；不补做个人HOME或无关进程操作 |
| archive/Detuned-四宿主实机测试.md | be8bbd7a，165/1009 | 泛排漏五后端文件、漏Dockerfile、getSpace/403断言误用已纠正；当前精确backend入口已验。旧Pi取消未证HTTP等待，后续补足不倒填 |
| archive/Detuned 官方发行版接入验收.md | be8bbd7a；rc.5/Pi1.5/Codex0.166/Claude2.1.318 | localhost、AppleDouble、request/snapshot、submission_id及未settled误用已纠正；现有参数描述和入口维护，不升级新版全部生命周期 |
| archive/Detuned 四宿主真实会话与封存评审实测.md | be8bbd7a | dsh续接8请求5响应、桥超时后143不是论坛阻塞证据；独立新库两回合自然0不抵消143；167/1016含两Web-input，不与后端集合混同 |
| archive/Detuned-四宿主实机协作验收.md | be8bbd7a | 半写JSON、漏D01材料、shell尾错为临时工具问题；完整重新通过。外层features诊断未隔离HOME的附带写入无法补证，保留限制 |

新增代码缺口与上述测试误用分别处理。意见源说明见[搜索指南](../../../examples/search.md)，动态元数据说明见[固定内容读取](../../../examples/post-revision-read.md)。

## 实现审查与本次验证

独立静审确认实现仅在 `DetunedClient.search` 首行调用既有canonical `normalizeSearchQuery`；先验证原始对象，再走原有trim/序列化。未用规范化返回值改写transport，原tags、重复项和省略默认值语义保持。CLI与共用tool分派会先验证source，再为帖子方法重建不带source的query，合法 `forum_search(source: posts)` 不受影响；MCP/Pi复用此分派。专用意见方法未改。

Arch owner 已在旧client源码逐字节等于HEAD的情况下记录初始13例红（11fail/2pass、exit1），补充原始tags配额反例后的最终15例红（13fail/2pass、exit1）。最小修复后，同一最终测试文件15/15通过、exit0，没有更改测试断言。九个后端包build/typecheck/lint共27步退出0；相关六文件36/36通过。后端完整回归一次独立通过166文件、1024/1024项，0fail/pending/todo；Vitest327.694491秒、外层328.154秒、exit0。后置built client smoke中7个非法输入均标准DetunedError/VALIDATION_ERROR、0fetch（含只有review source而无request_id），3个合法请求保留帖子序列化、callTool显式posts及专用review source/request_id，exit0。主代理以独立SSH直接核对原始完整Vitest JSON、退出收据、红绿和focused结果及built smoke，确认上述事实；560份跟踪dist与Arch构建副本直接比对，需同步的三份client产物已同步；最终12项绑定全部一致。主代理验收摘要与最终绑定后授权，仅在核对私有根身份、自有进程0及嵌套挂载0后安全删除该根；即时与owner独立新SSH均为ENOENT。主代理再禁用连接共享，以独立新SSH最终核对该路径，exists=false、errno2（ENOENT）、exit0，清退验收闭合。临时依赖、日志、数据库与凭据随自有根清退，其他路径未操作。本机不安装依赖、不运行测试或模型。机器可读结果见 [results.json](results.json)。

## 适用范围

不认证供应商推理账户、任意版本或配置、生产容量、断电灾难、基础模型认知独立性或M8科研收益。旧现场模型桥接证据与本次无模型代码回归分别记录。既有未提交修改、M7.7 live4目录及全部历史证据保留，不推送或发布。
