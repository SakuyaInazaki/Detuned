# M5.1-A 最终结果

父接受Node HTTP认证有限范围；[D完整报告](verification/independent-report.md)与[integrity](verification/integrity-before-metadata.json)提供实际证据。

|检查|实际结果/覆盖|
|---|---|
|core默认full必要复验|670/670，98文件；新23=A12+B4+D7|
|独立真实HTTP最终|7/7，含rootauth产品反例修复|
|build|根build0，加最终protocol/server必要增量0；不是最终所有源码一次fullbuild|
|包级typecheck/lint|各0；包tsc不包含根tests|
|额外两完整旧test noEmit|2，完整诊断保留；不标成功、不未经基线宣称全为旧错|
|current29|四gate+25probe组合29/29；21原+既有#11/#27+本包#28/#29适配|

[当前命令](verification/current29-manifest.json)、[结果](verification/current29-results.json)。#28/#29按有效operation/path/document servers选择API-v1和标准HTTP verb，保旧断言，不硬排auth；原失败与差分保留在[adapters](verification/adapters/28-approved-diff.patch)、[29](verification/adapters/29-approved-diff.patch)。#28旧AJV date-time warning不作本包日期guard验证。两旧fixture修复的[范围/诊断](author/client/fixture-repair.md)明确，不泛改oldtest类型。

首source正文schema错误、fixture权限/不存在路径错误保作者；D首fixturekey漏项、listen EPERM、header类型错误保其报告。真实GET未知query200、DELETE正文204的[root反例](verification/root-auth-first-counterexample.json)推动共享严格policy修复；最终7/7证明拒绝后cookie仍可用，不能给首轮未测旧cookie状态补证。首full667pass/3fail来自两旧fixture覆盖域/servers枚举，获准局部修后唯一必要full670/98。

真正支持：human原能力/范围与core空间ACL，绝对TTL/容量/替换失败保旧/重启清状态，独立可信login预算包含body/credential失败，安全Origin/Host/CSRF与日志、root严格输入、sharedclient单attempt未知结果与取消。SQLite诊断session/event/post不因登录伪造。实例1000界限核core源码/测试，独立HTTP容量用8credential槽，不宣称实际造1000。

限制：Node代理/显式cookie载体不是浏览器；Secure属性不是生产TLS验收。library部署者负责loopbacklisten/反代Host；不自动trust代理。服务无页面，React静态/CSP/DOM/XSS/键盘/窄屏由下一包实测。无模型/用户profile/全局配置/安装/推送，SQL/archive/schema/lock/HEAD与旧6487review完整保护见D证据。当前metadata不新增运行。
