# M3.1 协议/HTTP/MCP单元交付

2026-10-06。源码仅新长poll接线：events route await core.pollWithWait、req.raw.aborted与非正常response.close取消、preClose取消与可用连接retryable503、finally监听器/集合收束；MCP将SDK extra.signal传给既有client。核心负责权限/事务/批次/ack，旧订阅/ack响应与8工具保持。client/Pi/DTO/schema/OpenAPI/app.ts未修改。本单元规范为docs04与新增events示例，兼容说明含strict/legacy游标、Clock24h/重投续期、每实例128等待槽。

## 实际证据

- [before-first.stdout](before-first.stdout)/[stderr](before-first.stderr)：首运行exit1，E01 wait120仅约0.982ms已证明缺口；E07因沙箱listen EPERM超时，不是MCP取消反例。保留首输出，给listen添加error拒绝以免测试未处理异常。
- [before-loopback.stdout](before-loopback.stdout)/[stderr](before-loopback.stderr)：获本机loopback许可后exit1；E01 wait120实际约1.725ms返回，E07真实SDKClient→MCP源码stdio→HTTP收到body后取消，1.5秒仍未断开。2失败/5跳过，不是7项before。
- [transport-first.stdout](transport-first.stdout)：接线后仅E02/E03/E04/E05/E07五项通过、两跳过，exit0。
- [contracts-first.stdout](contracts-first.stdout)：最终新专项7/7、唯一文件，exit0。E01真实DB+HTTP等待不变consumer；E02严格形状/default；E03实际client外部取消且正常body结束不误取消/routelistener收束；E04短timeout不重试；E05真实app.close/503；E06真实持久批次后屏障取消HTTP、重投固定批次且只有explicitack推进；E07真实MCPstdio取消断开HTTP且未ack。
- [types-first.command.json](types-first.command.json)：sourcealias server+MCP+新test必要noEmit exit0；未build/fullsuite/旧tests/600秒。MCP子进程用Node strip-types运行当前MCP源入口，引用既有client/protocol dist，未生成产物，且这些两包本轮未改。跨接口正式构建与installed Pi实际validator由独验核。

命令与真实exit分别保存同名前缀command.json；没有把首红、沙箱失败或跳过写成通过。官方核读/安装区别见[规划](../../planning/protocol.md)：Pi安装0.87.1，当前官网最新主线不同；dsh/Pi PATH不可见，真实宿主会话和模型未运行。

本单元已冻结，待父/独验统一验收；持久恢复/双连接/TTL权限等核心证据由core与独验负责。本单元不宣称M3全阶段完成。
