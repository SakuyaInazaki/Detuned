# B.2.2 protocol before

2026-10-06，父fresh baseline后批准执行。before.mjs使用已有dist与内存SQLite，凭据仅内存，无产品/正式tests/build变化。精确命令与exit0见before.command.json，首次即通过，stdout/stderr保留。

真实观测：新增GET threads/:id/posts 404；新forum_read thread_posts 400 VALIDATION_ERROR；CLI thread posts为unknown command thread/exit1。旧HTTP GET thread?limit=1仍200并返回一个Post metadata及meta，证明旧分页入口可用；此夹具仅一post，未将它声称跨页重组证据。旧tool/CLI首批data丢meta为本轮contracts中的源码事实，没有额外执行旧tool/CLI，不能把其算成before运行记录。三项新增缺口已足够实质观测，无重复大body对照。

不含Pi/dsh真实宿主、模型、独验或新实现成功。停写等父实施放行。


## 实施交付（待独验）

父统一放行后已完成threads.ts共享DTO/schema/query/cursor/envelope helper，tools新thread_posts分支仍8工具，OpenAPI同path新增GET保POST，server app/threads服务接线与实际req.id共享serializer，client.getThreadPosts及工具完整page，CLI thread posts整page与严格数字、docs04及新example。元数据schema保现字段，Thread标题读取不带新写长度约束；不引用正文。旧getThread/HTTP裸id cursor/工具thread/CLIread输出、旧正式tests、adapter、SQL/Port/DDL不改。精确源码/新tests/规范sha256见freeze-manifest.json。

实际命令与stdout/stderr、exit保存在各command.json及日志：
- contracts-first：新增6项首跑3pass/3fail，保留首次。D01/D04因本地Value.Check未知date-time format而false，不是core分页失败；新test以局部FormatRegistry实际ISO前缀+Date.parse检查并恢复旧注册，不能称完整RFC格式认证。D06比较遇TypeBox内部symbols，OpenAPI显式采用现plain integer参数政策，不删除断言。
- types-first：exit2仅新test的generateOpenApiSpec未知类型与callback implicit any；补新测试Operation静态类型，没有dist/build问题。
- contracts-second：6/6 exit0；types-second exit0。
- 新增D07实际HTTP目录head→固定旧正文衔接后，contracts-final：7/7，1文件，exit0；types-final：sourcealias noEmit含CLI exit0。未更改或运行旧formal，无全suite/build。

D01 raw4K/64K/default完整compact外层JSON、真实转义request_id与静止目录全ID完整无重漏；D02 limit-only false/cursor及旧裸cursor对照；D03严格未知/重复/范围与真实req.id4096边界/+1→422；D04三page分支/strictpurpose/无新写标题长度；D05 app.inject-backed fetch的client完整page/query/Signal即刻取消、新kind与旧threaddata输出；D06 GET/POST及OpenAPIcursor政策；D07目录current_revision→旧fixedstored正文/head更新无聚合。client测试使用fetch桥接inject，不能称真实socket SDK；Pi/MCP/CLI实际运行交独验统一build后。真实CLI仅before缺入口子进程，不能称新入口已跑。

本单元冻结后不跑产品tests/build，核心交叉审查仅代码阅读另记planning/core-cross-review.md。未验收四真实宿主/模型、Node22/干净安装/远程CI/100k；三遗失原历史HTTPfixture仍not_run，旧证据不补造。成功cap不含headers/error/toolwrapper，动态目录不固定全集或保证并发较小新增id，本包非全文聚合/focus/M2/T06完成。无commit/push/安装/global修改/清理。


## 父批准修复 v2：HTTP 字符串cursor次序

核心交叉审查发现新HTTProute先拒空/空白/超长字符串cursor，违背当前身份→space→thread归属→query/cursor冻结顺序。父暂停独验dependent后批准先新增正式D08反例；repair-d08-red命令实际app.inject新route，exit1，**一个D08测试出现11条差异，不是11个正式测试**：正确目标空/空白400提示不是固定文字（2条），非member/跨space/不存在thread的三类cursor先400而应404（9条）。重复cursor数组shape与unknown query400对照已通过。红stdout/stderr/command保存，原freeze-manifest/全部首独验与旧日志不覆盖。

仅新routes/threads.ts把parseStringQuery(cursor)改为allowEmpty:true并移除字符串长度前置；数组/非字符串的parseStringQuery分支不变，未知/重复query仍transport400。纯threads.ts validator已在core授权/归属后对空/空白/>4096字符串返回固定THREAD_POSTS_CURSOR_ERROR_MESSAGE，无需改validator/core/旧route。D08另补有效token但无read capability的403对照，首次green同时通过；不是伪称该新增403分支也有红运行证据。

repair-contracts-green：新文件8/8、1文件exit0；repair-types-green：sourcealias noEmit含CLI exit0。D08三类字符串正确目标固定400、非member404、无read capability403、跨space/不存在thread404；重复数组shape/unknown仍400。精确命令与真实stdout/stderr保留。git diff --check仅两个修复文件exit0，没有build/fullsuite/旧formal/core修改。

freeze-manifest-v2.json对原同10个产品/tests/规范路径重新SHA256，程序确认只有routes/threads.ts与新增contracts文件两项不同，其余8项相同；原manifest原字节保持。当前正式新contracts计8，v1的7/7是原阶段证据。v2冻结停写，独立新版构建/新功能检查由父重新授权，不宣称独验已恢复/完成。
