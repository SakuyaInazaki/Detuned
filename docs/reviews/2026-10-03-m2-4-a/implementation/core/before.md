# Unit A before反例

命令：`pnpm exec vitest run tests/integration/m2-context.test.ts`，source alias，未build。当前Node26.3.0环境；未测Node22/真实宿主。

`before-confirmed.log`：2/2实质失败，测试正常收集、运行。C01两SQLite连接同步屏障提交space.revised：old_seq=1，current_seq=2，响应rules=[old rule]，checkpoint_seq=2，实际subscribe→poll delivered=[]。因此旧材料配新高水位并跳过该规则事件，不是仅签名/schema失败。C02合法12条400中文字规则在4096预算仍成功，不抛必保超限错误。

初次`before.log`保留；初次C01目标事件名字误写space.updated，纠正为实际space.revised后重新运行confirmed日志，观测相同缺失。之后修正新C02断言对象字段为既有statusCode（非status）；旧实现仍是不抛错误，before根因不受这一未来错误断言字段修正影响。未修改任何产品、旧正式测试或历史证据。新测试暂使用Function调用以允许现三参数getContext接受未来budget额外实参，避免不存在helper/type接口冒充失败；实施后将改成正常类型调用。
