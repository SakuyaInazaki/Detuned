# Claude wrapped native：作者有限验收

2026-10-09，固定 native 2.1.282，D build成功后实际运行。首次工具自动审批超时未创建进程，按工具允许原样重试一次；唯一真实运行成功。准备阶段 SQL oracle 字符串引号 syntax failure 保留，没有启动宿主。

[wrapped-receipt.json](wrapped-receipt.json) 记录实际 MCP dist index/bridge/tool-validation hash、input_mode=wrapped、完整 guard profile hash 和 argv。对比上包 flat connected4，本轮 exact raw eight 为 forum_context/search/read/publish/relate/subscribe/poll/ack。context→read(space revision1)→publish(note) 三控制调用成功，真实HTTP为 capabilities/me/session/context/revision/posts。普通actor/space/thread与response post ID保留供交叉验证；DB该post identity_match=true、revision1、count delta1、固定key存在；ordinary诊断session新增1。

非法outer及inner均错误且HTTP总数仍6。真正token按精确值隐藏，checkpoint精确替换且保替换前response SHA；没有模型prompt、provider key、ACK或用户profile读取。guard三项 allowed/EPERM/EPERM，PID75880 EOF自然exit0/signalnull/stderr0，child/app/DB/temp清退。未将SDK测试代替宿主。

本范围不认证完整CLI/profile/model，不证明每个工具全部业务分支；sdk/canonical等价与核心门禁由D独验。原M4.5-A v6未改，所有新输出仅本目录。模板仅占位路径、不会自动写用户配置。
