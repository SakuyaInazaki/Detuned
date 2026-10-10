# M4.4-A：共享身份会话与严格响应校验基础

状态：父已冻结方向，C fresh baseline 后实施。本文件不是已实现声明；基线为旧615项/88文件，新增总数以实际验收为准。

## 目标与兼容边界

将已验 MCP 惰性身份/诊断 session 协调抽入 shared client，并由现 MCP 立即消费；为 Me 与 Session 两个响应提供严格、无变异验证。保现配置和 prepare/beginClosing/waitForIdle 的签名与完整算法，包含独立 flight、waiter取消、失败finally和关闭等待。

guard 使用 protocol 已有 TypeBox Value.Check 与已锁 ajv-formats3.0.1 full 谓词。新增 `isMeResponse`/`isSession`，不改公开 MeResponseSchema/SessionSchema；只为两个已知响应建立内部派生schema，并逐一检查其实际format字段，同时保持其他约束。禁止裸 Check 忽略format、全局FormatRegistry、通用schema引擎、coerce/default/remove/mutate。合法值保原引用；失败沿现 ClientProtocolError 固定安全信息。

client/browser 不依赖 MCP/Pi/Node凭据；client/node安全resolver不动。不新增依赖、protocol字段、SQL、HTTP业务或服务权限规则。

## 文件所有权

| 作者 | 范围 |
|---|---|
| B | protocol 新窄 `response-guards.ts`、index薄exports，一个guard合同测试；具体test名开工冻结。 |
| A | client 新 `session-binding.ts`，导出 createRuntimeSessionBinding/RuntimeSessionBindingOptions；client index薄export。MCP旧binding改薄wrapper兼容，tool-validation的Me/Session parser复用guard；完整八工具参数AJV校验保留。 |
| C：dsh_independent | 功能独验与唯一统一门禁，native代理非法响应反例和验收报告；避免各作者重复全套。 |
| m32_verify | fresh baseline与metadata/最终文档核验，不重复功能门禁。 |

API提取必须当包由 MCP 实际消费，不能仅新增空接口。旧凭据/重试/成功输出/错误类语义保持。源级作者检查与hash freeze后，验收owner统一运行。

## 必要验收

- 两schema真阳性；错误字段、额外字段、非法date-time均拒，合法原值引用/内容保持，非法输入不被修补或变异。
- 旧MCP独立singleflight保持；未开始session的失败仅真实finally后可再试；已开始session失败terminal，不锁死其他空间；最后waiter取消后新call不能获得已abort flight的成功结果。
- close取消所有独立flight并在同预算等待finally；晚成功不能继续发业务，未确认消费不ACK。
- 独立native HTTP代理分别替换非法Me/Session，拒绝后没有后续业务HTTP；不以作者mock日志代替独验。
- 所有凭据/配置/HTTP为私有fixture与loopback；证据不存secret，旧review/archive/SQL/schema/HEAD保持。

统一 build/typecheck/lint/fullsuite 各一次及必要 current29；第11探针固定使用M3.4-A.1获准adapter。首反例原样保留，先定位/最小修，再仅受影响复验；实际未运行检查不能填通过。新增总数由验收报告给出，不预写成功。

## 后续与非目标

本包不改 Pi。下一 M4.4-B 先真实官方SDK无模型prototype，再实施凭据snapshot、安全错误及生命周期；不能将共享API与尚未核实的Pi hook混入一包。完整四宿主、模型与M4–M7未完边界保持，不部署/推送/改全局配置。
