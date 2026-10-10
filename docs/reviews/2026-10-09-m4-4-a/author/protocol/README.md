# M4.4-A B：严格运行时响应 guards

冻结产品/正式测试仅 manifest 三文件。公开 isMeResponse/isSession，经 protocol index 薄导出；公开 MeResponseSchema/SessionSchema 未修改。无新依赖、全局 FormatRegistry、输入变异或服务规则。

两个 schema 的实际全部 format 位置仅三个：`MeResponse.actor.created_at`、`MeResponse.actor.disabled_at` 的非 null 字符串分支、`Session.created_at`，均为 date-time。分别对象解构仅移除 format；通过浅复制替换这三个局部 schema，保留 Kind symbol、原字符串其余约束、nullable union 与其他对象/数组/required/additionalProperties 约束。不是通用递归 schema 转换器。Value.Check 通过后逐一调用锁定 ajv-formats full date-time validator；nullable disabled_at 为 null 时不调用日期验证。原格式名还检查为 date-time，未来格式变动不会静默继续用错误谓词。

合法输入只返回 boolean/type narrowing，原值不重建或修补；metadata Record/legacy id 约束按原公开 schema 保持，不添加身份前缀或 ACL。

首次定向3/3、1文件通过，exit0，Vitest3.2.7；日志 source-first.* 原样归档。覆盖合法两响应、缺/错/额外字段（顶层及嵌套）、三个日期位置的非法文本/日历日期/小时/无时区与合法偏移，以及内容不变。protocol package noEmit 首次exit0；该检查含产品而不含新test，不能称新夹具已typecheck。没有build/fullsuite/current29；独验统一门禁由指定owner执行。

范围限制：本包仅两个已知 schema；不证明全部响应验证或代理/业务授权。A/MCP 即时消费和独立HTTP反例由对应所有者验收。B产品/tests已停写。
