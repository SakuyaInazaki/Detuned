# M7.5-A 最终 runner 独立静审

结论：最终冻结版本可按 root 已定范围执行，由 root 单独放行；当前没有新 runtime 成功结论。本审查未运行安装、Node、测试、runner 或语法检查。

实际 runner SHA256 `b65bfb87de03b52cdd0581e082511b2716ec116191b47dbc62f33ed28d781318`，plan `749626fc04c673e755c4ae2cca8ca4f25f386f5a22c31048733584a7ac6eecba`。独立从保留 c75 原字节生成 diff，与 runner-cleanup-gate.delta.diff 精确一致；仅末尾 cleanup成功门禁变化，plan不变。原 c75 阻塞已闭合：绝对预算耗尽明确failed/CLEANUP_DEADLINE保留root；任何passed最终必须removed且ROOT不存在。旧拒绝报告和snapshot不覆盖。亲读finalpureastparse收据exit0且绑定b65；该收据明确没有执行runner/创建fixture/pycache，不扩成安装验证。

原完整actual c75审查结论与既有规划报告保持：371copy清单与ownership精确并集、158测试显式argv、两archive27402B例外、九后端串行build、worker1/fileserial、原timeout/assertions、900s test/1800s总含90s清退、logical/allocated各2GiB均守范围。新Node包固定hash后安全解压，existingpnpm11工具哈希绑定；零构造env/privateHOME/XDG/NPMfiles/compilecache，私有config.yaml与实际有效CLI键禁globalvirtualstore/sideeffectcache，pm-on-fail=error保固定版本校验并禁下载切换。install frozen-lock/ignore-scripts/ignore-pnpmfile，只有esbuild显式rebuild和SQLiteprebuilt smoke；没有额外dependency脚本或编译回退授权。

实际437source/555dist前后审计取代常量“不变”；JSONsuite/tests fail/pending/todo0、passed==total>0、全部158files及每assertionpassed/error-free，加实际stageexit0，闭合完整pass与既有Vitest unhandlederror/teardown退出门禁。阶段自有PID/PGID exact proof/actualclose/groupabsence，未证明的组不signal；内部detached证据明确来自原测试awaited teardown/close/absence，不声称outer独立census。失败/deadline/未知沉降保精确root/ledger，成功才进行有界独立清退并核实际close/group/rootabsence。

Node download禁止跨域redirect；pnpm registry+lockintegrity及诊断停条件仅为配置边界，明确不是硬域防火墙/逐请求census。没有VM/前端/nativehost/model/globalconfig范围扩大。实际网络、Node22运行、clean install、资源闭包和完整158结果仍待唯一授权执行，历史967/155不累加。后续首失败保持，不自动retry或换镜像。
