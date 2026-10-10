# M4.3-B 官方 patch 加载与配置 Hmr

2026-10-09 父接受有限本机范围。固定官方5badb150真实loadOverlayPatches/Loader/Include及Hmr文件watch→MCP plugin/registry→私有Detuned服务，无mock loader或手调execute替身。

作者新3case（构造probe+业务2）最终3/3、4.09s；独验 `/root/dsh_independent` 坏YAML保留A→恢复B首1/1、5.66s/minenv；旧plugin默认兼容3/3、2.79s另计。四新外部runtime case不加入核心615项。最新M4.2-B615/88/current29保持，本包四core门禁与25探针未重跑。C只汇总元验证，不声称自己运行这项独验。

真实八工具、patch激活、A→B配置watch身份切换/在途poll取消不ACK、scope/root逐stage清退已验；坏YAML解析失败保前有效A配置，恢复B无混合身份或业务残片。作者最终6PID、独验4PID自然退出，原fixture/module exports/decorator/cleanup失败保留。官方源码/lock原样，只有受限同SHA40refs编译/tsdown官方decorator，未跑全仓Typert或完整hostbuild。

[独验汇总](verification/verification.md) · [机器结果](verification/final-results.json) · [作者原证据](author/loader/README.md) · [独立原证据](verification/independent/README.md) · [复现说明](author/loader/reproduce.md) · [指南](../../../integrations/dsh.md)。

portable prepare helper仅syntax/dry-run40项目通过，新checkout完整build未实跑。官方source/deps/built继续有意持有，测试资源已退；不宣称全部owned0。配置Hmr通过不等于模块代码HMR、完整CLI/profile自动合成或模型认证，也不是完整M4。下一M4.4-A推进Pi基础与生命周期，精确任务书尚待父冻结。
