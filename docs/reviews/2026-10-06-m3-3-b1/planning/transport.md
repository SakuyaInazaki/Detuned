# M3.3-B.1 传输单元 B：短规划（未实施）

2026-10-06，承接M3.3-A父接受393/45/current29。读取最新AGENTS/README/progress/reviews、前包任务书与facts、docs04/07；docs00/08/11实施规则沿既有阅读核对。未产品改动/build/实验/安装/模型调用，旧证据保持。

## 实际复用点

安装Node26.3.0、Fastify5.12.5。现artifact下载route使用reply.send(Readable.from(chunks))，Fastify本机docs/Reference/Reply.md Streams说明该payload已序列化、不做response validation；安装lib/reply.js sendStream在headersSent后错误destroy response。现event route已有reply.raw close→Abort与app.onClose生命周期模式。新route可同方式，不需要依赖。

共用client request是JSON信封生命周期：timeout覆盖fetch headers及res.json，finally清timer/listener，错误分HTTP/transport/protocol/userabort/timeout并有重试。NDJSON不能接res.json或旧retry循环后拼partial；需独立逐字节方法。基础client当前无Node FS/crypto依赖。

protocol TypeBox/index.ts/openapi.ts是现单源，OpenAPI已有artifact binary独立content可参考。current29=build/typecheck/lint/fullsuite+25历史probe；旧probe原字节保护，不硬改历史目录。新增路由需同步当前OpenAPI/query policy及新正式contract，若旧probe有硬编码route计数，由父决定新版本化probe，不改原文件。

## 可行候选与父需冻结项

GET `/spaces/:id/export?format=ndjson`，首包只附件manifest，无附件options；初次core授权/打开来源/首行准备完成才reply.send，Content-Type application/x-ndjson; charset=utf-8，private,no-store与nosniff。query unknown/重复值严格拒。初次JSON错误由现error handler；发流后core/传输失败throw→destroy，不再拼JSON或成功尾行。

建议v1 header→seq record→end三个schema，记录业务白名单来自A/core统一服务，不在client复制ACL。header含format/version/source space/source语义与snapshot边界；end含complete:true、record_count、总body bytes/链摘要。每行LF结尾、固定UTF8，禁止额外/空行或截断尾行；end后还必须读到EOF才完成。seq必须连续，未见end的任何EOF/中断拒绝。

hash候选：为避免基础client引Node crypto或缓存整个流，可用浏览器/Node全局crypto.subtle逐行SHA256链：seed与拼接方式父冻结，链输入prevDigest+exactUTF8 header/record line（含LF），end记录最终链值且自身不入链；逐line处理，仅保留一条有界line。server可同算法或Node createHash。限额必须父冻结：最大line/总bytes/record count/active exports/maxduration；过限不发送成功end。不是客户端业务hash或权限判断。

client候选 `exportSpace(spaceId,{sink,signal}):Promise<ExportComplete>`：sink逐块/行await构成背压，其数据为provisional，只有严格schema/首尾/seq/count/bytes/hash+EOF校验成功才resolve。TextDecoder fatal streaming避免UTF8割裂/非法byte，byte计数以wire UTF8为准，限制未换行buffer。token header及Abort/timeout沿现类型；timer涵盖headers+body+sink等待，finally abort/cancel reader并清listener。最窄不自动retry该新方法（明确调用者整次重来），不改变现JSON request retry契约，绝不跨partial重试。若任意sink Promise不响应取消，需race并观察pending，避免用户Abort被背压无限卡住。

CLI `export --space ID --output NEW_FILE`，required/unknown沿Commander；私有same-parent随机temp O_EXCL0600写盘，sink完整await；成功EOF后file fsync、close、hardlink(tmp,final)无覆盖、dirsync完成再摘要stdout，不输出巨流。失败/取消只删除自有temp，已有final不覆盖/不删；link后dirsync失败保留完整final并准确诊断durability未确认，不把它称partial或success。SIGINT/SIGTERM进Abort，finally关闭FD/监听并清自有temp，不更改全局配置。output parent须存在且信任同OS用户；本机metadata/正文导出仍可包含用户可见研究文本。ACL/撤权/脱敏每yield或分页边界全部由A负责。

来源候选比较：整文件NDJSON+结束证明最适合CLI原子输出，取消后重新完整导出；分页需要可恢复snapshot/session与跨页来源/权限/失效语义，扩scope较大。同步主连接readSnapshot不得跨await；A需父冻结独立读快照或有界同步材料等来源策略，B不自行选SQL/事务路线。

## 最小所有权候选与验收

packages/protocol/src/export.ts/index.ts/openapi.ts/request-policies.ts；server新routes/export.ts及app组合根；client/src/client.ts（可拆独立解析模块）、CLI/src/index.ts；新contracts/m3-space-export-contract.test.ts、docs04与examples/space-export.md。A拥有core/storage来源业务；旧tests/schema/历史fixtures不改。准确路径与schema由父冻结。

验收候选：真HTTP/client/built CLI全链、错误前JSON/后中断无完成文件、缺尾/重复序号/非法UTF8/坏hash/额外行拒绝、单line/总bytes界限、slow sink背压/取消/timeout与资源清理、无partial retry、原目标不覆盖、写盘失败与publish后dirsync区分。真正ACL/脱敏/空间归属/旧修订保真由A/C验，B只传输schema。本规划不预填通过。
