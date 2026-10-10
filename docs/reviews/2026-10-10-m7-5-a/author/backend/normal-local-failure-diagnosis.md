# normal-local 158文件真实失败：调用闭包诊断

只读原JSON SHA d2ea24e40d06237ca451ff3b51403cc8e3f1caea694c49677353b662823795f7；977=915 passed/62 failed/0 pending。没有执行测试、改产品/测试或复制文件；metadata patch继续hold。

三个代表实际异常均为 Node Cannot find module，而不是Node22 API不兼容：tests/integration/m3-backup-recovery-independent.test.ts:10 newURL ../helpers/m3-backup-recovery-worker.mjs，:21异常stack；m3-event-recovery.test.ts:11 newURL m3-event-worker.mjs，:21异常stack；m3-export-independent.test.ts:9 newURL m3-export-worker.mjs，:19异常stack。原JSON将这类44项分类MODULE_NOT_FOUND。

精确读取repo tests/helpers的14个.mjs并逐个检查fixture对应路径，全部repo存在而fixture不存在。它们是受控fork执行入口，经new URL构造而非静态import，因此此前相对import闭包审计不足。M4 admin/artifact/read/write-consume tests分别:8/:8/:7/:7构造同目录m4-*-worker.mjs，:29/:30/:31/:28 fork；stdio ignore/ignore/ignore/ipc让缺模块stderr不进入JSON，表现17项Private worker exited before result。文件缺失及调用路径已证，但JSON这17项本身没有原模块异常，不能冒称逐项运行stderr已观察。

另一独立已证错误：tests/integration/m3-logical-import.test.ts:46 spawn('pnpm', ['exec','vitest',...])，原JSON spawn pnpm ENOENT。顶层runner通过固定Node+pnpm.mjs启动不需要PATH pnpm，而这个嵌套测试需要名为pnpm的可执行入口。private PATH未提供它，不应修业务或放宽FIFO断言。

14 helper合计75523B；imports仅Node内建、现有九backend dist、以及m3-upgrade-worker的 ../fixtures/runtime-fa1b35c/runtime.mjs；该运行时fixture在当前private work存在。最小可行动方案由root决定：精确补这14原字节/hash到现有fixture（不是复用dist），为嵌套pnpm提供只绑定已验Node22+固定pnpm.mjs的自有私有wrapper并放私有PATH，不读取用户全局配置；再选择有界相关验证或完整158。原失败保留，不把环境/fixture修复说成产品Node不兼容修复。

精确缺失清单：
- tests/helpers/m3-backup-recovery-worker.mjs SHA256 8373e14b2a3e06832f07098a8f71e9db1553f5ca01ebfa401665f5a90d06f397
- tests/helpers/m3-event-worker.mjs SHA256 04929f175d216b5966f0c01b4e60606019d79278b21d71291fe217d82d4dc9f5
- tests/helpers/m3-export-worker.mjs SHA256 508360c95443d2f6a26a5b302ed804c786dd55cd55c933f096b5deb58085feac
- tests/helpers/m3-import-worker.mjs SHA256 dd7148be6597525869a523c0e2141c1e31922ac6a32cf937b41b188523ad13eb
- tests/helpers/m3-operations-worker.mjs SHA256 bf8d9854d0c7e9b066250923459c07112c50888795fe3e13b8654eaf78045e33
- tests/helpers/m3-request-key-worker.mjs SHA256 be905cf5227759f48b1b98f0b7389aa124498b2756f16f4c769be558d5748642
- tests/helpers/m3-resource-limits-worker.mjs SHA256 92b1637c53179b403c66e94754b17561f6772391e5ae4ee67851b19c81fee600
- tests/helpers/m3-shutdown-worker.mjs SHA256 54532d8110c99a1c7ce26845899e4152dbce744ebbe8ac281fa79970b2a74ccc
- tests/helpers/m3-upgrade-worker.mjs SHA256 27660f4f99700e2dbfe83db0af8a721c8a883df39d158d105777baa0cc8b35cb
- tests/helpers/m3-write-limits-worker.mjs SHA256 af8b09ed979e15cb62938a644284e5ac9a15aa44e1a8ecbf464a1c6bcbf9f78c
- tests/helpers/m4-admin-cli-worker.mjs SHA256 01adf15fa3e99cb66e9e6e456a56a4c5acf9f1be92c6c337ef0bd4030481c8c7
- tests/helpers/m4-artifact-client-cli-worker.mjs SHA256 d0b334483587d473ef0cc2b42c43902324e97c7b0feeacd55d93ac85a1da460e
- tests/helpers/m4-read-cli-worker.mjs SHA256 074c7bce830eafde7a28c9949e719acbb3315344d4c0cce8bc784911b77d3bce
- tests/helpers/m4-write-consume-worker.mjs SHA256 2405621ab9884dcdb0a47061fa9a75497f5386b55e710e0deee1e4baf025126f
