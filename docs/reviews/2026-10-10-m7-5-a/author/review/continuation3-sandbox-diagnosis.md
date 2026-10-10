# M7.5-A continuation3 sandbox 独立诊断

结论：实际策略遗漏/dev/null写权限，有直接失败记录且与多项spawn EPERM所需系统调用严格吻合；这是首要受控实验假设，尚未red/green验证，不能把76个EPERM或87失败全部归因为此，也不接受产品full通过。仅读精确ownedroot、仓库指定测试和固定官方libuv源码；未运行测试、子进程、ps或改策略。

## 实际证据与调用

实际policy.sb为allow default、deny file-write*、仅allow file-write* exact /private/tmp/detuned-m75-clean-gq6h90m6、deny file-read* /Users/sakimi；没有/dev/null例外。full backend stderr直接记录node_modules/.bin/vitest:36 `/dev/null: Operation not permitted`，实际shim36用command -v node >/dev/null 2>&1；41仍fallback exec node，所以suite运行并不否定这一设备拒绝。

两不同真实失败：tests/contracts/m7-claude-probe-ownership.test.ts:19 CP01外层launch为stdio ignore/ignore/ignore/ipc，rawJSON错误stack为该行spawn EPERM；其生成parent还在:12以相同ignore创建候选。tests/integration/m3-backup-recovery-independent.test.ts:12 start fork为ignore/ignore/pipe/ipc，rawJSON也在该行fork→spawn EPERM。两者都需为stdout ignore打开/dev/null写，路径不在唯一允许root。相同模式还出现在m7-codex-owned-group:19。

精确Node22.19.0解包include/node/uv/version.h静读UV1.51.0。官方[libuv v1.51 process.c](https://raw.githubusercontent.com/libuv/libuv/v1.51.0/src/unix/process.c) Darwin561–573在缺失stdio fd0–2时调用posix_spawn_file_actions_addopen：stdin/dev/null只读，stdout/stderr读写。forkfallback318–333同样打开该设备；因此ignore并非不打开fd。O_RDWR遭file-write拒绝可以产生spawn EPERM；pipe/继承fd不走此open分支。实际build/config阶段多pipe通过，与这个差异一致。

## 不能归并的失败

rawJSON仍有11 assertion failures与4pending；三个productionlauncher场景使用全pipe（Codexlauncher:18/39），但finally正absence/closed断言失败，CL02stderr只有TERMclose/all_owned_absent=false；其原业务错误可能被finally覆盖。/dev/null例外是否足够修这些不是已有事实。query helper使用execFile('/bin/ps',exactPID...)且通常pipe，当前policy没有显式deny process-info/exec；不能凭policy排除macOS sandbox的实际ps读取边界，也不能静态宣布ps已失败或需要扩大权限。

所选tests/contracts/integration/helper/Pi runtime没有直接sandbox-exec调用；导入Codex/Claude probe模块内确有sandbox-exec native/guard实现，但本158范围使用pure helper/productionlauncher而非nativehost入口。两已核失败栈在普通Node spawn/fork，不能解释为nested sandbox拒绝。Pi helper调用env -i再Node并缺TMPDIR/HOME也是不同边界：stdin ignore仅需/dev/nullread（默认已允许），后续临时目录可能落root外并遭写拒绝；当前无具体系统调用日志，不确诊该变体。不改tests原env/timeout来掩盖。

## 最小受控实验建议（仅建议，root决定/D唯一runtime）

同固定Node22、sameexactroot、sameenv与原policy，短寿命自有Node控制器先分别spawn固定无副作用exit0子进程：全pipe正控与ignore/ignore/ignore（必要IPC同测试）候选。记录spawn error枚举/实际close/PIDgroupabsence，有界几秒，零模型/HTTP/nativehost。只对候选改为原policy加精确literal/dev/null写例外，保deny其他外写与真实HOMEread，再执行同一ignore子进程；预期原policy EPERM、新policyexit0/null，任何不符保持失败。先核最窄file-write-data足够性，若root选择file-write*也只能literal/dev/null，不能开放/dev目录、撤整体deny或扩大用户HOME/配置读取。原policy/新policy/hash及redgreen先保存。

若这对通过，只证明stdioignore设备机制，不自动重跑158或宣称87闭合。后续root可选择单一实际失败test与其exactps/全pipe场景窄related验证；独立未解释的ps/环境/tmp或nested变体按真实失败继续，不预授权额外权限。失败/deadline/未知teardown保rootledger；外层stageabsence不充inner完整census。
