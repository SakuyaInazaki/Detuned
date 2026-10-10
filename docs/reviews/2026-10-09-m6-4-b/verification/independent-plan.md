# M6.4-B 独立验收计划（作者冻结前）

范围仅已批准CLI/第九canonical工具/MCP/Pi薄接入，不加HTTP、DDL或依赖。D正式新文件tests/contracts/m6-review-tools-independent.test.ts，最多六条有意义旅程；已有十一catalog断言及三个官方lane文件只做授权覆盖/原断言保留，不写产品。所有before已捕获。本文是待执行计划，不能据此填成功。

## 新独验六组

- DT01：九个canonical schema完整flat/wrapped广告（对象同源，全部keyword/required/union/allOf保留）。每工具合法样本及非法类型/unknown字段；review五op严格request_key，create_session禁key/actor/metadata/op混配与跨层。纯protocol validator不改变输入；sharedclient、MCP SDK stdio、Pi runtime在invalid时均零HTTP/零诊断session，安全error不含秘密marker。保持旧subscribe显式组合约束，不能裸Value.Check替代allOf语义。
- DT02：真实SQLite/WAL+HTTP+两普通独立reviewer，从stdio工具request→本人assignment/snapshot→显式论坛session→submit→sealedown-only→第二人submit/reveal→finalize/status/decision；flat与wrapped真实执行，不复制业务判断。诊断session先于/区别于显式session、缓存仍原ID/不被替换；请求后session与实际DBactor/session绑定，两actor才揭示。旧确认/同key重放不加count、不再造对象或事件，无自动ACK。取消用单独collecting请求避免错误阶段。
- DT03：多步骤create_session预读/POST间真实取消；没有sessionPOST及自动retry。另以受控HTTP/fetch屏障使身份变化（实际两凭据各自行使HTTP）证明返回不能假绑定原assignment；安全失败、可能已提交的单个新session如实计数，不伪称零副作用。严格合法Session正对照和错actor/space响应边界单列controlled transport，不冒后端坏存储。
- DT04：真实当前ACL优先历史key；同actor多session不增加名额；只读本人assignment可读而submit/不合格write被服务拒绝；nonreviewer与admin不得读他人sealed/list内容。本人sealed与真实revealed正对照，取消不揭示，固定scope和服务状态拒绝保HTTPcode，DB无拒绝副作用。
- DT05：真实built CLI、私有小文件上传与校验下载；显式或持久logical key重放经新CLI进程得到同artifact，DB artifact/event/key不增加，同FD bounded snapshot/不覆盖既有目标，未知/非法JSON与错误输出安全。token限fixture私有文件/Node内存，不采输出凭据；作者CLI全流水另跑，D不镜像十二子命令。
- DT06：真实MCP/共享client/Pi的新增create_session单attempt/取消错误传播与合法响应对照；受控坏响应明确独立于真实HTTP（同工具参数但响应ID/父scope不合法不能被包装成成功）。closed runtime不能懒启动；旧生命周期正式文件承担完整noACK/finally回归，D不重造通用框架。

## 固定官方lane（额外宿主项，不累加core cases）

只读preflight已记录official-retained-preflight.json：两个曾有意保留的dsh目录均存在、UID501且非symlink，runtime HEAD5badb15009ae1756c3afe0ae0cef1faafc290ccc、plugin0.2.1-alpha.1、Vitest4.1.8、built ToolRuntime入口存在。Pi实际0.87.1、types execute/on/registerTool行373/981/988/1019已核；内部loader SHA81106b…43f4仍固定，仅测试fileURL，非公开export。没有import/runtime/install/全局/profile/VM动作。

Pi在原native-lifecycle.mjs内补第九完整发现、非法新工具初始化前零HTTP、identity模式一条真实合法review/create_session及本人assignment正例；其余原六生命周期/凭据代际/官方reload/new/switch/fork/shutdown/finally/noACK全保。运行只env-i、privatecwd/agentDir/auth={}、models=null、networkdisabled、memory settings、完整ResourceLoader；禁止模型/用户profile。真正生命周期动作不手发事件。

dsh在原runtime.spec.ts第九发现及一个已有真实execute旅程内补真实forum_review/create_session/固定assignment或创建请求正例，不新增官方脚本路径。launch.mjs/experiment.config.ts只读，仍用原bounded supervisor，官方scope.dispose/子PID收据清退、pending/ACK原断言保留。仅写私有fixture与既有owned .detuned-m43测试输入，保留官方source/deps，不安装下载。若现入口失败先原日志，不自动重建或找另路径。

## 旧目录适配与门禁顺序

十一catalog文件仅精确8→9或原inactive排除改active正确断言，保旧八样本/关键词/取消/绑定/零HTTP/无ACK。m4-mcp-schema八代表样本原字节不改，其他数字8（日期/帖子/HTTP组合）不碰。三个官方文件授权差分单列，before/hash与fresh逐项绑定。

A/B全部冻结+互审后：D/A/B新增及变更测试源noEmit，逐次确认exit0再串行workspace1 build；先新增/受影响定向、真实stdio/Pi/dsh有限lane。真红保首证据交root指定owner修，D不编辑产品；最终type/lint/全core worker1文件串行与current25需root按实际稳定版本批准。current25先精确定位工具8硬编码与实际source；无影响用原选择，需adapter则先根审diff，不盲替8。既有维护/性能成功项不重跑。所有请求安全审计只method/path/key存在布尔/status/count/PID，禁凭据/body/签名日志；每个owned app/db/stream/process/temp finally清退。

当前没有任何新执行结果；后续实际collector计数与完整stdout/stderr/exit为准。原timeout不加大，单一执行窗，无VM/Colima/daemon/browser/models/install/global/commit/push。
