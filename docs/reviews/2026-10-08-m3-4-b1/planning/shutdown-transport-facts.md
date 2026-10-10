# M3.4-B.2 关闭传输事实（只读）

本文件不是已实现契约；B.1 产品保持冻结，无新测试/实验。父候选默认10秒、CLI参数1000..120000、超时/失败非零，具体实现待下一fresh冻结。

## 活动与接点

- server/routes/artifacts.ts 上传有 multipart 等待、stage、await core.create 与 finally discardStage；整个 handler 的 finally 完成才可 finish。现只有 request aborted→controller.abort/currentFile.destroy，尚无统一关闭注册。core.create 可能 publish 后进行 DB transaction，再 cleanup；关闭 socket 或中断 stage 不代表 core 清理已结束。
- 附件 metadata GET 也 await service.getMetadata→blobs.exists（异步 roots/lstat），因此异步 FS route 不只 upload/poll/export/download。content GET await blobs.open，然后 Readable.from(chunks) 承载 fd流；应登记从handler进入到流close，失败路径也finish，不只登记reply.send后的流。其 authorizeRead 先同步 DB，await后暂无新 DB写；仍需等待/关闭FS资源。
- events poll controller 与 finally 已可复用；目前 plugin preClose 同步abort activePolls、closing=true，无等待。其余 subscribe/ack/deactivate 同步业务，async wrapper不跨业务await。
- export 建立同步独立snapshot后custom Readable，pending setImmediate、destroy清scheduled/session；现plugin preClose destroy所有stream+service.closeAll，无等待。复用destroy/session.close；登记应覆盖open/firstline失败及流terminal，close后finish。
- 其他标准JSON routes虽async，但业务调用同步，无跨await DB/FS工作。不能把任意async关键字当有独立后台任务；multipart框架解析和未进入handler的连接还由Fastify/socket关闭处理。

## 单一协调建议

server新 RuntimeResources 对象由app组成根构造，closing flag、acquire(cancel)->幂等finish、beginClosing同步逐项cancel（单项throw隔离继续）、waitForIdle只等待全部finish。closing时acquire拒固定503；根preHandler也拒新业务，health例外由父定。不复制消费者/export业务框架。

app root唯一preClose先OperationsService.beginDraining、RuntimeResources.beginClosing同步全部cancel，再await waitForIdle。移除/改接plugin现独立preClose，不依赖plugin注册先后；必须先取消完所有族才进入任何await，否则较早wait会挡后续取消。CLI在app.close前同步beginClosing，避免FastifypreClose时点晚于信号；重复beginClosing/finish幂等。默认定时器仅CLI/协调deadline所有权，父未冻结前不实现。

CLI/index现shutdown内isShuttingDown防重复，但app/db/lock清理catch全部吞且exit0；signals在listen前注册，listen失败catch另一条清理路径，未remove自身signal listeners。应由一个serve-owned shutdown promise统一signal和listen-failure清退；正常先cancel/idle→app.close→db.close→strictlockrelease，再dispose请求writer。writer保持到请求终态完成后close自身listeners，不destroy共享stderr。固定退出诊断不带原error/SQL/path/token；deadline/阶段失败非零，未清完活动不得继续关DB/释放锁。进程强退如何处理仍由父定，不能将抛错后继续原cleanup说成有序成功。

## 实质风险

1. response close/abort不代表upload core.commit/discard完成；若以socketterminal作为整个handlerfinish会在活动FS/DB continuation存活时提前release锁。
2. download在await open前后及metadata exists也跨await，若只追踪stream会漏open中的FD/roots检查；需failure/finally与streamhandoff精确转移。
3. 多preClose顺序会使较早无限wait阻止后续abort；统一同步cancelAll先行。单项cancel throw须不挡剩余取消。
4. 同步SQLite/恶意synccallback不可被JSdeadline抢占；timeout只在事件循环恢复后观察，不能承诺硬CPU退出时限。stage iterator.return现detached cleanup无新DB写，但其迟到reject须观察，不能无限await阻塞关停。

建议ownership：A core/FS取消与strictlockrelease边界；B server/runtime-resources.ts、app/routes artifacts/events/export、CLI/index+小shutdown helper及相关protocol配置；C独立真实慢上传/poll/export/download/信号/超时门禁。B.1统计/日志语义保持，不加后台daemon或全目录quota。
