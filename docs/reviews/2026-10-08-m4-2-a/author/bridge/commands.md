# 作者实际检查序列

- source-first：pnpm exec vitest run tests/contracts/m4-mcp-runtime.test.ts；exit1，global源alias无法resolve client/node，collect前0case。
- source-second：同file --config author/bridge/source-vitest.config.ts；6case断言通过但1 uncaught outputerror，runner exit1，不称6/6成功。
- source-output-third：同config/file -t 'output error'；1pass5skip exit0，per-send observer阶段。
- source-output-final：-t 'output error|deadline rejects'；2pass4skip exit0，共享观察/timeout初版。
- source-late-final：同2case过滤；2pass4skip exit0，最新latecallbackerror+pendingwrite真实终结精度。
- tsc source-noemit、source-noemit-final、source-noemit-terminal均真实exit0，但前snapshot；source-noemit-freeze最终含新test/完整最新源码 exit0。所有配置/log/exit保留，各必要真实修正后检查不标唯一全程typecheck。

没有作者build/fullsuite/current29；C最终全6同次built覆盖。局部sourcealias精确client/node在普通client之前，global配置不动。
