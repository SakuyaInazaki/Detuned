# M4.4-B A 实现报告

冻结3文件见 freeze-manifest.json。产品仅 adapter-pi index.ts/runtime.ts；作者 tests/contracts/m4-pi-runtime.test.ts。未改 shared client/protocol/MCP/SQL/schema/依赖/其他测试。原型日志原样保留。

Activation立即建立空generation，显式env值复制；首次有效operation整代共享安全resolveLocalToken结果及私有client；token-file整代仅解析一次，选中失败无fallback。每代共享RuntimeSessionBinding，真实space tool准备后才业务，无session_id注入、无自动ACK。工具捕获其所属代，预取消/缺space不创建client。session_shutdown同步closed/abort，await真实工具与commands calls的finally及binding底层finally；session_start先close旧代再建新代，未使用可能veto的before事件。启动/注册不HTTP。

默认close预算10s（内部factory可收紧），超预算固定失败且旧代永久closed、真实未决Promise保持被观察；不把deadline当cleanup完成，不越代调度晚成功。真实SDK可能捕获extension handler错误并继续其他生命周期，A不宣称可阻止宿主所有非合作动作；后续native独验判定边界。

成功完整details保留，pretty text UTF8≤16KiB，超限固定摘要指向details。DetunedError对象及公共语义保留；protocol/transport/timeout/abort保持实际类并固定安全消息，不带原cause；未知错误固定文案。commands使用同代inflight、安全错误，非空usage参数0HTTP。八广告schema同原对象和官方类型桥，未引入另一套规则或新验证依赖；官方SDK校验广告，服务端仍唯一业务权限判断。

## 实际检查

- source-first：`pnpm exec vitest run tests/contracts/m4-pi-runtime.test.ts`，真实exit1，2/5通过。fixture的Me/Session漏既有required字段，shared guard正确拒绝；两个后续业务barrier未进入，分别5s继发timeout。原stdout/stderr/exit保留，不称环境或产品根因。
- source-second：补完整真实wire fixture字段，同命令exit0，5/5通过，7ms tests/461ms total。覆盖固定身份到start轮换、singleflight、source冲突/指定坏file终止、preabort/缺space零client、shutdown真正finally/late成功拒、deadline不假clean且旧代不重启、fullDetails/16KiB/typed safe errors。
- source-noemit：包含新作者test与source aliases，真实exit2，只有新test两处可能undefined数组索引；产品无诊断。
- source-noemit-second：同config，测试窄类型修后exit0。未重复五组业务用例，因为仅test非空类型标注。

没有作者build/fullsuite/current29或模型调用；统一built/native/gates归独验。正式Pi普通权限/实际reload/start以及历史C03兼容等待B/D，当前只报告作者源码结果。父后续裁定前停写产品。

## 父批准 v2 文本精度修正

Pi宿主details不自动送模型。仅runtime.ts超限固定摘要保留原truncated/full_result/text_limit_bytes并增加message/next_step：完整结果留宿主details、不承诺模型可读，建议使用已广告预算/分页或具体对象读取缩小重试，不编造参数。`text-v2`复用既有长结果一组：实际exit0，1pass/4skip；没有build/full或重复其余用例。freeze-manifest-v2.json保3文件，index.ts和作者test SHA与v1完全相同；原v1保留。产品再次停写。
