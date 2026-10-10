# M5.1-A protocol/client 作者冻结

产品：严格空login DTO与WebSessionResponse、root/auth/session OpenAPI（path-level servers '/'、bearer登录/cookie查询注销）；已知response guard结构派生仅expires_at去format，nested me作为unknown占位后独立严格isMeResponse检查（其created_at/disabled_at full date-time），保持其余约束/无Registry与输入变异。

client显式createWebSession/getWebSession返回data，deleteWebSession返回void且204；同原executor、有界1MiB响应/timeout/abort，POST/DELETE budget0；token仅登录本次Authorization，所有auth使用same-origin cookie且不继承默认Bearer。browserSession启用后业务unsafe取当前CSRF、默认Bearer不发送；未启用原Bearer/重试保持。upload统一executor；父准artifact-transfer/export-stream两safe GET仅cookie credentials+Bearer选择，不改流/hash/EOF/取消/重试/cleanup。

## 实际检查及修复

- 首source4项：1pass/3fail+2unhandled listen EPERM。WA01/02私有reserve listener沙箱拒绝且fixture无error reject而超20s，未到HTTP；窄补error观察不改timeout。WA03已pass。
- WA04真实产品生成器缺口：path-level servers被既有operation循环污染x-query-policy；仅循环跳过servers，保其他操作行为。
- 第二source：3pass/1fail，无unhandled。WA01注销后的私有Node cookiejar未模拟Max-Age=0删除，发empty cookie得到400；仅fixture模拟实际删除，保持401断言。
- 必要WA01定向：1pass/3skip。最终四项由第二+第三证据组合通过；不声称最后whole4首跑全绿。
- 含本新test的source alias noEmit首次0；窄修后第二0。未build/fullsuite/current29；统一门禁属D。

真实HTTP用普通human contributor、真实SQLite与ArtifactFileStore，私有Node cookiejar/Origin仅测试适配，不是浏览器DOM/profile实测。token/CSRF比较用布尔，日志不存明文。default/登录nonce、uploadCSRF/downloadcookie及原Bearer实际验证。源码/tests停写，等待独验；旧证据/SQL/依赖不变。

父最终窄修：生成循环只接受标准HTTP verb get/post/put/patch/delete/head/options/trace，避免其它path metadata污染。WA04新增servers自有属性仅0/length与旧health操作querypolicy存在断言；必要WA04定向1pass3skip、含test第三noEmit0。v1保留，v2是最终10文件冻结。

独验root-auth输入反例后的父准v3：新增WebSessionQuerySchema严格empty object，三auth OpenAPI操作引用同schema扩展；A负责真实query/logoutbody/缺省POST验证修复。B只新增WA04 empty/unknown反例及三操作schema一致断言，必要WA04 1pass3skip、含testnoEmit0；v1/v2不覆盖，客户端/hash默认行为无改。
