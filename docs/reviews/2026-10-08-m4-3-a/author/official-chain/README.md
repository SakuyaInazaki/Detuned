# A 官方链作者证据

固定官方源码 HEAD 5badb15009ae1756c3afe0ae0cef1faafc290ccc；Vitest 4.1.8。入口为 scripts/integrations/dsh-runtime/launch.mjs，显式 --source /private/tmp/detuned-m43-runtime.MU1a4q --repo /Users/sakimi/Desktop/Detuned。独立配置仅 include .detuned-m43/runtime.spec.ts，复用固定官方 vitest.shared.ts decorator/execArgv、tsconfig.base 路径；不执行 root setup、CLI、profile、model/provider、native build。MCP SDK/registry/transport均真实实现，无 mock。

时间顺序：discovery-first 实际exit1，1失败2skip，私有loopback listen被sandbox EPERM拒，未到官方plugin；保原日志。discovery-second 使用已授权loopback escalation，实际exit0，1pass2skip。remaining-first 实际exit0，2pass1skip；随后仅加强 root fiber 清退及精确ACK/错误断言。final-author 实际exit0，3pass，runner总2.56s。各.exit-code为对应工具直接返回码，不把首次环境失败抹去。

最终三个场景：
1. 官方 Cordis→SystemPrompt→native ToolRuntime→createScope minter→scope.ctx.plugin(MCP namespace) 实际八names；probe/init/discovery HTTP/session/post/batch增量0。
2. 同serverName两个scope使用不同受限actor/token-file；真实registry context/publish，相同key重放各actor单post，未知space保持NOT_FOUND错误。
3. 官方poll通过真实服务waitScheduler sleep进入等待屏障后取消，消费者ack_seq/active_batch_id与ACK请求次数精确不变；随后真实写+poll建非空pending batch，dispose后原批次仍pending。未把空长poll称作非空pending。

scope.dispose和ctx.fiber.dispose均await；所有scope记录probe/serving PID启动/exit，再kill(pid,0)确认不存在。final stdout仅8个PID/exit布尔，无token、工具正文、原始请求。私有token文件0600，fixture SQLite/HTTP/目录finally清退；源/deps保留供C。source-protection全14208tracked及lock未变。launcher三分钟watchdog只清自有runner组，正常退出清两个timer；不启动模型，不自动下载/安装。

此证据只验证 official plugin+registry，不宣称完整dsh CLI、真实HMR或模型认证。session仅桥诊断关联，不宣称逐帖session_id。未运行主仓build/fullsuite/current29；C独验与父验收另行给出。freeze-manifest四文件已停写。
