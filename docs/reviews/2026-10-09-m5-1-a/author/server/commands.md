cwd /Users/sakimi/Desktop/Detuned；所有exit由任务专用变量直接捕获。
- pnpm exec vitest run tests/core/m5-web-session.test.ts tests/contracts/m5-web-auth-server.test.ts：source-first、source-admission-final。
- pnpm exec vitest run tests/contracts/m5-web-auth-server.test.ts：server-second/server-third。
- 同命令 -t WA04：wa04-fourth。
- 同命令 -t WA05：config-final。
- pnpm exec tsc --project docs/reviews/2026-10-09-m5-1-a/author/server/source-noemit.config.json：noemit-first/noemit-config-final。
无wholebuild/fullsuite或既有probes。

- v2仅 pnpm exec vitest run tests/contracts/m5-web-auth-server.test.ts：root-policy-v2.log/exit0，6pass。
- v2同source-noemit.config.json：noemit-root-v2.log/exit0。
