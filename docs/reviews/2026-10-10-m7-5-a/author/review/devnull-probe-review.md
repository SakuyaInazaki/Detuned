# M7.5-A devnull 最小诊断静审

通过有限诊断准备，最终runtime由root放行；未运行Nodecheck/red/green、未改D文件或策略。

实际plan/controller哈希吻合冻结，candidatepolicy只比original追加file-write-data literal/dev/null；不开放/dev、用户HOME或其它外写。原policy保持。fixedNode/env/私有root与sentinel/device绑定、30s总/3s语法/5s各redgreen、输出上界与外层自有stageproof/close/absence约束保持。

red controller只有收到spawn EPERM且无child.pid、privateWrite=true/sentinelDenied=true才exit0；其它spawn error、意外创建PID/成功或sentinel写成功均失败，未把任意失败当红通过。green要求真实childPID经exactps UID/directPPID/同stagePGID证明，code0/null且positivePIDabsence、私有写与sentinel拒绝才exit0。spawnSyncps全pipe有1s/4KiB界限，child仅300ms固定exit0；2s timer只对已proof自有child TERM，若proof失败不扩大signal，外层5s/30s实际stagegroup清退负责收口。close回调才输出，timer清除；记录仅固定安全字段。

Node--check必须对实际wx保存同controllerbytes先过并hash保持，再相同bytes执行。诊断结果仅证明/devnull机制和保持其它外写拒绝，不代表76EPERM/11assertions、内层未知资源或full158已解决；旧CL02 all_owned_absent=false边界如实保留，不清退整个fixture或blindkill。无安装/产品tests/Pi/model扩展。
