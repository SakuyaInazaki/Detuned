# M4.5-A 有限结果

|层次|Codex0.144.6|Claude Code2.1.282|
|---|---|---|
|安装与官方契约|已核metadata/help/native符号/installed schema|已核版本/help/native控制静态字段|
|OS guard|单端口允许、跨端口/sentinel拒绝通过|同独立guard通过|
|native initialize|新增官方owned SQLite/log路径后仍被用户config读取保护阻断，未完成|owned state/tmp保护下成功|
|MCP连接/发现|未运行到该层|connected，但raw status只有四工具|
|真实tool call|未运行|context成功、unknownparam安全拒且额外HTTP0|
|完整八工具|未通过|未通过；桥SDK广告八与宿主四有明确对照|
|模型/账号/profile|未测试|未测试|

Codex每轮结果及清退见author/codex/README.md；Claude先前tmp拒、pending、connected4与最终两调用分别保author/claude材料，不能覆盖首失败。host top-levelanyOf/allOf normalization/drop是静态最强解释，不声称拿到runtime具体drop reason；不修改共享schema以冒充通过。

本包未新增产品源码或正式core测试，未重复build/full/current29；**638/92是M4.4-B已接受基线**。仅模板静态解析和固定宿主有限实验有新事实。独验保护/归档/链接核以verification后续终核为准，不预填未执行checks。
