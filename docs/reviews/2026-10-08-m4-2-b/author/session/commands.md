# 实际作者命令

工作目录 `/Users/sakimi/Desktop/Detuned`。

1. `pnpm exec vitest run tests/contracts/m4-mcp-session.test.ts --config docs/reviews/2026-10-08-m4-2-b/author/session/source-vitest.config.ts` → source-first stdout/stderr/exit-code，5/5、0。
2. `pnpm exec tsc --project docs/reviews/2026-10-08-m4-2-b/author/session/source-noemit.config.json` → source-noemit stdout/stderr/exit-code，2（仅test TS7006）。
3. 上述tsc原命令必要复验 → source-noemit-final stdout/stderr/exit-code，0。

全部exit由任务专用shell变量直接捕获；源别名配置沿既有局部方式，准确client/node别名先于client前缀。未build/fullsuite/安装或宿主运行。
