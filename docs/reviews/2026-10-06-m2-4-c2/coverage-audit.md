# C2覆盖与分母

M2 共享记忆功能与本机工程验收完成，T06 与 D01 步骤1–3闭合；334/334正式测试、36文件，唯一 fullsuite 与 build/typecheck/lint 通过。本轮旧 current29 与旧13探针未重跑，不登记为当轮通过。

唯一正式窗口600001.568ms：24000 logical、34782 HTTP = 33572成功 + 943宽泛查询422 + 267预期409，0意外错误；20客户端各确认4533 events，最终高水位1004752。普通成功p95 41.580ms，真实短词成功p95 36.947ms（1908成功 + 943限额拒绝），拒绝不计成功延迟分母。

原正式runner整体exit1/complete=false：后验启动过晚，未能在120秒门禁内完成，原日志保留。后来同一DB的独立postflight/control、事件账本与D01结果通过；未重跑600秒或改写测量结果。自动wrapper另有唯一v3 tiny实测：10s窗口10000.667ms、400 logical、591HTTP（586成功+5预期409）、0意外；pre/post固定verifier各exit0后原子放ok，wrapper exit0。tiny不是第二次正式规模窗口。

334正式项包含新HTTP-only会话链1项；不将seed oracle、重复探针或负载请求叠加成正式测试。D01独立核三身份、C无答案ID输入、固定引用与已知正确松弛策略，限步骤1–3。自动wrapper是后置tiny门禁审查/执行，不属于334 suite，也不重写正式窗口。T05/T07继承已接受M2.1/M2.3证据，T06与规模/来源更新/预算/续读/checkpoint闭环及D01出口本轮接受；未覆盖M3完整T08恢复与有界等待，见next-task。

实际10CPU/16GiB主机，不是受控2CPU/4GiB/SSD认证；未运行真实模型、四宿主完整认证，M3–M8未完成。 不将field/schema预算称CPU硬cap，不声称跨宿主exactly-once。
