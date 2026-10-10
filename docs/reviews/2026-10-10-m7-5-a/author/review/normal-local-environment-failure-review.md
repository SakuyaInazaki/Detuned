# normal-local 环境失败定向独验

未发现本轮失败代表证据支持 Node22 不兼容或继续 sandbox EPERM；62 失败由实际 fixture 闭包/命令可达性问题解释。44 条明确 MODULE_NOT_FOUND 指向十个 tests/helpers/m3-*-worker.mjs；逐一核 repo 存在、冻结 371 copy 不含、exactwork 不存在。17 条 private IPC worker exit 对应四个同样缺失的 m4 helper（admin4/artifact5/read4/write-consume4）；原 fork 的 stderr ignore 导致 JSON 不携带模块错原文，不能回填其实际 stderr。余下 FIFO 子测试在 m3-logical-import.test.ts:46 spawn('pnpm')，实际 ENOENT；私有 Node bin、work node_modules/.bin、/usr/bin、/bin 均无 pnpm。outer 通过绝对 Node+固定 pnpm entry 启动，不等于嵌套命令 PATH 可达。

实际 stage receipt 是 close1/null、groupabsent，219.68883075 秒；CL02 stderr 两 child close0/null、all_owned_absent=true。原 source/test 未变且 build 已实际通过。追加 sandbox-exec 未出现在本轮 stage argv；是否平台 exec escalation 获批不能从 absence of EPERM 推断，已向 D 核原工具调用授权事实。

最小候选处置交 root：补十四个精确 helper/hash 与它们自身动态依赖闭包，增加私有固定 Node→已 pin pnpm entry 的窄命令 shim；不扩全局 PATH、不修改产品/冻结测试、不重装或重复已有 build。A 并行核 helper 闭包。唯一后续实验由 root 决定，当前未授权运行。

原 normal JSON SHA d2ea24e40d06237ca451ff3b51403cc8e3f1caea694c49677353b662823795f7 保留（含疑似凭据候选，不能未经脱敏复制到公开报告）。本审仅读精确 fixture/repo；未运行或查询进程。
