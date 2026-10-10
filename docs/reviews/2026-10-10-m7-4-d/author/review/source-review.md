# M7.4-D v2 实际源码独立静审

2026-10-10；仅读实际源码、before/diff/freeze与root scope addendum，重算SHA及四protected范围。未运行syntax/noEmit/test/宿主/进程查询。

实际45403B、SHA `fd773e6002b5f0dfd7053132ddb17f3120901cefbabde1a48965e6cc8adedafb` 与freeze一致；四pure exports逐字节同v13，181/2437/4544/736B与批准SHA一致。policy/native args/environment差分保持原样，无Codex/Pi/product改动。

- production supervisor实际调用registerOwnedMcpCandidate；helper内部exact ps绑定pid/actual process UID/direct native PPID/original worker PGID，不开放query/UID注入。candidate observer、proof、confirmed observer及final assertActive完成后才返回frozen proof。source先留mcpCandidates，再调用helper；返回前不confirmed/ACK，helper本身无signal/import/ACK。same-worker fail-closed保持。
- native PID来自owned worker私有IPC中其实际spawn ChildProcess.pid，source再核direct worker父/原组。worker自身exact direct supervisor父/自身detached组proof先保cleanup权限，再external observer；这是root明确addendum，worker observer拒绝仍无bootstrap。worker_group_confirmed与worker_observer_completed分开，不与MCP确认门禁混同。
- createTrustedMcpLauncher是实际production fs.writeFile调用的窄factory，entry内部固定，不接受任意代码/入口。最早<=3s referenced timer先于fs import/登记；ACK前只登记/等待，无MCP import。ACK后同绝对workEnd timer unref，并仅设置own process.argv[1]为固定built绝对路径再dynamic import，满足built main guard，无额外spawn/其它argv/env修改。unref允许MCP实际EOF退出；真实启动/关闭回归仍待D证据，静态不称通过。
- 单一began通过bootstrap传worker；50work/60worker/65supervisor绝对时间共享，没有bootstrap/ACK相对重置。显式run内65秒hard timer覆盖preflight与finally/report，正常收尾末尾clear，模块import无该timer。hard exit无完整报告时须outer独立留证/清退，不解释为成功。cancel及deadline有不同safe codes，控制方法固定三subtypes且issued计数，不声称测量全部host内部模型行为。
- worker retained flights、actual close、HTTP drain/own socket close/app/DB各attempt独立；source保initializer/observer/registration/watch settlement，每candidate只positive signal0 presence，所有unknown/present不获absence。root删除要求settled+actual owned child close+candidate absence+原组absence（仅未bootstrap且原组未confirmed允许actual child关闭分支）。独立失败不跳其余已授权cleanup，原失败优先；未确认candidate不新增signal权限。

无可行动源码阻塞。D实际test/capture freeze及actual binding/guard/plan尚待，不能由本静审释放runtime或native；root仍需单独放行。下一E规划措辞已按root修正为C.1原收据未区分原因、后续发现入口遗漏，范围不扩大。
