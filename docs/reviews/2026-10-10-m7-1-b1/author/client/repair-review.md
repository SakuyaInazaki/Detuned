# B1 A v7→v8 窄修复独立静审

日期：2026-10-10。B 独立静读实际差分、三处源码和既有四反例；没有执行 build/test/type/lint/noEmit。原 backend-review.md 保留，不替换原发现或红阶段事实。

绑定 A freeze-v8.json SHA256 `14c79be1ca0d0c068edc616370a94fd5f09dc4d0346722f2ea30661368a50352`；source-v8.delta.diff SHA256 `c607c14aa79fbfa14baa43fd5510b7d50e2f3cfcd6471c5e6ad3ebb5c029e1ed`。实际11文件SHA全部匹配；相对v7仅response-guards.ts/app.ts/openapi.ts变化，作者测试及timeout未变。

- HI09：run guard去除墙钟先后排序，保严格ISO、pending version1及created/changed相同、terminal version>=2、scope/identity/state条件。合法回拨后的真实receipt/invalidation及目录嵌套run不再因墙钟排序拒绝；未削减core因果版本/权限。
- CH03：invalidation_reason保非空trim与invalidated/null双向条件，并按字符串iterator码点数显式≤500。500 emoji计500合法，501计501拒，补足Value.Check忽略扩展keyword的响应层缺口。
- HI10：global onRequest literal路由匹配新增check-runs，设置private,no-store在Web请求校验/draining及preHandler认证之前；覆盖scopedcontent401/404/410及早退，旧review匹配保留。没有放宽generic/private附件或core权限。hook归因沿原报告更正：局部onRequest本来早于preHandler认证，真实缺口是scopedcontent及global早退。
- CH04：最终checkOperation revision参数直接复用CheckPostParamsSchema.properties.revision的正十进制无前导零pattern，补正safe integer上限说明；其他参数/body/security未改。

D red-stage-summary和反例源码显示四目标分别HI09/HI10/CH03/CH04；D已有真实红阶段，本文不将静审称为修复后通过。v7实际Fastify Ajv上下文类型及return同validator、真实for-of keyword保持；没有新增no-op/strict关闭/依赖。

结论：本次精确delta无可行动阻塞，可交D串行门禁验证。B四产品文件继续冻结；B2仅规划。
