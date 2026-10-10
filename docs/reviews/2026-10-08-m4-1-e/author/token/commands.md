# 实际作者检查命令

1. pnpm exec vitest run tests/contracts/m4-token-source.test.ts
   source-first.stdout/stderr/exit-code.txt：7/7，exit0。
2. pnpm exec tsc -p docs/reviews/2026-10-08-m4-1-e/author/token/source-noemit.config.json
   source-noemit.stdout/stderr/exit-code.txt：exit0，含新测试与token-source模块。

没有build/fullsuite/current29或真实用户配置/凭据读取。FIFO子进程只导入当前token-source源码，依赖protocol既有dist的DetunedError，最大15秒外部timeout，execFileSync正常退出reap，fixture finally删除；非全CLI built验证。
