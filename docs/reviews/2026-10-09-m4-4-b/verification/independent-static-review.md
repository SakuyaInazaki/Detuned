# M4.4-B 独立源码审查

独验直接读 Pi index.ts/runtime.ts 与真实 SDK 行为；作者源码 hashes 在统一 gates 前核对。产品只用公开 ExtensionAPI 类型/hooks，非公开 loader.js 文件URL只在获准 tests helper。SDK0.87.1及loader固定 SHA 验证，不能称全链公开SDK。

每次activation即时生成空代，snapshot复制显式环境值；首次有效operation解析选定token来源并固定同代client/sharedbinding。后续tokenfile变动不会setToken改旧client；session_start等待旧close再生成新代。没有before-switch/fork关闭handler，避免其他extension veto后旧代被错误关闭。

每call先捕获当前Generation，独立AbortController及调用Promise注册；close先closing/abort，同步禁止新call与binding.prepare，再等待calls的finally及binding.waitForIdle。10s默认截止仅报告不能确认清退，缓存reject并保持旧代closed；late success经过check而不能返回成功、无自动ACK。官方SDK可以捕获hook异常，不声称论坛扩展能阻止宿主一切非合作动作。

安全映射保留真实DetunedError公共字段与对象；protocol/transport/timeout/abort保实际错误类并替换固定安全message，未知error固定文案。工具execute异常reject而非details.error成功。成功details完整；content按UTF8 16KiB预算，v2明确details仅宿主可用，模型按next_step缩小/分页/读取具体对象。

旧C03额外whole-fixture source noemit退出2，独验读取完整diagnostics：22个诊断位置为3..1312，C03从1509起，未涉及新增C03行；这不等于证明全部pre-existing。正式package typecheck与额外旧test编译清晰区分，不泛改不属于本包的旧类型问题。

没有发现当前包未解决可行动产品源码问题。真实SDK没有追踪direct registry execute，验收使用扩展自有promise及finally观察与真实HTTP/DB证据；无手发生命周期事件。PiCLI/profile、RPC、模型与四宿主全完成不在本验收范围。
