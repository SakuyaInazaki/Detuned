# M4.2 本地官方 MCP SDK 事实（路线待父裁定）

本轮复用先前本地官方包读取，仅补types版本常量；未联网/测试/启动宿主或桥进程/模型/安装，未重读本仓库bridge实现。

## 版本与来源

- packages/mcp/package.json声明@modelcontextprotocol/sdk ^1.6.0；已安装包package.json实际1.30.1。pnpm-lock.yaml:107–117实际1.30.1(zod@4.6.5)，:531–538锁SHA512 integrity及node>=18。不把manifest范围误写实际版本。
- 官方包README与package.json指向[官方仓库](https://github.com/modelcontextprotocol/typescript-sdk)；本报告结论以安装1.30.1 dist/esm官方实现与类型为准，上游源码commit/tag及滚动文档未核，不宣称未来版本同义。
- SDK dist/esm/types.js:2–4：LATEST_PROTOCOL_VERSION=2025-11-25，supported另含2025-06-18、2025-03-26、2024-11-05、2024-10-07。server/index.js:260–265接受列表内requestedVersion，否则回应latest；这是协商代码事实，不是各宿主认证证据。

## 结果与取消

- types.js:1289–1318 CallToolResultSchema：content为ContentBlock数组default[]，structuredContent可选JSON object；有outputSchema时注释要求structuredContent且匹配，无outputSchema仍需content，兼容字段始终存在可为空。isError可选，未设默认视成功；工具业务错误应result内isError=true，找工具/不支持调用等exception可协议错误。
- structuredContent不是任意顶层数组/primitive；共用clientpage对象可原样保data/meta，裸array需要明确包裹策略，SDK不替业务决定它的语义。SDK不自动限pretty text JSON摘要长度，不自动做Detuned敏感字段投影。
- shared/protocol.d.ts:173–177 RequestHandlerExtra.signal为AbortSignal；setRequestHandler可syncresult或Promise。protocol.js:315/319每请求创建controller并给extra.signal。
- protocol.js:169–175取消通知按requestId找controller.abort(reason)；:248–270 transport onclose取消全部inflight handler并清map/timeout，拒未决responsehandlers。:419–420 finally仅删除仍同controller的记录，避免close/reconnect复用requestID误删新记录。
- cancellation是合作信号，不撤销已提交数据库状态、不自动ACK；SDK不保证业务及时响应或undo，也不替HTTPclient处理晚到response/body释放。

## stdio/关闭边界

- server/stdio.js start():监听stdin data/error，无stdin end/close handler；EOF自身并不调用transport.close/onclose。需要组合层明示EOF路线，不能以stdin结束等同所有HTTP停止。
- server/stdio.js close():移data/error监听，只有无其他data监听才pause stdin，clear读buffer并onclose；不destroy共享stdin/stdout。send()按stdout.write返回或等drain，是写入/背压承诺，不是宿主消费确认；该层未给drain预算。
- shared/protocol.js:500 close()仅await transport.close；_onclose同步abort/清map，不await各业务handler finally settles。SDK closePromise不能单独证明Detuned fetch/body/业务cleanup已完成。
- SDK onclose(d.ts:249–251)包含显式close场景；handler发送路径捕获transport、Promise链catch向onerror，未自动建立Detuned活动任务wait/drain注册表或process退出预算。同步native操作同样不可由JS signal硬抢占。
- shared/stdio.js默认readbuffer4MiB（安装源码）；这是单stdio缓冲防护，非结果文本/HTTP/CPU/全进程RSS硬上限，也不是新的业务quota。

## 有限下一包验收候选

- 锁定SDK1.30.1，用真实stdio initialize/listtools确认协议与现8工具广告；startup/discovery零研究write/ACK是桥组合层责任，不能靠SDK能力声明证明。
- 检查成功structuredContent+有限text一致保data/meta，以及业务isError与协议error区别/安全诊断/stdout纯协议；结果上限/错误字面由父冻，不扩admin或本机上传工具。
- 用受控HTTP屏障真实cancel notification、stdinEOF、显式close、并行inflight：必须无自动ACK，观察HTTPabort和所有cleanup settled；SDKabort足够的部分与需要桥组合tracking的部分分开验。
- 有限独立进程重启/两个不同credential固定fixtures，证明不跨身份串用、stdout清洁、资源回收；凭据冲突、安全来源、capabilities/me/session行为由本仓库桥作者另报，不在此SDK事实自选实现。
- T10/T20只覆盖无模型、本机stdio和已锁SDK范围；真实dsh探测/HMR、Pi reload/fork/switch属于后包宿主版本实测，不能用此包假称四宿主或任意protocol/平台已认证。
