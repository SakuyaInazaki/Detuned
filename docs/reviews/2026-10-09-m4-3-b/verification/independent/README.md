# M4.3-B 独立异常验收

PASS。首run实际exit0、1/1pass、5.66s，无失败或重跑。冻结作者Loader/Hmr启动清退样板复制入独立spec，未import作者spec注册其case；同官方SHA、受限built原package name、真实Loader.internal/Hmr/Include/loadOverlayPatches/MCP/registry/HTTP/SQLite，没有mock。

已有A实际publish且DB作者A后，await真实Hmr.watchConfig ready及初次refresh完成。真实写坏YAML `- insert: [`，官方loadOverlayPatches抛Error，错误callback完成屏障后核posts/events/idempotency_records/sessions精确不变、所有HTTP请求增量0、ACK0、PID日志逐行不变、八工具exact集合不变。实际registry context继续成功，业务与session仍无增量。此观察说明解析阶段失败保留前一有效A配置，不承诺任意重装失败事务回滚。

随后真实写回有效B配置，经filewatch callback中的rootEntry.update/loader.await完成屏障，旧2PID退出、仍精确8工具。registry publish成功，DB仅有初始A和恢复B两帖，两个session分别正确A/B且同space，无身份混合，ACK0。成功refresh2次、失败解析1次。屏障是官方watch真实回调，未手emit或sleep猜事件。

finally独立尝试watch disposer（await close+drain）、root-owned Include remove/loader drain、scope/root dispose及HTTP/SQLite/files清退。四个probe/serving PID均exit记录并kill(pid,0)确认不存在；watch-stop返回，cleanup_failures为空，runner自然exit0（signal null），watchdog未触发。没有公开watcher枚举API，因此以disposer完成和自然runner退出报告可观察清理，不虚报内部watcher计数。

命令见run.mjs与receipt.json：outer `/usr/bin/env -i`仅PATH；child显式PATH/CI/DETUNED_EXPERIMENT_SUITE/REPO/SOURCE allowlist，无继承用户NODE_OPTIONS/CORDIS_SHARED/token/proxy、无HOME/CODEX_HOME设置、无真实用户配置/凭据读取。私有bridge PID observer的NODE_OPTIONS仅固定preload。stdout/stderr/工具实际exit及machine receipt保存在此目录，stdout含完整8names、行为receipt和四PID。

只写此独验目录与owned临时spec/config/生成脚本，未修改A冻结三文件、官方tracked/lock、产品、旧审查证据。没有安装、build、真实模型、外部账户、push/deploy或global config。未跑作者case、旧core套件或完整CLI/模块代码HMR；官方源码及built/deps保留。下一步父验收；现已停写。
