# M7.4-A：有限Pi检查接入与可选Claude边界

2026-10-10 root已接受本机固定Pi 0.87.1公共SDK/真实HTTP有限功能及本轮安全修复静审边界。现九工具内check两普通写/六读取、角色/scope/私有材料、prepare前500/501码点拒绝、取消/noACK及真实pipe失败独验通过。完整Pi CLI/profile/RPC/模型及四宿主认证未完成；schema6不变，前端已取消。本文metadata末核与封存尚待完成。

唯一完整核心967/967、155/155，新3含内，build即时dist555；首focused28/29、诊断编译失败、v5清退失败均保留，v7相关单例1pass（旧6skipped）。不是v13后重新full或首轮全绿。原六场景字节/预算保持，v13安全delta静态复用未变产品/Pi/core边界；current28/29复用B2。详见[独验报告](verification/independent-report-v2.md)、[核心gate](verification/gate-summary.json)、[后续gate](verification/gate-summary-v2.json)。

Claude独立guard首次sentinel失败、第二次有限通过；normal第一次exit1且无足够stage定位，不能推断initialize/catalogue成功。后续两次v11 reject早期EPERM未到注入点，原件保留。v13最终诊断实际root_registered/worker_spawned后EPERM，未worker_registered/bootstrap/native/MCP；source initializer settled、worker实际close/root移除，D driver close1/null及登记directPID/root/control absence。source worker_group_closed=false保留：没有confirmed组，不以空集合证明完整组认证或全局清退。hold/signal/normal retry未跑，Claude新checks native未认证；[最终事实](verification/optional-native-v13-final-facts.json)、[producer](verification/reject-v13-diagnostic3.json)、[capture](verification/reject-v13-diagnostic3.json.capture.json)是实际范围。v11未预登记资源亦无全局证明。

安全source最终v13：父自有root登记→正PID candidate登记→UID/PGID核后confirmed组→可信registry完成才bootstrap；invalid PID不反号，所有signal目标>1。取消terminal/initializer有限settle，原错优先；未证close/组absence为false/failed。工作50s、总60s含finally、紧急65s，D外70+5s；受控环境失败不自动否定算法路线。静审见[最终readiness](author/review/final-readiness-v13.md)，原发现与修复链均保留。probe未发送prompt/model请求，静态model_calls0不测量宿主内部行为。

其他宿主不升级：dsh保M4.3官方plugin有限链；Codex保M4.5-A保护阻塞和固定源码隔离规划。旧Linux/部署证据不充当新schema6跨平台认证，最低Node22与本机Node26证据区分；M8研究收益另评。

下一步按A→B→C：先[M7.4-B本地交付任务](planning/m7-4b-task.md)与[owner候选](planning/m7-4b-owner-candidates.json)，B不依赖optional Claude成功，只需安全修复与证据界限固定；本包末核/封存、新fresh与root dispatch后才写入。之后可选Codex：[隔离事实](planning/m7-4c-codex-isolation-facts.md)、[固定control事实](planning/m7-4c-control-facts.md)，不是已实施成功。
