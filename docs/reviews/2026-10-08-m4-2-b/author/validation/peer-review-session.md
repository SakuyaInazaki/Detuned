# B → A 惰性session只读互审

2026-10-08。以A `author/session/freeze-manifest.json` 的五文件定版为审查对象：bridge SHA55552467…、index SHA7ecf9157…、session-binding SHAecd5b379…、正式test SHAb7f4d853…与frozen-contract。在manifest落盘后阅读对应源码/五组断言；未运行测试、build、命令检查或修改冻结文件。

结论：冻结范围内未发现新增可达阻断。以下为独立代码阅读依据，不用作者5/5日志替代审查，也不认证任意不合作的底层对象已clean。

| 重点 | 实际路径与结论 |
| --- | --- |
| 预校验与惰性 | bridge.ts:79–81先完整验证，invalid返回固定错误，早于任何binding调用；32仅构造binding，90才prepare。init/listTools未调用prepare。原factory无binding仍走原callTool，main显式同一client binding。 |
| 实际flight登记 | session-binding.ts:28–35在microtask run之前登记pending、controller；32只在run的真实finally之后置settled/remove pending/失败回调，不因某waiter结束误称底层完成。promise拒绝观察34避免detached unhandled。 |
| waiter取消与aborted复用 | 37–51：join入口拒已abort的自身或flight，计数/listener幂等finish；只有最后waiter且flight未settled才abort共享controller。promise晚成功再次核closing和两signal，不能让已取消的flight成功交付。全局失败清identity仅在32finally调用63；此前新显式call只能join已abortflight并拒绝，不能重启或取得成功。 |
| global身份与空间授权 | 54–65 capabilities API版本核验→Me schema；prepare68每个space依真实createSession，不把visible_spaces当白名单。74调用observer服务入口，75–76 Session schema与actor/space匹配后才完成prepare，业务服务仍独立授权。固定runtime凭据/URL不从args取身份。 |
| terminal创建失败 | per-space map69–79，73在调用createSession前置startedSession；失败回调78仅未开始者可删。已开始后失败/取消缓存同space，后续不二次HTTP；其他space独立key，不被该失败锁死。response晚成功74后的check拒取消，未知提交状态不宣称rollback。 |
| close覆盖独立pending | binding.beginClosing83–87同步abort global/每space；waitForIdle88等待pending真实finally。bridge.close100–110先beginClosing/abortcall，再server.close、calls、binding.waitForIdle、sends，统一104deadline。waiter已结束但底层finally还挂仍由pending覆盖；只关闭SDK不提前确认clean。 |
| 晚成功无业务 | prepare81和bridge91都复核取消/closing，callTool仅92；关闭或最后waiter取消后的晚session响应不能调度论坛业务。重复close仍99同一Promise，不重置budget或重发session/ACK。 |

五formal源码分别覆盖lazy discovery/invalid零请求与同/跨space复用、单waiter取消/全局真实cleanup后新call、session取消/响应丢失terminal与late成功、caps/Session actor-space错配fail closed、global/sessionfinally及非合作deadline。第一组me.visible_spaces为空仍能靠createSession真实门禁完成，避免以截断目录误拒空间。这里不重复运行；C真实HTTP/SDK独验另见verification。

限制：Session只是runtime诊断关联，无session_id注入或逐帖审计。global成功身份可runtime缓存，不是绕过服务当前认证；权限变化仍由业务/新空间session入口裁决。close超预算是未确认失败而非资源clean；同步native不能被JS抢占。未扩大任意URL/token动态替换、session查询恢复、四真实宿主或模型范围。
