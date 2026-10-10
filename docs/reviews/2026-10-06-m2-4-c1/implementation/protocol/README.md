# M2.4-C.1 接入单元交付（待独验）

2026-10-06。父批准freshbaseline后真实before随即实施，精确10路径/hash见freeze-manifest.json。新增ContextFocusThreadSchema/type且既有context组合可省略focus_thread，无focus不造key，focused成功必需性由core保持；title只读无新写长度上限。既有build/serialize/bytes签名、context入口与8工具不变。新增validateToolContextParams只同源结构、拒未知/空白/非字符串，不搬业务。route允许字符串空白交core在身份先验后校验，重复/unknown/nonstring仍transport400；client/tool/CLI现focus入口复用。OpenAPI及docs04/examples-context同步，无adapter/依赖/global/SQL/DDL修改。

## 真实before及首红

before.mjs使用已验收dist与隔离内存DB，无凭据落盘。before-first exit1仅sandbox loopback listen EPERM，原stdout/stderr/command保留；授权本机loopback执行before-loopback exit0，实际ownthread GET focus400、真实HTTP client.callTool focus400、CLI context help exit0明确unsupported。不是仅源码推断，也不是新CLI成功实测。

focused-first正式新F01首红exit1：合法ownthread返回旧unsupported400而期待200。源共享DTO已落、core尚未实施当时保存，未用缺import造红。planning/interface-freeze记录父最终导出/两Port及迁移范围。

## 定向结果与夹具修正

contracts-first仅新focused+授权迁移旧context两文件，9pass/1fail：新F02预期4096，实际4095，原因可选activity尾裁后truncated由false变true少一字节；无预算超限产品问题。原日志保留，夹具改为真实4095/included/true与+1触发规则降级保focus，再巨大focus422，不放宽cap。日期校验是实际ISO UTC毫秒/Date.parse/toISOString局部FormatRegistry并finally恢复；不沿用unknown格式或登记恒true。旧C03已有原format注册未扩大授权修改。

contracts-final：新focused6/6+旧context4/4，共10/10、2文件exit0。types-first与types-final sourcealias noEmit含两契约/CLI exit0，不依赖旧dist类型、不build。窄git diff --check首次发现search.ts本段原尾空白，修纯空白后exit0；该纯空白修正未重复产品测试，功能测试及noEmit结果仍适用。

F01真实ownfocus200/fullmetadata+无focus无key；F02实际req.id转义完整envelope、stored超写标题读取、4K规则降级/必需focus422；F03未知/跨space404、空白/重复/unknown400/匿名401、archived；F04多thread failure过滤后窗口+无focus空间窗口；F05完整schema null/部分/extra拒与omitted规则truncated关联；F06 app.inject-backed fetch的client/tool整page/严格纯结构/Signal取消与8工具。F06不是实际socket SDK，真实Pi/MCP/CLI焦点/省略链由统一独验构建后执行。

旧tests/contracts/m2-context-contracts C03仅父授权原72/76区段：字面不存在thread从400组拆404、tool404、补实际ownthread200，空/预算/unknown原400与无focus正文检查不改；integration由core独占，旧原A probe原字节不改。原A missingfocus400和旧大objective422假设保持历史归因，不作为当前回归绿。

## 冻结与限制

10路径产品/tests/docs冻结停写，父与独验决定接受。未运行workspace/单包build、fullsuite/current29、旧历史probe或实际新Pi/MCP/CLI；三个遗失原fixture仍not_run。没有Node22/干净安装/远程CI/四真宿主模型/100k–1M事件–20客户端长压测。工程Pi已装0.87.1 metadata重核，不等于真实宿主会话。

focus仍空间级规则/ref/policy/checkpoint，高水位/metadata同snapshot，窗口非完整历史/分页，不聚合全文。pinned/source旧数组无cap维持，SQLLIMIT/正文预算不称全部读取工作或SQLVM/CPU硬cap。完整M2/T06/其他里程碑仍后续，无commit/push/清理/安装/global/模型/deepseek-brainstorm。
