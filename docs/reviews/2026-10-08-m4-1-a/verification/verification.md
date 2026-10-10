# M4.1-A 独立验收

状态：父已于2026-10-08接受下述有限本机范围。限定读取/身份/能力/健康/管理员诊断 CLI、列表与知识视图接线、显式 search 分页，以及两薄 health client wrapper。服务端权限/过滤/游标业务、客户端重试/取消/token-file fallback保持既有规则；不扩成全部CLI或四宿主验收。

最终 fullsuite **525/525项、69/69文件**，新正式8项（B4+C4）已包含总数，A无镜像新测试。唯一workspace build/typecheck/lint/fullsuite全部exit0，25兼容探针全部exit0；current29组合为四门禁+24原保留探针+第11项A.1已批准适配，29/29。原第11未重跑，历史默认高量seed失败记录保持。`pnpm test`和`test:all`实际都运行`vitest run`。[真实命令与时间戳](commands.json)、[机器结果](final-results.json)可复核；skip不计成功。

## 原始失败与冻结窗口

首新2file **4/8**。B三built case全在CLI命令前的fixture createSpace500：固定Clock只实现now，遗漏现mandatory nowIso；C知识view收到成功HTTP data数组，却错误断言core内部view/items包装。两者属于新测试夹具/期待错误，不是本包CLI功能失败。父授权B补now/nowIso同fixed instant并`satisfies ClockPort`、保全部built断言；C改为实际wire数组+非空预期post引用+原HTTP data对照，保三view/localenum0HTTP/healthabort全部覆盖。必要B fixture noEmit首次exit2另暴露Fastify装饰operationsService静态类型缺口，仅父批准交叉OperationsService类型后exit0；原编译日志保留，不冒充产品运行故障。

四原失败case定向实际4pass/4skip，随后最终fullsuite整体绿；没有产品改动、第二build或复跑未改专项。[首归因](first-targeted-classification.json)、[修后冻结](corrected-fixture-freeze.json)和两个原输出不可覆盖。最终gate窗口从修后stable-before-final-gates捕获，不能写全程首次绿。C gate前匿名header先要求确实观察2条，再every(false)，避免空数组误过。

## 真实独验四项

1. 独立真实服务进程和每次新builtCLI进程，admin/ordinary两身份、两个隔离空间。admin space分页连读两空间，ordinary只见授权一空间；另一空间thread list按原隐藏契约404/NOT_FOUND exit1。thread open/archived过滤、limit1目录连读与revision[1,2,3]全部页；me身份和capabilities对照HTTP。旧read post仍data，固定post read和thread posts仍整data/meta；没有覆盖旧格式或复制权限。
2. 三研究命中、limit1：旧search输出数组，新--page与--cursor输出完整data/meta保next_cursor，连续三页无重复且终止。--thread过滤两命中，改query复用原cursor由服务端VALIDATION_ERROR exit2；CLI不decode/sign。四非法limit × 四受影响命令共16次均本地exit2、固定不回显、服务端计数增量0。测试小固定材料，不声明列表跨并发变化有新snapshot保证；legacy列表也不泛称都签名。
3. 完全无凭据CLI health live/ready成功，实际2条健康请求都无Authorization。me匿名401 exit3；ordinary diagnostics403 exit3；admin诊断data readytrue且无fixture路径/token。仅私有fixture目录rename和schema marker999控制ready，503/SERVICE_NOT_READY/details readyfalse exit1，live仍200，恢复后ready200；撤销普通凭据后me401。明确关闭HTTP后连接错误非零，不伪healthy。保持客户端原重试/预算，未造新匿名框架或假身份。
4. 合法claim/failure/question通过真实HTTP创建，三个view均非空实际data数组、包含预期post引用、与原HTTP data完全一致，无伪meta或core包装。非法state/view本地exit2且0HTTP；两个health wrapper显式preabort均UserAbortError、0HTTP。只验证薄接口转发一致性，不复制已通过客户端完整框架或B2停机。

## 保护、清退与限制

[完整性](integrity.json)：HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44原值，4491旧review（完整B2）、4SQL/archive、2schema、5mutable均原哈希；A3/B6freeze均匹配。232source/config/test仅授权owner delta，当前46docs（含新guide/ADR044授权），dist208tracked+164untracked是本轮真实build产物。修后最终gate到capture源/docs/dist无新增变化。owned worker、project CLI候选PID和私有fixture目录0残留，无广泛kill；94份新包有限文本known-token pattern无命中，不泛称所有内容敏感清退。

C每个CLI显式私有loopback --url与--json、环境仅PATH及私有测试token，未继承生产token/file/baseURL；UTF8 stdio，15s子进程deadline与1048576 UTF16 code-unit输出上限（不是精确UTF8字节cap）。case90s含runner/多子进程启动，不挤进业务超时。成功凭据只内存，不归档完整credential结果。作者source B1pass/3built skip由本轮真实built闭合；A source noEmit一次0，无镜像test。开发失败与必要类型修正仍按原作者次数记。

fullsuite继承既有40MiB导出一次：640行、正文41943040bytes、wire42399852bytes；receiver71/server13heap采样仅佐证，不证明硬RSS。未运行额外大材料、600s、模型/外部推理、四真实宿主或多平台。全局Commander parser/action错误格式、--token-file新flag、身份管理、附件完整CLI尚未由本包实现。后续按父路线冻结，不能把M4整体标完成。
