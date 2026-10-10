# continuation-3 失败只读分类

读取已存私有 test-results.json 与精确 fixture 源文件；未运行进程/测试、未修改产品/测试/策略。JSON记录886 passed、87 failed、4 pending。以下分类不能证明所有失败同一环境根因。

## 11项 ASSERTION 与一个混合 EPERM assertion

Pi lifecycle六项 identity/new/switch/fork/reload/shutdown：tests/contracts/m4-pi-native-lifecycle.test.ts:8 用 /usr/bin/env -i，仅给PATH/CI，stdio ignore/pipe/pipe；:16 断言子进程code0/stderr空，实际code1。JSON failureMessages仅保存该断言和stack，没有实际子stderr/diff字段，无法从该文件确定子进程为何exit1。tests/fixtures/pi-runtime/native-lifecycle.mjs:13–20 使用 **fixture本地** adapter-pi/node_modules 官方SDK，而非用户global路径。本次精确三文件只读确认package版本0.87.1、SDK index存在，loader SHA81106b07522aaf9197858c4679fecd7fbd23c346376d6e1f2cc3dd5294d543f4符合:18断言。因此“未复制官方SDK入口/loader”已排除；SDK传递依赖仍未逐项证明。

该六项环境不兼容候选：env -i清除了父private TMPDIR/HOME；helper:30 mkdtemp(os.tmpdir())发生在try块之前，私有写策略仅允许登记root内。它可能在私有root外创建临时目录而失败；这由源码证实路径选择机制，但原JSON无具体异常，所以不能称已实测EACCES或六项确切共同根因。现有backend-tests stdout/stderr均短且不含子错误，不能补造。

Claude CP08 (m7-claude-probe-ownership.test.ts:50)、Codex CL01(:28)、CL02(:53)：所记录失败位于finally cleanup verified 布尔断言，可能遮蔽前序异常。代码采用detached Node、自有stdio pipe/pipe/pipe；这些位置不能直接证明initialize/schema/registration行为错误。JSON不包含原始前序异常/子stderr。与大量spawn EPERM同环境的关系合理但未独证，不能把cleanup false当生产launcher已坏。

D01 DI02 (tests/integration/m7-d01-reviewed-independent.test.ts:69)：actual CLI exit1而非0，未保实际child stderr于JSON，不能单凭退出码确定原因。DI03 observer-abort (:77)：reached false，未到sealed observer；同文件DI03 observer-throw (:76)有直接已证实际spawn EPERM而非预期sentinel。源码scripts/demos/d01-reviewed.mjs:30首server spawn是前置步骤，:38启动该步骤；因此observer-throw这一项明确被环境进程创建错误抢先阻断。后者虽然首行AssertionError，但包含直接EPERM，若按独立ASSERTION类计则是11项+1混合项，按所有AssertionError首行计是12项。

## TLS四pending

tests/contracts/server-tls.test.ts文件message是 spawnSync openssl EPERM；四assertions实际status skipped，对应聚合numPendingTests4。:14 openssl包装execFileSync，cwd自有临时dir、stdio ignore；:25–31 beforeAll先生成证书，首openssl创建被拒，TLS01–04断言均未执行。不是TLS业务断言失败，不证明TLS配置/协议不兼容Node22。

## 明确EPERM的stdio抽查

tests/contracts/m7-claude-probe-ownership.test.ts:19 launch，JSON stack精确对应spawn EPERM；actual选项 detached:true、stdio ['ignore','ignore','ignore','ipc']，执行process.execPath + 自有parent.mjs。这确认错误发生child_process.spawn阶段，未进入ownership helper业务。不能从EPERM类别直接确认是ignore stdio、IPC、detached、沙盒还是路径哪一个操作被拒；TLS无IPC也出现EPERM，故不能仅归因IPC。D可结合其另有sandbox原始deny证据选择环境调整路线，本报告不改策略。

## root可选最小方案

先保留完整首suite失败证据。对已证spawn/openssl EPERM，使用现有自有root与相同测试argv的最小有界观测区分沙盒拒绝操作（不改断言/产品、不开VM）。对Pi六项，最小必要诊断是有限提取其实际子stderr异常类别，或一个真实同fixture官方SDK/临时目录路径生命周期调用的有界安全诊断；只输出固定错误code/阶段，不能把缺少TMPDIR候选当最终结论。launcher三项需保存前序错误/close类别才可归因，避免只看finally布尔。实验与策略取舍由root决定，本报告没有执行建议中的任何运行。
